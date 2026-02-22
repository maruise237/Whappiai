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
     * Reset monthly credits (for subscriptions)
     * This logic handles "Attribution de crédits selon le forfait"
     */
    static resetMonthlyCredits(userId, planLimit) {
        // To strictly "Reset" to the plan limit, we should expire existing credits
        // OR we can implement Rollover.
        // For simplicity and alignment with User.message_limit behavior (which resets),
        // we will expire current balance and add new plan limit.

        const currentBalance = this.getBalance(userId);
        if (currentBalance > 0) {
            // We use a special transaction to reset without incrementing message_used for the expiration
            // because we want to start fresh for the new month.
            const stmt = db.prepare(`
                INSERT INTO credit_history (id, user_id, amount, type, description)
                VALUES (?, ?, ?, 'debit', ?)
            `);
            stmt.run(crypto.randomUUID(), userId, currentBalance, 'Expiration mensuelle (Reset)');
        } else if (currentBalance < 0) {
            // Should not happen, but reset negative balance
            this.add(userId, Math.abs(currentBalance), 'adjustment', 'Reset négatif');
        }

        // Add new credits
        this.add(userId, planLimit, 'credit', 'Renouvellement mensuel');

        // Explicitly reset message_used to 0 for the new period
        db.prepare('UPDATE users SET message_used = 0, message_limit = ? WHERE id = ?')
            .run(planLimit, userId);

        log(`Reset monthly credits for ${userId}: limit=${planLimit}, used=0`, 'CREDITS');
    }
}

module.exports = CreditService;