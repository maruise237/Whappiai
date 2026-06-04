/**
 * Cal.com Integration Routes
 * Handles Cal.com calendar integration endpoints
 */

const User = require('../../models/User');

/**
 * Initialize Cal.com routes with dependencies
 */
function initializeCalRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, log } = dependencies;

    // Get Cal.com connection status
    routerInstance.get('/cal/status', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const CalService = require('../../services/CalService');
            const user = User.findById(req.currentUser.id);
            if (!user) {
                return res.json({ status: 'success', data: { isConnected: false, ai_cal_enabled: false, ai_cal_video_allowed: false, eventTypes: [] } });
            }

            const isConnected = !!(user.cal_access_token);

            let eventTypes = [];
            if (isConnected) {
                eventTypes = await CalService.getEventTypes(user.id);
            }

            res.json({
                status: 'success',
                data: {
                    isConnected,
                    ai_cal_enabled: !!(user.ai_cal_enabled),
                    ai_cal_video_allowed: !!(user.ai_cal_video_allowed),
                    eventTypes: Array.isArray(eventTypes) ? eventTypes : []
                }
            });
        } catch (error) {
            log(`Cal status error: ${error.message}`, 'SYSTEM', { stack: error.stack }, 'ERROR');
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Get Cal.com auth URL
    routerInstance.get('/cal/auth', checkSessionOrTokenAuth, (req, res) => {
        try {
            const CalService = require('../../services/CalService');
            const authUrl = CalService.getAuthUrl(req.currentUser.id);
            res.json({ status: 'success', data: { authUrl } });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    // Update Cal.com settings
    routerInstance.post('/cal/settings', checkSessionOrTokenAuth, async (req, res) => {
        const { ai_cal_enabled, ai_cal_video_allowed } = req.body;
        try {
            const updates = {};
            if (ai_cal_enabled !== undefined) updates.ai_cal_enabled = ai_cal_enabled ? 1 : 0;
            if (ai_cal_video_allowed !== undefined) updates.ai_cal_video_allowed = ai_cal_video_allowed ? 1 : 0;

            await User.update(req.currentUser.id, updates);
            res.json({ status: 'success', message: 'Paramètres mis à jour' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });
}

module.exports = initializeCalRoutes;
