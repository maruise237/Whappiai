const { db } = require('../config/database');
const { log } = require('../utils/logger');
const NotificationService = require('../services/NotificationService');
const PricingService = require('../services/PricingService');
const SubscriptionService = require('../services/SubscriptionService');

// Check interval: 1 hour
const CHECK_INTERVAL = 60 * 60 * 1000;

class Scheduler {
    constructor() {
        this.interval = null;
    }

    start() {
        if (this.interval) return;
        
        log('Starting SaaS Scheduler...', 'SYSTEM');
        
        // Run immediately on start
        this.runTasks();
        
        // Schedule periodic run
        this.interval = setInterval(() => {
            this.runTasks();
        }, CHECK_INTERVAL);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            log('Stopped SaaS Scheduler', 'SYSTEM');
        }
    }

    async runTasks() {
        try {
            await this.checkExpiringSubscriptions();
            await this.checkLowCredits();
            await this.processRenewals();
        } catch (error) {
            log(`Scheduler error: ${error.message}`, 'SYSTEM', null, 'ERROR');
        }
    }

    /**
     * Check for subscriptions expiring in 7, 3, and 1 days
     */
    async checkExpiringSubscriptions() {
        const daysToCheck = [3, 1, 0]; // 3 days before, 1 day before, and on expiry day
        
        for (const days of daysToCheck) {
            // Find users whose subscription expires in exactly 'days' days
            // Use date() to compare only the date part, ignoring time
            const users = db.prepare(`
                SELECT * FROM users 
                WHERE plan_status = 'active' 
                AND date(subscription_expiry) = date('now', '+' || ? || ' days')
            `).all(days);
            
            log(`Checking expiring subscriptions for +${days} days. Found ${users.length} users.`, 'DEBUG');

            for (const user of users) {
                // Avoid duplicate notifications if already sent today (optional optimization)
                // For now, NotificationService handles creation
                
                NotificationService.create({
                    userId: user.id,
                    type: 'subscription_expiring',
                    title: 'Renouvellement de votre abonnement',
                    message: `Votre abonnement expire dans ${days} jour(s). Renouvelez maintenant pour éviter toute interruption.`,
                    metadata: { days_remaining: days, expiry: user.subscription_expiry }
                });
                
                log(`Sent expiry warning (${days} days) to ${user.email}`, 'CRON');
            }
        }
    }

    /**
     * Check for low credits (< 10% of plan limit)
     */
    async checkLowCredits() {
        // Find users with active plans and low credits (< 10% of total allocation)
        // We exclude admins as they have unlimited credits
        // message_limit is the remaining balance
        // message_used is the total used
        // Total allocation = message_limit + message_used
        const users = db.prepare(`
            SELECT * FROM users 
            WHERE plan_status = 'active' 
            AND role != 'admin'
            AND message_limit > 0 
            AND message_limit < ((message_limit + message_used) * 0.1)
        `).all();

        log(`Checking low credits. Found ${users.length} users.`, 'DEBUG');

        for (const user of users) {
            const remaining = user.message_limit;
            const total = remaining + user.message_used;
            const percentage = total > 0 ? (remaining / total) * 100 : 0;

            // Check if we already notified recently? 
            // Query user_notifications for recent 'credit_low'
            const recentNotif = db.prepare(`
                SELECT * FROM user_notifications 
                WHERE user_id = ? 
                AND type = 'credit_low' 
                AND created_at > datetime('now', '-1 day')
            `).get(user.id);

            if (!recentNotif) {
                NotificationService.create({
                    userId: user.id,
                    type: 'credit_low',
                    title: 'Crédits faibles',
                    message: `Il ne vous reste que ${remaining} crédits (${percentage.toFixed(1)}%). Rechargez votre compte.`,
                    metadata: { remaining, percentage }
                });
                log(`Sent low credit warning to ${user.email}`, 'CRON');
            }
        }
    }

    /**
     * Process auto-renewals (placeholder for now)
     */
    async processRenewals() {
        // Find expired subscriptions that have auto-renewal enabled (if we had that flag)
        // For now, we just mark expired users as 'expired' if they passed the date
        
        const expiredUsers = db.prepare(`
            SELECT * FROM users 
            WHERE plan_status IN ('active', 'trialing') 
            AND subscription_expiry < datetime('now')
        `).all();

        for (const user of expiredUsers) {
            try {
                // Cancel/Expire subscription
                // We use SubscriptionService to handle logic
                await SubscriptionService.cancel(user.id);
                
                log(`Expired subscription for ${user.email}`, 'CRON');
            } catch (err) {
                log(`Failed to expire subscription for ${user.email}: ${err.message}`, 'CRON', null, 'ERROR');
            }
        }
    }
}

module.exports = new Scheduler();
