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
        // Logic: Credits = (Total Credits Added) - (Total Credits Used)
        // OR simpler: we rely on 'message_used' vs 'message_limit' in User model for now,
        // BUT the request asks for a "Credit System".
        // Let's assume 'message_limit' IS the credit balance for the period?
        // Or is it a separate wallet? 
        // "Attribution de crédits selon le forfait" implies the limit resets.
        // "Rechargement automatique ou manuel" implies a wallet.
        
        // Let's implement a Wallet approach using credit_history sum.
        const stmt = db.prepare(`
            SELECT 
                SUM(CASE WHEN type IN ('credit', 'bonus', 'purchase') THEN amount ELSE 0 END) as total_added,
                SUM(CASE WHEN type IN ('debit') THEN amount ELSE 0 END) as total_used
            FROM credit_history
            WHERE user_id = ?
        `);
        
        const result = stmt.get(userId);
        return (result.total_added || 0) - (result.total_used || 0);
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