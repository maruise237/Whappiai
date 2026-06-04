/**
 * Outbound Queue Service
 * Manages all outgoing WhatsApp messages to ensure "human-like" delays
 * and protect against account banning.
 */

const { log } = require('../utils/logger');
const { db } = require('../config/database');

// In-memory queue state
const activeQueues = new Map(); // sessionId -> Array of tasks

class QueueService {
    /**
     * Add a message to the outbound queue
     * @param {string} sessionId
     * @param {object} sock - Baileys socket
     * @param {string} to - Destination JID
     * @param {object} content - Baileys message content
     * @param {object} options - Priority, label, etc.
     */
    static enqueue(sessionId, sock, to, content, options = {}) {
        if (!activeQueues.has(sessionId)) {
            activeQueues.set(sessionId, []);
        }

        const queue = activeQueues.get(sessionId);
        const task = {
            to,
            content,
            options,
            timestamp: Date.now(),
            resolve: null,
            reject: null
        };

        // Return a promise that resolves when the message is actually sent
        return new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;

            // Priority handling (optional)
            if (options.priority === 'high') {
                queue.unshift(task);
            } else {
                queue.push(task);
            }

            log(`Message enfilé pour ${to} (Session: ${sessionId}, File: ${queue.length})`, sessionId, { event: 'queue-enqueue', to }, 'DEBUG');

            // Toujours tenter de lancer le processeur (il s'arrêtera s'il tourne déjà)
            this.processQueue(sessionId, sock);
        });
    }

    /**
     * Process tasks from the queue for a specific session
     */
    static async processQueue(sessionId, sock) {
        // Prevent concurrent processing of the same session queue
        const queueKey = `processing:${sessionId}`;
        if (activeQueues.get(queueKey)) return;
        activeQueues.set(queueKey, true);

        try {
            while (true) {
                const queue = activeQueues.get(sessionId);
                if (!queue || queue.length === 0) break;

                // Check if socket is still active
                if (!sock || !sock.user) {
                    log(`Socket déconnecté, arrêt du traitement de la file pour ${sessionId}`, sessionId, { event: 'queue-stop-offline' }, 'WARN');
                    break;
                }

                const task = queue.shift();

                try {
                    // 1. Human-like delay BEFORE sending
                    // Fetch session config for customized anti-ban delays
                    const session = db.prepare('SELECT ai_delay_min, ai_delay_max FROM whatsapp_sessions WHERE id = ?').get(sessionId);
                    const min = (session?.ai_delay_min ?? 1) * 1000;
                    const max = (session?.ai_delay_max ?? 5) * 1000;

                    // Base delay from config (default 1-5s) + bonus for long queues
                    const baseDelay = min + Math.random() * (max - min);
                    const queueCongestionBonus = Math.min(queue.length * 500, 5000);
                    const totalDelay = baseDelay + queueCongestionBonus;

                    log(`Attente anti-ban : ${Math.round(totalDelay/100)/10}s pour ${task.to}`, sessionId, { event: 'queue-delay', delay: totalDelay, range: `${min/1000}-${max/1000}s` }, 'DEBUG');
                    await new Promise(resolve => setTimeout(resolve, totalDelay));

                    // 2. Typing simulation (optional based on content)
                    if (task.content.text && !task.options.skipTyping) {
                        try {
                            await sock.presenceSubscribe(task.to);
                            await sock.sendPresenceUpdate('composing', task.to);
                            // Typing speed simulation: ~50ms per char
                            const typingDelay = Math.min(Math.max(task.content.text.length * 50, 1000), 10000);
                            await new Promise(resolve => setTimeout(resolve, typingDelay));
                            await sock.sendPresenceUpdate('paused', task.to);
                        } catch (e) {}
                    }

                    // 3. ACTUAL SEND (with timeout protection)
                    const result = await Promise.race([
                        sock.sendMessage(task.to, task.content),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp send timeout (30s)')), 30000))
                    ]);

                    log(`Message envoyé via file d'attente à ${task.to}`, sessionId, { event: 'queue-sent', to: task.to, messageId: result?.key?.id }, 'INFO');

                    // CRITICAL: Track bot-sent messages to avoid auto-pausing the AI (Human Priority logic)
                    try {
                        const aiService = require('./ai');
                        if (result?.key?.id) {
                            aiService.trackBotSent(sessionId, result.key.id);
                        }
                    } catch (e) {
                        // Ignore circular dependency or other tracking issues
                    }

                    if (task.resolve) task.resolve(result);
                } catch (err) {
                    log(`Échec envoi via file d'attente pour ${task.to}: ${err.message}`, sessionId, { event: 'queue-error', error: err.message }, 'ERROR');
                    if (task.reject) task.reject(err);
                }
            }
        } finally {
            activeQueues.delete(queueKey);
            // If queue was empty, we can cleanup the session entry
            if (activeQueues.get(sessionId)?.length === 0) {
                activeQueues.delete(sessionId);
            }
        }
    }

    /**
     * Get queue stats
     */
    static getStats(sessionId) {
        const queue = activeQueues.get(sessionId);
        return {
            pending: queue ? queue.length : 0,
            isProcessing: !!activeQueues.get(`processing:${sessionId}`)
        };
    }
}

module.exports = QueueService;
