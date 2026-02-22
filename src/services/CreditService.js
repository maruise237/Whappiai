const { db } = require('../config/database');
const { log } = require('../utils/logger');
const crypto = require('crypto');
const User = require('../models/User');
const NotificationService = require('./NotificationService');

class CreditService {
    /**
     * Get user credit balance
     * @param {string} userId 
     * @returns {number}
     */
    static getBalance(userId) {
        const user = User.findById(userId);
        if (!user) return 0;
        
        // Return the current message_limit which represents available credits
        return user.message_limit || 0;
    }

    /**
     * Deduct credits from user
     * @param {string} userId 
     * @param {number} amount 
     * @param {string} reason 
     * @returns {boolean} success
     */
    static deduct(userId, amount, reason = 'usage') {
        const user = User.findById(userId);
        if (!user) return false;

        // 1. Admin Exclusion (Spec #1)
        if (user.role === 'admin') {
            log(`Admin ${user.email} bypassed credit deduction of ${amount}`, 'CREDITS');
            return true;
        }

        // 2. Check Balance
        const balance = this.getBalance(userId);
        if (balance < amount) {
            log(`Insufficient credits for ${user.email}: need ${amount}, have ${balance}`, 'CREDITS', null, 'WARN');
            return false;
        }

        // 3. Deduct (Atomic Transaction)
        try {
            const deductTransaction = db.transaction(() => {
                // Insert history
                const stmt = db.prepare(`
                    INSERT INTO credit_history (id, user_id, amount, type, description)
                    VALUES (?, ?, ?, 'debit', ?)
                `);
                stmt.run(crypto.randomUUID(), userId, amount, reason);

                // Update user stats
                db.prepare(`
                    UPDATE users 
                    SET message_limit = message_limit - ?, message_used = message_used + ?
                    WHERE id = ?
                `).run(amount, amount, userId);
            });

            deductTransaction();

            log(`Deducted ${amount} credits from ${user.email}: ${reason}`, 'CREDITS');
            return true;
        } catch (error) {
            log(`Transaction failed for credit deduction: ${error.message}`, 'CREDITS', { userId, error: error.message }, 'ERROR');
            return false;
        }
    }

    /**
     * Add credits to user
     * @param {string} userId 
     * @param {number} amount 
     * @param {string} type - credit, bonus, purchase
     * @param {string} description 
     */
    static add(userId, amount, type = 'credit', description = 'Manual top-up') {
        try {
            const addTransaction = db.transaction(() => {
                const stmt = db.prepare(`
                    INSERT INTO credit_history (id, user_id, amount, type, description)
                    VALUES (?, ?, ?, ?, ?)
                `);
                stmt.run(crypto.randomUUID(), userId, amount, type, description);

                // Update user stats
                if (type === 'credit' || type === 'purchase' || type === 'bonus') {
                    db.prepare(`
                        UPDATE users 
                        SET message_limit = message_limit + ?
                        WHERE id = ?
                    `).run(amount, userId);
                }
            });

            addTransaction();
            log(`Added ${amount} credits to user ${userId} (${type})`, 'CREDITS');
            return this.getBalance(userId);
        } catch (error) {
            log(`Transaction failed for credit addition: ${error.message}`, 'CREDITS', { userId, error: error.message }, 'ERROR');
            throw error;
        }
    }

    /**
     * Get credit history
     * @param {string} userId
     * @returns {Array}
     */
    static getHistory(userId) {
        return db.prepare('SELECT * FROM credit_history WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    }

    /**
     * Give welcome credits to a new user (idempotent — only once per user)
     * @param {string} userId 
     * @param {number} amount - Default: 100 welcome credits
     * @returns {boolean} Whether credits were actually granted
     */
    static giveWelcomeCredits(userId, amount = 100) {
        try {
            // Idempotency check: only give welcome credits if no prior 'welcome' entry exists
            const existing = db.prepare(
                "SELECT id FROM credit_history WHERE user_id = ? AND description LIKE '%bienvenue%' OR description LIKE '%welcome%' LIMIT 1"
            ).get(userId);

            if (existing) {
                log(`Welcome credits already given to ${userId}, skipping`, 'CREDITS');
                return false;
            }

            this.add(userId, amount, 'bonus', 'Crédits de bienvenue 🎉');
            log(`Welcome credits (${amount}) given to new user ${userId}`, 'CREDITS');
            return true;
        } catch (error) {
            log(`Failed to give welcome credits to ${userId}: ${error.message}`, 'CREDITS', null, 'ERROR');
            return false;
        }
    }


    /**
     * Get usage statistics for a user
     * @param {string} userId 
     * @param {number} days 
     */
    static getUsageStats(userId, days = 7) {
        const stats = db.prepare(`
            SELECT 
                DATE(created_at) as date,
                SUM(amount) as used
            FROM credit_history
            WHERE user_id = ? AND type = 'debit' AND created_at > DATETIME('now', ?)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `).all(userId, `-${days} days`);

        return stats;
    }

    /**
     * Check if user has low credits and trigger notification
     * @param {string} userId 
     */
    static checkAndNotifyLowCredits(userId) {
        const user = User.findById(userId);
        if (!user || user.role === 'admin') return;

        const balance = this.getBalance(userId);
        const threshold = Math.max(5, Math.floor(user.message_limit * 0.1)); // 10% or min 5

        if (balance > 0 && balance <= threshold) {
            NotificationService.send(userId, 'CREDITS_LOW', {
                title: 'Crédits bientôt épuisés ⚠️',
                message: `Il ne vous reste que ${balance} crédits. Pensez à recharger pour éviter toute interruption.`,
                type: 'warning',
                action_url: '/dashboard/credits'
            });
            log(`Low credit notification sent to ${user.email} (Balance: ${balance})`, 'CREDITS');
        }
    }
}

module.exports = CreditService;