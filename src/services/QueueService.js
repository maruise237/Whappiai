/**
 * QueueService — BullMQ-backed outbound message queue
 *
 * Replaces the in-memory activeQueues Map with a persistent Redis queue.
 * Supports both Baileys (sock) and Evolution API (provider) send modes.
 *
 * Features:
 *   - Queue survives crashes/restarts
 *   - Anti-ban delays (configurable per session)
 *   - Priority handling (high p1, normal p2)
 *   - Worker processes jobs asynchronously
 *   - Works with Evolution API provider when sock is null
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const { log } = require('../utils/logger');
const { db } = require('../config/database');

// Lazy-init connection (set up by init())
let connection = null;
let sendQueue = null;
let worker = null;
let queueEvents = null;
let providerResolver = null;
const pendingJobs = new Map();

/**
 * Initialize the BullMQ connection (call once at startup)
 * @param {Function} getProviderFn - async function that returns the WhatsApp provider
 */
function init(getProviderFn) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    log('[QueueService] No REDIS_URL — queue disabled, using direct sends', 'SYSTEM', { event: 'queue-no-redis' }, 'WARN');
    return;
  }

  try {
    // Dynamic import of IORedis — bullmq requires it
    const IORedis = require('ioredis');
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    sendQueue = new Queue('whappi-outbound', { connection });
    queueEvents = new QueueEvents('whappi-outbound', { connection });

    providerResolver = getProviderFn || null;

    // Create the worker that processes send jobs
    worker = new Worker('whappi-outbound', async (job) => {
      const { sessionId, to, content, options } = job.data;

      try {
        const result = await processJob(sessionId, to, content, options);

        // Resolve the pending promise if the caller is still waiting
        const pending = pendingJobs.get(job.id);
        if (pending) {
          pendingJobs.delete(job.id);
          pending.resolve(result);
        }

        return result;
      } catch (err) {
        const pending = pendingJobs.get(job.id);
        if (pending) {
          pendingJobs.delete(job.id);
          pending.reject(err);
        }
        throw err;
      }
    }, {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    });

    worker.on('error', (err) => {
      log(`[QueueService] Worker error: ${err.message}`, 'SYSTEM', { event: 'queue-worker-error' }, 'ERROR');
    });

    log('[QueueService] BullMQ initialized', 'SYSTEM', { event: 'queue-init' }, 'INFO');
  } catch (err) {
    log(`[QueueService] Init failed: ${err.message}`, 'SYSTEM', { event: 'queue-init-error' }, 'ERROR');
    connection = null;
    sendQueue = null;
    worker = null;
    queueEvents = null;
  }
}

/**
 * Process a single send job
 */
async function processJob(sessionId, to, content, options = {}) {
  // 1. Anti-ban delay
  const session = db.prepare('SELECT ai_delay_min, ai_delay_max FROM whatsapp_sessions WHERE id = ?').get(sessionId);
  const delayMin = (session?.ai_delay_min ?? 1) * 1000;
  const delayMax = (session?.ai_delay_max ?? 5) * 1000;
  const baseDelay = delayMin + Math.random() * (delayMax - delayMin);
  await new Promise(resolve => setTimeout(resolve, baseDelay));

  // 2. Try provider (Evolution API mode)
  let provider = null;
  if (providerResolver) {
    try {
      provider = await providerResolver();
    } catch (e) {}
  }

  if (provider && typeof provider.sendTextMessage === 'function' && content.text) {
    return provider.sendTextMessage(sessionId, {
      jid: to,
      text: content.text,
      mentions: options.mentions || content.mentions,
    });
  }

  throw new Error('No provider available for send — enqueue requires an active WhatsApp provider');
}

/**
 * Add a message to the outbound queue
 * @param {string} sessionId
 * @param {object|null} sock - kept for API compatibility (ignored in Evolution mode)
 * @param {string} to - Destination JID
 * @param {object} content - Message content
 * @param {object} options - Priority, label, etc.
 * @returns {Promise<object>} Send result
 */
async function enqueue(sessionId, sock, to, content, options = {}) {
  // If no queue initialized, fall through to direct send
  if (!sendQueue || !connection) {
    return sendDirect(sessionId, to, content, options);
  }

  const job = await sendQueue.add('send', {
    sessionId,
    to,
    content,
    options,
    timestamp: Date.now(),
  }, {
    priority: options.priority === 'high' ? 1 : 2,
  });

  // Return a promise that resolves when the worker completes this job
  return new Promise((resolve, reject) => {
    pendingJobs.set(job.id, { resolve, reject });

    // Safety timeout
    setTimeout(() => {
      if (pendingJobs.has(job.id)) {
        pendingJobs.delete(job.id);
        reject(new Error(`Queue timeout (60s) for job ${job.id}`));
      }
    }, 60000);
  });
}

/**
 * Direct send fallback (bypasses queue)
 */
async function sendDirect(sessionId, to, content, options = {}) {
  let provider = null;
  if (providerResolver) {
    try {
      provider = await providerResolver();
    } catch (e) {}
  }

  if (provider && typeof provider.sendTextMessage === 'function' && content.text) {
    return provider.sendTextMessage(sessionId, {
      jid: to,
      text: content.text,
      mentions: options.mentions || content.mentions,
    });
  }

  throw new Error('No provider available for send');
}

/**
 * Get queue stats
 */
async function getStats(sessionId) {
  if (!sendQueue) {
    return { pending: 0, waiting: 0, active: 0, delayed: 0, isProcessing: false };
  }

  const counts = await sendQueue.getJobCounts('waiting', 'active', 'delayed');
  return {
    pending: (counts.waiting || 0) + (counts.active || 0),
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    delayed: counts.delayed || 0,
    isProcessing: (counts.active || 0) > 0,
  };
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  if (sendQueue) {
    await sendQueue.close();
    sendQueue = null;
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
  log('[QueueService] Shutdown complete', 'SYSTEM', { event: 'queue-shutdown' }, 'INFO');
}

module.exports = { init, enqueue, getStats, shutdown };
