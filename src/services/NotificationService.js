const db = require('../db/query');
const crypto = require('crypto');
const { log } = require('../utils/logger');

class NotificationService {
    /**
     * Create a notification
     */
    static async create({ userId, type, title, message, metadata = {} }) {
        const id = crypto.randomUUID();
        await db.run(
            `INSERT INTO user_notifications (id, user_id, type, title, message, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, userId, type, title, message, JSON.stringify(metadata)]
        );

        log(`Notification created for ${userId}: ${type}`, 'SYSTEM');

        // Real-time push via WebSocket
        try {
            const { wsClients } = require('../..');
            for (const [client, userInfo] of wsClients) {
                if (client.readyState === 1 && userInfo && userInfo.id === userId) {
                    client.send(JSON.stringify({
                        type: 'notification',
                        id,
                        userId,
                        type,
                        title,
                        message,
                        metadata,
                        created_at: new Date().toISOString(),
                        is_read: 0
                    }));
                }
            }
        } catch (err) {
            // WebSocket not available, notifications will be fetched via API
        }

        return id;
    }

    /**
     * Create at most one matching notification per day.
     */
    static async createOncePerDay({ userId, type, title, message, metadata = {} }) {
        const dedupeKey = metadata.dedupe_key || metadata.reason || '';
        const existing = await db.get(
            `SELECT id FROM user_notifications
             WHERE user_id = $1
             AND type = $2
             AND date(created_at) = CURRENT_DATE
             AND ($3 = '' OR metadata LIKE $4)
             LIMIT 1`,
            [userId, type, dedupeKey, `%${dedupeKey}%`]
        );

        if (existing) return existing.id;

        return this.create({ userId, type, title, message, metadata });
    }

    /**
     * Send a notification (wrapper for create with different argument format)
     * Used by CreditService.js
     */
    static async send(userId, type, { title, message, ...metadata }) {
        return this.create({
            userId,
            type,
            title,
            message,
            metadata
        });
    }

    /**
     * Get unread notifications
     */
    static async getUnread(userId) {
        const notifications = await db.all(
            'SELECT * FROM user_notifications WHERE user_id = $1 AND is_read = 0 ORDER BY created_at DESC',
            [userId]
        );
        return notifications.map(n => ({
            ...n,
            metadata: JSON.parse(n.metadata || '{}')
        }));
    }

    /**
     * Get user notifications with pagination
     */
    static async getUserNotifications(userId, unreadOnly = false, limit = 20, offset = 0) {
        let query = 'SELECT * FROM user_notifications WHERE user_id = $1';
        const params = [userId];

        if (unreadOnly) {
            query += ' AND is_read = 0';
        }

        query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);

        const notifications = await db.all(query, params);
        return notifications.map(n => ({
            ...n,
            metadata: JSON.parse(n.metadata || '{}')
        }));
    }

    /**
     * Get unread count
     */
    static async getUnreadCount(userId) {
        const result = await db.get(
            'SELECT count(*) as count FROM user_notifications WHERE user_id = $1 AND is_read = 0',
            [userId]
        );
        return result ? result.count : 0;
    }

    /**
     * Mark as read
     */
    static async markAsRead(notificationId, userId) {
        if (userId) {
            const result = await db.run(
                'UPDATE user_notifications SET is_read = 1 WHERE id = $1 AND user_id = $2',
                [notificationId, userId]
            );
            return result.changes > 0;
        } else {
            // Fallback for internal use or if userId not provided (less secure)
            const result = await db.run(
                'UPDATE user_notifications SET is_read = 1 WHERE id = $1',
                [notificationId]
            );
            return result.changes > 0;
        }
    }

    /**
     * Mark all as read
     */
    static async markAllAsRead(userId) {
        const result = await db.run(
            'UPDATE user_notifications SET is_read = 1 WHERE user_id = $1 AND is_read = 0',
            [userId]
        );
        return result.changes;
    }
}

module.exports = NotificationService;
