/**
 * Admin & AI Model Management Routes
 * Handles admin-only endpoints and AI model CRUD operations
 */

const AIModel = require('../../models/AIModel');
const ActivityLog = require('../../models/ActivityLog');
const { validateAIModel } = require('../../utils/validation');

/**
 * Initialize admin routes with dependencies
 */
function initializeAdminRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, requireAdmin, log } = dependencies;

    // Get all AI models (admin only)
    routerInstance.get('/admin/ai-models', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            log(`Fetching AI models for admin: ${req.currentUser.email}`, 'SYSTEM');
            const models = AIModel.getAll();
            res.json({ status: 'success', data: models });
        } catch (err) {
            log(`Error fetching AI models: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Create AI model (admin only)
    routerInstance.post('/admin/ai-models', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            const validation = validateAIModel({ ...req.body, isNew: true });
            if (!validation.isValid) {
                return res.status(422).json({
                    status: 'error',
                    message: 'Validation failed',
                    details: { errors: validation.errors }
                });
            }

            const model = AIModel.create(req.body);
            ActivityLog.logAIModel(req.currentUser.email, 'CREATE', model.id, { name: model.name });
            res.status(201).json({ status: 'success', data: model });
        } catch (err) {
            res.status(400).json({ status: 'error', message: err.message });
        }
    });

    // Update AI model (admin only)
    routerInstance.put('/admin/ai-models/:id', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            const existing = AIModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ status: 'error', message: 'Model not found' });

            const updatedData = { ...existing, ...req.body };
            const apiKey = req.body.api_key || req.body.key;

            if (apiKey === "" || apiKey === undefined) {
                updatedData.api_key = existing.api_key;
            } else {
                updatedData.api_key = apiKey;
            }

            const validation = validateAIModel(updatedData);
            if (!validation.isValid) {
                return res.status(422).json({
                    status: 'error',
                    message: 'Validation failed',
                    details: { errors: validation.errors }
                });
            }

            const modelUpdate = { ...req.body };
            if (req.body.api_key !== undefined) modelUpdate.api_key = req.body.api_key;
            else if (req.body.key !== undefined) modelUpdate.api_key = req.body.key;

            if (modelUpdate.api_key === "" || modelUpdate.api_key === undefined) {
                delete modelUpdate.api_key;
            }

            const model = AIModel.update(req.params.id, modelUpdate);
            ActivityLog.logAIModel(req.currentUser.email, 'UPDATE', req.params.id, { name: model.name });
            res.json({ status: 'success', data: model });
        } catch (err) {
            res.status(400).json({ status: 'error', message: err.message });
        }
    });

    // Delete AI model (admin only)
    routerInstance.delete('/admin/ai-models/:id', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            const model = AIModel.findById(req.params.id);
            const success = AIModel.delete(req.params.id);
            if (!success) return res.status(404).json({ status: 'error', message: 'Model not found' });
            ActivityLog.logAIModel(req.currentUser.email, 'DELETE', req.params.id, { name: model?.name });
            res.json({ status: 'success', message: 'Model deleted' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get active AI models (all authenticated users)
    routerInstance.get('/ai-models', checkSessionOrTokenAuth, (req, res) => {
        try {
            const models = AIModel.getAll(true);
            const safeModels = models.map(m => {
                const { api_key, provider, endpoint, ...safe } = m;
                return safe;
            });
            res.json({ status: 'success', data: safeModels });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Debug sessions endpoint (admin only)
    routerInstance.get('/debug/sessions', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        const debugInfo = {};
        dependencies.sessions.forEach((session, sessionId) => {
            debugInfo[sessionId] = {
                status: session.status,
                hasSock: !!session.sock,
                sockConnected: session.sock ? 'yes' : 'no',
                owner: session.owner,
                detail: session.detail
            };
        });
        res.json(debugInfo);
    });
}

module.exports = initializeAdminRoutes;
