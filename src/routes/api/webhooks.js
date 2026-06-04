/**
 * Webhook Management Routes
 * Handles webhook CRUD operations for sessions
 */

const WebhookService = require('../../services/WebhookService');

/**
 * Initialize webhook routes with dependencies
 */
function initializeWebhookRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, ensureOwnership } = dependencies;

    // List webhooks for a session
    routerInstance.get('/sessions/:sessionId/webhooks', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const list = WebhookService.list(req.params.sessionId);
            res.json({ status: 'success', data: list });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Create new webhook
    routerInstance.post('/sessions/:sessionId/webhooks', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { url, events, secret } = req.body;
        if (!url) return res.status(400).json({ status: 'error', message: 'URL requise' });

        try {
            const id = WebhookService.add(req.params.sessionId, url, events || [], secret);
            res.json({ status: 'success', data: { id } });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Delete webhook
    routerInstance.delete('/sessions/:sessionId/webhooks/:webhookId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const success = WebhookService.delete(req.params.webhookId, req.params.sessionId);
            res.json({ status: success ? 'success' : 'error', message: success ? 'Webhook supprimé' : 'Échec' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });
}

module.exports = initializeWebhookRoutes;
