/**
 * Admin API Routes
 * Platform-wide management and statistics
 */

const express = require('express');
const router = express.Router();
const { User, Session, ActivityLog, AIModel } = require('../models');
const CreditService = require('../services/CreditService');
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

    // 4. Financial/Credit Statistics
    const totalCreditsDeducted = db.prepare("SELECT SUM(amount) as total FROM credit_history WHERE type = 'debit'").get().total || 0;
    const totalCreditsPurchased = db.prepare("SELECT SUM(amount) as total FROM credit_history WHERE type = 'purchase'").get().total || 0;

    // 5. AI Usage Stats
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
        credits: {
            deducted: totalCreditsDeducted,
            purchased: totalCreditsPurchased
        },
        ai: aiStats
    });
}));

/**
 * POST /api/v1/admin/users/:userId/credits
 * Manually adjust user credits
 */
router.post('/users/:userId/credits', requireAdmin, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { amount, type, description } = req.body;

    if (!amount || isNaN(amount)) {
        return response.error(res, 'Un montant valide est requis', 400);
    }

    const user = User.findById(userId);
    if (!user) {
        return response.error(res, 'Utilisateur non trouvé', 404);
    }

    try {
        const finalType = type || 'bonus';
        const newBalance = CreditService.add(userId, parseInt(amount), finalType, description || 'Ajustement manuel administrateur');

        await ActivityLog.log({
            userEmail: req.currentUser.email,
            action: 'ADMIN_CREDIT_ADJUST',
            resource: 'user',
            resourceId: userId,
            details: { amount, type: finalType, targetEmail: user.email },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return response.success(res, { balance: newBalance });
    } catch (err) {
        return response.error(res, `Échec de l'ajustement: ${err.message}`, 500);
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

    // Get user credit history (last 50)
    const credits = db.prepare('SELECT * FROM credit_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId);

    // Get user logs (last 50)
    const logs = db.prepare('SELECT * FROM activity_logs WHERE user_email = ? ORDER BY created_at DESC LIMIT 50').all(user.email);

    return response.success(res, {
        user,
        sessions,
        credits,
        logs: logs.map(l => ({
            ...l,
            timestamp: l.created_at,
            status: l.success === 1 ? 'success' : 'failure',
            details: l.details ? JSON.parse(l.details) : null
        }))
    });
}));

module.exports = router;
