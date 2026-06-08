/**
 * Activity Log Model — SQLite-based activity logging with async batching
 *
 * Instead of writing every entry synchronously to SQLite, entries are
 * buffered in memory and flushed in batches every 5 seconds (or 100 entries).
 * This keeps the hot path fast and reduces SQLite write contention.
 *
 * Public API unchanged: ActivityLog.log(data), .logSessionCreate(...), etc.
 * All remain synchronous (the buffer is flushed async).
 */

const { db } = require('../config/database');
const { log } = require('../utils/logger');

const BATCH_INTERVAL_MS = 5000;     // Flush every 5 seconds
const BATCH_MAX_SIZE = 100;          // Or flush when buffer hits 100 entries

let buffer = [];
let flushTimer = null;
let isShuttingDown = false;

/**
 * Flush buffered entries to SQLite in a single transaction
 */
function flush() {
  if (buffer.length === 0) return;

  const batch = buffer.splice(0, BATCH_MAX_SIZE);
  const insert = db.prepare(`
    INSERT INTO activity_logs (
      user_email, action, resource, resource_id, details, ip, user_agent, success, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  try {
    const flushMany = db.transaction((entries) => {
      for (const entry of entries) {
        insert.run(
          entry.userEmail || null,
          entry.action,
          entry.resource || null,
          entry.resourceId || null,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.ip || null,
          entry.userAgent || null,
          entry.success !== false ? 1 : 0
        );
      }
    });

    flushMany(batch);

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
function flushAll() {
  isShuttingDown = true;
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  while (buffer.length > 0) {
    flush();
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
  static getAll(options = {}) {
    const { userEmail, action, resource, startDate, endDate, limit = 100, offset = 0 } = options;

    let sql = 'SELECT * FROM activity_logs WHERE 1=1';
    const params = [];

    if (userEmail) {
      sql += ' AND user_email = ?';
      params.push(userEmail);
    }

    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }

    if (resource) {
      sql += ' AND resource = ?';
      params.push(resource);
    }

    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit);
    params.push(offset);

    const stmt = db.prepare(sql);
    return stmt.all(...params).map(row => ({
      ...row,
      timestamp: row.created_at,
      status: row.success === 1 ? 'success' : 'failure',
      details: row.details ? JSON.parse(row.details) : null
    }));
  }

  /**
   * Get all logs with pagination
   */
  static getLogs(limit = 100, offset = 0) {
    return this.getAll({ limit, offset });
  }

  /**
   * Get user specific logs with pagination
   */
  static getUserLogs(userEmail, limit = 100, offset = 0) {
    return this.getAll({ userEmail, limit, offset });
  }

  /**
   * Get activity summary for dashboard
   */
  static getSummary(userEmail = null, days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - (parseInt(days) || 7));
    const dateLimit = date.toISOString().replace('T', ' ').split('.')[0];

    let sqlBase = 'FROM activity_logs WHERE created_at >= ?';
    const params = [dateLimit];
    if (userEmail) {
      sqlBase += ' AND user_email = ?';
      params.push(userEmail);
    }

    try {
      const totalStmt = db.prepare(`SELECT COUNT(*) as count ${sqlBase}`);
      const totalResult = totalStmt.get(...params);
      const totalActivities = totalResult ? totalResult.count : 0;

      const actionStmt = db.prepare(`SELECT action, COUNT(*) as count ${sqlBase} GROUP BY action`);
      const actionRows = actionStmt.all(...params);

      const byAction = actionRows.reduce((acc, row) => {
        let key = row.action.toLowerCase();
        if (key.includes('message_send') || key.includes('campaign_message')) {
          acc['send_message'] = (acc['send_message'] || 0) + row.count;
        }
        if (key.includes('session_create') || key === 'create') {
          acc['create'] = (acc['create'] || 0) + row.count;
        }
        acc[key] = (acc[key] || 0) + row.count;
        return acc;
      }, {});

      const userStmt = db.prepare(`SELECT user_email, COUNT(*) as count ${sqlBase} GROUP BY user_email`);
      const userRows = userStmt.all(...params);
      const byUser = userRows.reduce((acc, row) => {
        acc[row.user_email || 'anonymous'] = row.count;
        return acc;
      }, {});

      const successStmt = db.prepare(`SELECT COUNT(*) as count ${sqlBase} AND success = 1`);
      const successResult = successStmt.get(...params);
      const successCount = successResult ? successResult.count : 0;
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
