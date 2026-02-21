const { db } = require('../config/database');
const crypto = require('crypto');
const { log } = require('../utils/logger');

class NotificationService {
    /**
     * Create a notification
     */
    static create({ userId, type, title, message, metadata = {} }) {
        const stmt = db.prepare(`
            INSERT INTO user_notifications (id, user_id, type, title, message, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        const id = crypto.randomUUID();
        stmt.run(id, userId, type, title, message, JSON.stringify(metadata));
        
        log(`Notification created for ${userId}: ${type}`, 'SYSTEM');
        
        // Real-time push via WebSocket could be added here
        // websocketService.sendToUser(userId, 'notification', { ... });
        
        return id;
    }

    /**
     * Get unread notifications
     */
    static getUnread(userId) {
        const notifications = db.prepare('SELECT * FROM user_notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC').all(userId);
        return notifications.map(n => ({
            ...n,
            metadata: JSON.parse(n.metadata || '{}')
        }));
    }

    /**
     * Get user notifications with pagination
     */
    static getUserNotifications(userId, unreadOnly = false, limit = 20, offset = 0) {
        let query = 'SELECT * FROM user_notifications WHERE user_id = ?';
        if (unreadOnly) {
            query += ' AND is_read = 0';
        }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        
        const notifications = db.prepare(query).all(userId, limit, offset);
        return notifications.map(n => ({
            ...n,
            metadata: JSON.parse(n.metadata || '{}')
        }));
    }

    /**
     * Get unread count
     */
    static getUnreadCount(userId) {
        const result = db.prepare('SELECT count(*) as count FROM user_notifications WHERE user_id = ? AND is_read = 0').get(userId);
        return result ? result.count : 0;
    }

    /**
     * Mark as read
     */
    static markAsRead(notificationId, userId) {
        if (userId) {
             const result = db.prepare('UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId);
             return result.changes > 0;
        } else {
             // Fallback for internal use or if userId not provided (less secure)
             const result = db.prepare('UPDATE user_notifications SET is_read = 1 WHERE id = ?').run(notificationId);
             return result.changes > 0;
        }
    }

    /**
     * Mark all as read
     */
    static markAllAsRead(userId) {
        const result = db.prepare('UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
        return result.changes;
    }
}

module.exports = NotificationService;