/**
 * Activity Log Model — Postgres-based activity logging with async batching
 *
 * Instead of writing every entry synchronously to Postgres, entries are
 * buffered in memory and flushed in batches every 5 seconds (or 100 entries).
 * This keeps the hot path fast and reduces write contention.
 *
 * Public API unchanged: ActivityLog.log(data), .logSessionCreate(...), etc.
 * All are synchronous (the buffer is flushed async).
 */

const db = require('../db/query');
const { log } = require('../utils/logger');

const BATCH_INTERVAL_MS = 5000;     // Flush every 5 seconds
const BATCH_MAX_SIZE = 100;          // Or flush when buffer hits 100 entries

let buffer = [];
let flushTimer = null;
let isShuttingDown = false;

/**
 * Flush buffered entries to Postgres in a single transaction
 */
async function flush() {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0, BATCH_MAX_SIZE);

  try {
    await db.transaction(async (tDb) => {
      for (const entry of batch) {
        await tDb.run(`
          INSERT INTO activity_logs (
            user_email, action, resource, resource_id, details, ip, user_agent, success, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [
          entry.userEmail || null,
          entry.action,
          entry.resource || null,
          entry.resourceId || null,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.ip || null,
          entry.userAgent || null,
          entry.success !== false ? 1 : 0
        ]);
      }
    });

    if (batch.length > 1) {
      log(`[ActivityLog] Flushed ${batch.length} entries`, 'SYSTEM', { count: batch.length }, 'DEBUG');
    }
  } catch (err) {
    log(`[ActivityLog] Flush error: ${err.message}`, 'SYSTEM', { event: 'activity-log-flush-error' }, 'ERROR');
    // Re-queue entries that failed to write (to avoid data loss)
    buffer.unshift(...batch);
  }
}

/**
 * Start the periodic flush timer
 */
function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (!isShuttingDown) flush();
  }, BATCH_INTERVAL_MS);
  // Unref so it doesn't keep the process alive
  if (flushTimer.unref) flushTimer.unref();
}

/**
 * Force-flush all remaining entries (call on shutdown)
 */
async function flushAll() {
  isShuttingDown = true;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  while (buffer.length > 0) {
    await flush();
  }
}

class ActivityLog {
  /**
   * Log an activity (buffered — does NOT write to DB immediately)
   * @param {object} data - Activity data
   * @returns {object} { id: null } — ID is assigned at flush time
   */
  static log(data) {
    buffer.push({
      userEmail: data.userEmail,
      action: data.action,
      resource: data.resource || null,
      resourceId: data.resourceId || null,
      details: data.details,
      ip: data.ip || null,
      userAgent: data.userAgent || null,
      success: data.success !== false,
    });

    // Auto-flush if buffer is large enough
    if (buffer.length >= BATCH_MAX_SIZE) {
      flush();
    }

    // Start timer on first entry
    if (!flushTimer) {
      startFlushTimer();
    }

    return { id: null }; // Callers don't use the ID
  }

  /**
   * Get activities with optional filters
   */
  static async getAll(options = {}) {
    const { userEmail, action, resource, startDate, endDate, limit = 100, offset = 0 } = options;

    let sql = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (userEmail) {
      sql += ` AND user_email = $${paramIndex++}`;
      params.push(userEmail);
    }

    if (action) {
      sql += ` AND action = $${paramIndex++}`;
      params.push(action);
    }

    if (resource) {
      sql += ` AND resource = $${paramIndex++}`;
      params.push(resource);
    }

    if (startDate) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit);
    params.push(offset);

    const rows = await db.all(sql, params);
    return rows.map(row => ({
      ...row,
      timestamp: row.created_at,
      status: row.success === 1 ? 'success' : 'failure',
      details: row.details ? JSON.parse(row.details) : null
    }));
  }

  /**
   * Get all logs with pagination
   */
  static async getLogs(limit = 100, offset = 0) {
    return this.getAll({ limit, offset });
  }

  /**
   * Get user specific logs with pagination
   */
  static async getUserLogs(userEmail, limit = 100, offset = 0) {
    return this.getAll({ userEmail, limit, offset });
  }

  /**
   * Get activity summary for dashboard
   * Optimized to combine multiple count queries into a single roundtrip.
   */
  static async getSummary(userEmail = null, days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - (parseInt(days) || 7));
    const dateLimit = date.toISOString().replace('T', ' ').split('.')[0];

    let sqlBase = 'FROM activity_logs WHERE created_at >= $1';
    const params = [dateLimit];
    let paramIndex = 2;
    if (userEmail) {
      sqlBase += ` AND user_email = $${paramIndex++}`;
      params.push(userEmail);
    }

    try {
      // Use conditional aggregation to get total and success counts in one go
      // Note: FILTER (WHERE ...) is standard Postgres but we use CASE for cross-DB compatibility if needed.
      // Since the app uses better-sqlite3 (SQLite) and pg (Postgres), we use CASE.
      const counts = await db.get(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN success = 1 THEN 1 END) as success
        ${sqlBase}
      `, params);

      const totalActivities = counts ? Number(counts.total) : 0;
      const successCount = counts ? Number(counts.success) : 0;

      // Parallelize remaining aggregate queries
      const [actionRows, userRows] = await Promise.all([
        db.all(`SELECT action, COUNT(*) as count ${sqlBase} GROUP BY action`, params),
        db.all(`SELECT user_email, COUNT(*) as count ${sqlBase} GROUP BY user_email`, params)
      ]);

      const byAction = actionRows.reduce((acc, row) => {
        let key = row.action.toLowerCase();
        if (key.includes('message_send') || key.includes('campaign_message')) {
          acc['send_message'] = (acc['send_message'] || 0) + Number(row.count);
        }
        if (key.includes('session_create') || key === 'create') {
          acc['create'] = (acc['create'] || 0) + Number(row.count);
        }
        acc[key] = (acc[key] || 0) + Number(row.count);
        return acc;
      }, {});

      const byUser = userRows.reduce((acc, row) => {
        acc[row.user_email || 'anonymous'] = Number(row.count);
        return acc;
      }, {});

      const successRate = totalActivities > 0 ? Math.round((successCount / totalActivities) * 100) : 100;

      log(`[ActivityLog] Résumé généré: ${totalActivities} activités, ${successRate}% succès`, 'SYSTEM',
        { totalActivities, successRate }, 'DEBUG');

      return {
        totalActivities,
        byAction,
        byUser,
        successRate,
        period: { days: parseInt(days) || 7, since: dateLimit }
      };
    } catch (err) {
      log(`[ActivityLog] Erreur lors de la génération du résumé: ${err.message}`, 'SYSTEM',
        { event: 'summary-error', error: err.message }, 'ERROR');
      return { totalActivities: 0, byAction: {}, byUser: {}, successRate: 100, period: { days: parseInt(days) || 7, since: dateLimit } };
    }
  }

  /**
   * Get time-series analytics for dashboard (O(1) database complexity)
   * Groups by date in SQL to provide efficient daily message counts.
   */
  static async getAnalytics(userEmail = null, days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - (parseInt(days) || 7));
    const dateLimit = date.toISOString().replace('T', ' ').split('.')[0];

    // date(created_at) works in both SQLite and Postgres
    let sql = `
      SELECT date(created_at) as date, COUNT(*) as count
      FROM activity_logs
      WHERE created_at >= $1
      AND (action = 'MESSAGE_SEND' OR action LIKE 'AI_%' OR action = 'CAMPAIGN_MESSAGE_SENT')
    `;
    const params = [dateLimit];

    if (userEmail) {
      sql += ' AND user_email = $2';
      params.push(userEmail);
    }

    sql += ' GROUP BY date(created_at) ORDER BY date ASC';

    try {
      const rows = await db.all(sql, params);
      return rows.map(row => ({
        date: row.date,
        messages: Number(row.count)
      }));
    } catch (err) {
      log(`[ActivityLog] Analytics error: ${err.message}`, 'SYSTEM', { error: err.message }, 'ERROR');
      return [];
    }
  }

  // ── Helper methods (delegate to log) ────────────────────────

  static logSessionCreate(userEmail, sessionId, ip, userAgent) {
    return this.log({
      userEmail,
      action: 'SESSION_CREATE',
      resource: 'session',
      resourceId: sessionId,
      ip,
      userAgent
    });
  }

  static logSessionDelete(userEmail, sessionId, ip, userAgent) {
    return this.log({
      userEmail,
      action: 'SESSION_DELETE',
      resource: 'session',
      resourceId: sessionId,
      ip,
      userAgent
    });
  }

  static logMessageSend(userEmail, sessionId, recipient, messageType, ip, userAgent) {
    return this.log({
      userEmail,
      action: 'MESSAGE_SEND',
      resource: 'message',
      resourceId: sessionId,
      details: { recipient, messageType },
      ip,
      userAgent
    });
  }

  static logCampaign(userEmail, action, campaignId, details = null) {
    return this.log({
      userEmail,
      action,
      resource: 'campaign',
      resourceId: campaignId,
      details
    });
  }

  static logCreditChange(userEmail, amount, balance, reason, details = null) {
    return this.log({
      userEmail,
      action: amount > 0 ? 'CREDIT_ADD' : 'CREDIT_DEDUCT',
      resource: 'credit',
      details: { amount, balance, reason, ...(details || {}) }
    });
  }

  static logAIAction(userEmail, sessionId, action, details = null) {
    return this.log({
      userEmail,
      action: `AI_${action}`,
      resource: 'ai',
      resourceId: sessionId,
      details
    });
  }

  static logModerationAction(sessionId, action, details = null) {
    return this.log({
      action: `MODERATION_${action}`,
      resource: 'moderation',
      resourceId: sessionId,
      details
    });
  }
}

// Export the flush function so index.js can call it on shutdown
ActivityLog.flushAll = flushAll;

module.exports = ActivityLog;
