/**
 * Credit Service
 * Postgres-based credit management
 */

const db = require('../db/query');
const { log } = require('../utils/logger');
const crypto = require('crypto');
const User = require('../models/User');
const NotificationService = require('./NotificationService');
const AccountAccessService = require('./AccountAccessService');

class CreditService {
    /**
     * Get user credit balance
     */
    static async getBalance(userId) {
        const user = await User.findById(userId);
        if (!user) return 0;
        return user.message_limit || 0;
    }

    /**
     * Deduct credits from user
     */
    static async deduct(userId, amount, reason = 'usage') {
        const user = await User.findById(userId);
        if (!user) return false;

        if (user.role === 'admin') {
            log(`Admin ${user.email} bypassed credit deduction of ${amount}`, 'CREDITS');
            return true;
        }

        const access = await AccountAccessService.canConsumeAction(userId, amount);
        if (!access.allowed) {
            log(`Blocked action for ${user.email}: ${access.code}`, 'CREDITS', { reason: access.message }, 'WARN');
            return false;
        }

        try {
            await db.transaction(async (tx) => {
                await tx.run(
                    `INSERT INTO credit_history (id, user_id, amount, type, description)
                     VALUES ($1, $2, $3, 'debit', $4)`,
                    [crypto.randomUUID(), userId, amount, reason]
                );
                await tx.run(
                    `UPDATE users SET message_limit = message_limit - $1, message_used = message_used + $1 WHERE id = $2`,
                    [amount, userId]
                );
            });

            log(`Deducted ${amount} credits from ${user.email}: ${reason}`, 'CREDITS');
            await this.checkAndNotifyLowCredits(userId);
            return true;
        } catch (error) {
            log(`Transaction failed for credit deduction: ${error.message}`, 'CREDITS', { userId, error: error.message }, 'ERROR');
            return false;
        }
    }

    /**
     * Add credits to user
     */
    static async add(userId, amount, type = 'credit', description = 'Manual top-up') {
        try {
            await db.transaction(async (tx) => {
                await tx.run(
                    `INSERT INTO credit_history (id, user_id, amount, type, description)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [crypto.randomUUID(), userId, amount, type, description]
                );

                if (type === 'credit' || type === 'purchase' || type === 'bonus') {
                    await tx.run(
                        `UPDATE users SET message_limit = message_limit + $1 WHERE id = $2`,
                        [amount, userId]
                    );
                }
            });

            log(`Added ${amount} credits to user ${userId} (${type})`, 'CREDITS');
            return this.getBalance(userId);
        } catch (error) {
            log(`Transaction failed for credit addition: ${error.message}`, 'CREDITS', { userId, error: error.message }, 'ERROR');
            throw error;
        }
    }

    /**
     * Get credit history
     */
    static async getHistory(userId) {
        return db.all(
            'SELECT * FROM credit_history WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
    }

    /**
     * Give welcome credits to a new user
     */
    static async giveWelcomeCredits(userId, amount = 100) {
        try {
            const existing = await db.get(
                `SELECT id FROM credit_history WHERE user_id = $1 AND (description LIKE '%bienvenue%' OR description LIKE '%welcome%') LIMIT 1`,
                [userId]
            );

            if (existing) {
                log(`Welcome credits already given to ${userId}, skipping`, 'CREDITS');
                return false;
            }

            await this.add(userId, amount, 'bonus', 'Crédits de bienvenue 🎉');
            log(`Welcome credits (${amount}) given to new user ${userId}`, 'CREDITS');
            return true;
        } catch (error) {
            log(`Failed to give welcome credits to ${userId}: ${error.message}`, 'CREDITS', null, 'ERROR');
            return false;
        }
    }

    /**
     * Get usage statistics for a user
     */
    static async getUsageStats(userId, days = 7) {
        return db.all(
            `SELECT 
                DATE(created_at) as date,
                SUM(amount) as used
            FROM credit_history
            WHERE user_id = $1 AND type = 'debit' AND created_at > NOW() - ($2 || ' days')::INTERVAL
            GROUP BY DATE(created_at)
            ORDER BY date ASC`,
            [userId, days]
        );
    }

    /**
     * Reset user credits to a specific amount
     */
    static async resetMonthlyCredits(userId, amount) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                log(`Failed to reset credits: user ${userId} not found`, 'CREDITS', null, 'WARN');
                return;
            }

            await db.transaction(async (tx) => {
                await tx.run(
                    `INSERT INTO credit_history (id, user_id, amount, type, description)
                     VALUES ($1, $2, $3, 'bonus', $4)`,
                    [crypto.randomUUID(), userId, amount, 'Réinitialisation mensuelle des crédits']
                );
                await tx.run(
                    `UPDATE users SET message_limit = $1, message_used = 0 WHERE id = $2`,
                    [amount, userId]
                );
            });

            log(`Reset credits for ${user.email} to ${amount}`, 'CREDITS');
        } catch (error) {
            log(`Transaction failed for credit reset: ${error.message}`, 'CREDITS', { userId, error: error.message }, 'ERROR');
            throw error;
        }
    }

    /**
     * Check if user has low credits and trigger notification
     */
    static async checkAndNotifyLowCredits(userId) {
        const user = await User.findById(userId);
        if (!user || user.role === 'admin') return;

        const balance = await this.getBalance(userId);
        const totalAllocation = Number(user.message_limit || 0) + Number(user.message_used || 0);
        const threshold = Math.max(5, Math.floor(totalAllocation * 0.1));

        if (balance > 0 && balance <= threshold) {
            await NotificationService.send(userId, 'CREDITS_LOW', {
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
