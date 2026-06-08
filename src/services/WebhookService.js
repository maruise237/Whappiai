/**
 * Webhook Service
 * Handles event dispatching to external URLs.
 */

const db = require('../db/query');
const { log } = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');

class WebhookService {
    /**
     * Dispatch an event to all active webhooks for a session
     */
    static async dispatch(sessionId, event, data) {
        try {
            const webhooks = await db.all(`
                SELECT * FROM webhooks WHERE session_id = $1 AND is_active = 1
            `, [sessionId]);

            for (const webhook of webhooks) {
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
    static async list(sessionId) {
        return await db.all('SELECT * FROM webhooks WHERE session_id = $1', [sessionId]);
    }

    static async add(sessionId, url, events = [], secret = null) {
        const id = crypto.randomUUID();
        await db.run(`
            INSERT INTO webhooks (id, session_id, url, events, secret)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, sessionId, url, JSON.stringify(events), secret || crypto.randomBytes(16).toString('hex')]);
        return id;
    }

    static async delete(id, sessionId) {
        const result = await db.run('DELETE FROM webhooks WHERE id = $1 AND session_id = $2', [id, sessionId]);
        return result.rowCount > 0;
    }
}

module.exports = WebhookService;
