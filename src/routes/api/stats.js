/**
 * Stats, Analytics & Activity Routes
 * Handles statistics, activity logs, and analytics endpoints
 */

const User = require('../../models/User');
const Session = require('../../models/Session');
const ActivityLog = require('../../models/ActivityLog');

/**
 * Initialize stats and analytics routes with dependencies
 */
function initializeStatsRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, log } = dependencies;

    // Get general stats
    routerInstance.get('/stats', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const userEmail = req.currentUser.role === 'admin' ? null : req.currentUser.email;
            const summary = await ActivityLog.getSummary(userEmail, 7);
            const user = await User.findById(req.currentUser.id);

            let sessionCount = 0;
            if (req.currentUser.role === 'admin') {
                sessionCount = await Session.countActive();
            } else {
                sessionCount = (await Session.getSessionIdsByOwner(req.currentUser.email)).length;
            }

            res.json({
                status: 'success',
                data: {
                    totalActivities: summary.totalActivities,
                    successRate: summary.successRate,
                    credits: user?.message_limit || 0,
                    activeSessions: sessionCount,
                    messagesSent: summary.byAction?.send_message || 0
                }
            });
        } catch (err) {
            log(`[API] Erreur stats: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get activity logs
    routerInstance.get('/activities', checkSessionOrTokenAuth, async (req, res) => {
        try {
            if (!ActivityLog) {
                log(`[API] Activity log model non trouvé`, 'SYSTEM', null, 'ERROR');
                return res.status(501).json({ status: 'error', message: 'Activity log system not available' });
            }

            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;

            log(`[API] Récupération des activités pour ${req.currentUser.email} (role: ${req.currentUser.role})`, 'SYSTEM');

            let logs;
            if (req.currentUser.role === 'admin') {
                logs = await ActivityLog.getLogs(limit, offset);
            } else {
                logs = await ActivityLog.getUserLogs(req.currentUser.email, limit, offset);
            }

            res.json({ status: 'success', data: logs });
        } catch (err) {
            log(`[API] Erreur activités: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get analytics
    routerInstance.get('/analytics', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const userEmail = req.currentUser.role === 'admin' ? null : req.currentUser.email;

            const data = await ActivityLog.getAnalytics(userEmail, days);
            res.json({ status: 'success', data });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get activities summary
    routerInstance.get('/activities/summary', checkSessionOrTokenAuth, async (req, res) => {
        try {
            if (!ActivityLog) {
                log(`[API] Activity log model non trouvé (summary)`, 'SYSTEM', null, 'ERROR');
                return res.status(501).json({ status: 'error', message: 'Activity log system not available' });
            }

            const days = parseInt(req.query.days) || 7;
            log(`[API] Résumé activités pour ${req.currentUser.email} (${days} jours)`, 'SYSTEM');

            const userEmail = req.currentUser.role === 'admin' ? null : req.currentUser.email;
            const summary = await ActivityLog.getSummary(userEmail, days);

            res.json({ status: 'success', data: summary });
        } catch (err) {
            log(`[API] Erreur résumé activités: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get credit history
       routerInstance.get('/credits', checkSessionOrTokenAuth, async (req, res) => {        try {
            const user = await User.findById(req.currentUser.id);
            if (!user) {
                return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
            }

            const history = await User.getCreditHistory(req.currentUser.id);
            res.json({
                status: 'success',
                data: {
                    balance: user.message_limit,
                    used: user.message_used,
                    plan: user.plan_id,
                    history: history
                }
            });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });
}

module.exports = initializeStatsRoutes;
