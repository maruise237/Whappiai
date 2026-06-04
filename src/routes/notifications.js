const express = require('express');
const router = express.Router();
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const NotificationService = require('../services/NotificationService');
const { log } = require('../utils/logger');

// GET /api/v1/notifications
router.get('/', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const unreadOnly = req.query.unread === 'true';
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const notifications = NotificationService.getUserNotifications(userId, unreadOnly, limit, offset);
        const unreadCount = NotificationService.getUnreadCount(userId);

        res.json({ status: 'success', data: { notifications, unreadCount } });
    } catch (error) {
        log('Error fetching notifications', 'NOTIFICATIONS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { id } = req.params;
        
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const success = NotificationService.markAsRead(id, userId);
        if (success) {
            res.json({ status: 'success', message: 'Notification marked as read' });
        } else {
            res.status(404).json({ status: 'error', message: 'Notification not found' });
        }
    } catch (error) {
        log('Error marking notification as read', 'NOTIFICATIONS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// PUT /api/v1/notifications/read-all
router.put('/read-all', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const count = NotificationService.markAllAsRead(userId);
        res.json({ status: 'success', message: `${count} notifications marked as read` });
    } catch (error) {
        log('Error marking all notifications as read', 'NOTIFICATIONS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
