/**
 * Webhook Service
 * Handles event dispatching to external URLs.
 */

const { db } = require('../config/database');
const { log } = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');

class WebhookService {
    /**
     * Dispatch an event to all active webhooks for a session
     */
    static async dispatch(sessionId, event, data) {
        try {
            const webhooks = db.prepare(`
                SELECT * FROM webhooks WHERE session_id = ? AND is_active = 1
            `).all(sessionId);

            for (const webhook of webhooks) {
                // Check if event is subscribed
                const subscribedEvents = JSON.parse(webhook.events || '[]');
                if (subscribedEvents.length > 0 && !subscribedEvents.includes(event)) {
                    continue;
                }

                this.send(webhook, event, data, sessionId);
            }
        } catch (err) {
            log(`Erreur dispatch webhook: ${err.message}`, sessionId, { event }, 'ERROR');
        }
    }

    /**
     * Send the actual HTTP request
     */
    static async send(webhook, event, data, sessionId) {
        const payload = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            event,
            data
        };

        const signature = webhook.secret
            ? crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(payload)).digest('hex')
            : null;

        const headers = {
            'Content-Type': 'application/json',
            'X-Whappi-Event': event,
            'X-Whappi-Timestamp': payload.timestamp
        };

        if (signature) headers['X-Whappi-Signature'] = signature;

        try {
            await axios.post(webhook.url, payload, { headers, timeout: 5000 });
            log(`Webhook envoyé: ${event} -> ${webhook.url}`, sessionId, { event }, 'DEBUG');
        } catch (err) {
            log(`Échec envoi webhook (${webhook.url}): ${err.message}`, sessionId, { event }, 'WARN');
        }
    }

    /**
     * Management methods
     */
    static list(sessionId) {
        return db.prepare('SELECT * FROM webhooks WHERE session_id = ?').all(sessionId);
    }

    static add(sessionId, url, events = [], secret = null) {
        const id = crypto.randomUUID();
        db.prepare(`
            INSERT INTO webhooks (id, session_id, url, events, secret)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, sessionId, url, JSON.stringify(events), secret || crypto.randomBytes(16).toString('hex'));
        return id;
    }

    static delete(id, sessionId) {
        return db.prepare('DELETE FROM webhooks WHERE id = ? AND session_id = ?').run(id, sessionId).changes > 0;
    }
}

module.exports = WebhookService;
