/**
 * Admin API Routes
 * Platform-wide management and statistics
 */

const express = require('express');
const router = express.Router();
const { User, Session, ActivityLog, AIModel } = require('../models');
const SubscriptionService = require('../services/SubscriptionService');
const { requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const response = require('../utils/response');
const { db } = require('../config/database');

/**
 * GET /api/v1/admin/stats
 * Platform-wide statistics for the admin dashboard
 */
router.get('/stats', requireAdmin, asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 7;

    // 1. Global Activity Summary
    const summary = ActivityLog.getSummary(null, days);

    // 2. User Statistics
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1").get().count;

    // 3. Session Statistics
    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM whatsapp_sessions').get().count;
    const connectedSessions = db.prepare("SELECT COUNT(*) as count FROM whatsapp_sessions WHERE status = 'CONNECTED'").get().count;

    // 4. AI Usage Stats
    const aiStats = db.prepare(`
        SELECT
            ai_model as model,
            SUM(ai_messages_sent) as sent,
            SUM(ai_messages_received) as received
        FROM whatsapp_sessions
        WHERE ai_model IS NOT NULL
        GROUP BY ai_model
    `).all();

    return response.success(res, {
        overview: {
            activities: summary.totalActivities,
            successRate: summary.successRate,
            messagesSent: summary.byAction?.send_message || 0,
        },
        users: {
            total: totalUsers,
            active: activeUsers
        },
        sessions: {
            total: totalSessions,
            connected: connectedSessions
        },
        operations: {
            applied: summary.totalActivities || 0,
            messagesSent: summary.byAction?.send_message || 0
        },
        ai: aiStats
    });
}));

/**
 * POST /api/v1/admin/users/:userId/subscription
 * Manually activate or update a user subscription
 */
router.post('/users/:userId/subscription', requireAdmin, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { planCode, action, messageLimit, durationDays } = req.body;

    const user = User.findById(userId);
    if (!user) {
        return response.error(res, 'Utilisateur non trouvÃ©', 404);
    }

    try {
        if (action === 'expire') {
            await SubscriptionService.expire(userId);
            await ActivityLog.log({
                userEmail: req.currentUser.email,
                action: 'ADMIN_SUBSCRIPTION_EXPIRE',
                resource: 'user',
                resourceId: userId,
                details: { targetEmail: user.email },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            return response.success(res, { status: 'expired' });
        }

        const finalPlanCode = planCode || 'starter';
        await SubscriptionService.subscribe(userId, finalPlanCode);

        const limit = parseInt(messageLimit);
        const days = parseInt(durationDays) || 30;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + days);

        if (!Number.isNaN(limit) && limit > 0) {
            db.prepare(`
                UPDATE users
                SET message_limit = ?, message_used = 0, subscription_expiry = ?, plan_status = 'active'
                WHERE id = ?
            `).run(limit, expiry.toISOString(), userId);
        } else {
            db.prepare(`
                UPDATE users
                SET subscription_expiry = ?, plan_status = 'active'
                WHERE id = ?
            `).run(expiry.toISOString(), userId);
        }

        await ActivityLog.log({
            userEmail: req.currentUser.email,
            action: 'ADMIN_SUBSCRIPTION_ACTIVATE',
            resource: 'user',
            resourceId: userId,
            details: { targetEmail: user.email, planCode: finalPlanCode, messageLimit: limit, durationDays: days },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return response.success(res, User.findById(userId));
    } catch (err) {
        return response.error(res, `Ã‰chec abonnement manuel: ${err.message}`, 500);
    }
}));

/**
 * GET /api/v1/admin/users/:userId/details
 * Get comprehensive user profile for admin deep-dive
 */
router.get('/users/:userId/details', requireAdmin, asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = User.findById(userId);
    if (!user) return response.error(res, 'Utilisateur non trouvé', 404);

    // Get user sessions
    const sessions = db.prepare('SELECT * FROM whatsapp_sessions WHERE owner_email = ?').all(user.email);

    // Get user logs (last 50)
    const logs = db.prepare('SELECT * FROM activity_logs WHERE user_email = ? ORDER BY created_at DESC LIMIT 50').all(user.email);

    return response.success(res, {
        user,
        sessions,
        logs: logs.map(l => ({
            ...l,
            timestamp: l.created_at,
            status: l.success === 1 ? 'success' : 'failure',
            details: l.details ? JSON.parse(l.details) : null
        }))
    });
}));



/**
 * GET /api/v1/admin/maintenance
 * Get current maintenance settings
 */
router.get('/maintenance', requireAdmin, asyncHandler(async (req, res) => {
    const settings = db.prepare('SELECT * FROM maintenance_settings WHERE id = 1').get();
    if (!settings) {
        return response.success(res, {
            enabled: false,
            title: 'Maintenance en cours',
            message: 'Nous effectuons des ameliorations techniques. Revenez dans quelques instants.',
            icon: 'Wrench',
            scheduled_start_at: null,
            scheduled_end_at: null
        });
    }
    return response.success(res, settings);
}));

/**
 * PUT /api/v1/admin/maintenance
 * Update maintenance settings
 */
router.put('/maintenance', requireAdmin, asyncHandler(async (req, res) => {
    const { enabled, title, message, icon, scheduled_start_at, scheduled_end_at } = req.body;
    const userEmail = req.currentUser?.email || 'admin';

    db.prepare(`
        UPDATE maintenance_settings SET
            enabled = ?,
            title = COALESCE(?, title),
            message = COALESCE(?, message),
            icon = COALESCE(?, icon),
            scheduled_start_at = ?,
            scheduled_end_at = ?,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE id = 1
    `).run(
        enabled === true ? 1 : 0,
        title || null,
        message || null,
        icon || null,
        scheduled_start_at || null,
        scheduled_end_at || null,
        userEmail
    );

    await ActivityLog.log({
        userEmail,
        action: 'MAINTENANCE_UPDATE',
        resource: 'system',
        resourceId: 'maintenance',
        details: JSON.stringify({ enabled, title, scheduled_start_at, scheduled_end_at }),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    const updated = db.prepare('SELECT * FROM maintenance_settings WHERE id = 1').get();
    return response.success(res, updated);
}));

/**
 * POST /api/v1/admin/maintenance/activate
 * Activate maintenance mode immediately
 */
router.post('/maintenance/activate', requireAdmin, asyncHandler(async (req, res) => {
    const userEmail = req.currentUser?.email || 'admin';

    db.prepare(`
        UPDATE maintenance_settings SET
            enabled = 1,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE id = 1
    `).run(userEmail);

    await ActivityLog.log({
        userEmail,
        action: 'MAINTENANCE_ACTIVATE',
        resource: 'system',
        resourceId: 'maintenance',
        details: JSON.stringify({ activated: true }),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    return response.success(res, { status: 'activated' });
}));

/**
 * POST /api/v1/admin/maintenance/deactivate
 * Deactivate maintenance mode immediately
 */
router.post('/maintenance/deactivate', requireAdmin, asyncHandler(async (req, res) => {
    const userEmail = req.currentUser?.email || 'admin';

    db.prepare(`
        UPDATE maintenance_settings SET
            enabled = 0,
            scheduled_start_at = NULL,
            scheduled_end_at = NULL,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE id = 1
    `).run(userEmail);

    await ActivityLog.log({
        userEmail,
        action: 'MAINTENANCE_DEACTIVATE',
        resource: 'system',
        resourceId: 'maintenance',
        details: JSON.stringify({ deactivated: true }),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    return response.success(res, { status: 'deactivated' });
}));

module.exports = router;
