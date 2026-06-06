const { db } = require('../config/database');
const { log } = require('../utils/logger');
const NotificationService = require('../services/NotificationService');
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
            await this.checkScheduledMaintenance();
            await this.checkLowCredits();
            await this.processRenewals();
        } catch (error) {
            log(`Scheduler error: ${error.message}`, 'SYSTEM', null, 'ERROR');
        }
    }

    async checkExpiringSubscriptions() {
        const daysToCheck = [7, 3, 1, 0];

        for (const days of daysToCheck) {
            const users = db.prepare(`
                SELECT * FROM users
                WHERE plan_status = 'active'
                AND date(subscription_expiry) = date('now', '+' || ? || ' days')
                AND NOT EXISTS (
                    SELECT 1 FROM user_notifications n
                    WHERE n.user_id = users.id
                    AND n.type = 'subscription_expiring'
                    AND n.metadata LIKE ?
                    AND date(n.created_at) = date('now')
                )
            `).all(days, `%"days_remaining":${days}%`);

            log(`Checking expiring subscriptions for +${days} days. Found ${users.length} users.`, 'DEBUG');

            for (const user of users) {
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

    async checkLowCredits() {
        const users = db.prepare(`
            SELECT u.* FROM users u
            WHERE u.plan_status = 'active'
            AND u.role != 'admin'
            AND u.message_limit > 0
            AND u.message_limit < ((u.message_limit + u.message_used) * 0.1)
            AND NOT EXISTS (
                SELECT 1 FROM user_notifications n
                WHERE n.user_id = u.id
                AND n.type = 'credit_low'
                AND n.created_at > datetime('now', '-1 day')
            )
        `).all();

        log(`Checking low credits. Found ${users.length} users.`, 'DEBUG');

        for (const user of users) {
            const remaining = user.message_limit;
            const total = remaining + user.message_used;
            const percentage = total > 0 ? (remaining / total) * 100 : 0;

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

    async processRenewals() {
        const expiredUsers = db.prepare(`
            SELECT * FROM users
            WHERE plan_status IN ('active', 'trialing')
            AND subscription_expiry < datetime('now')
        `).all();

        await Promise.all(expiredUsers.map(async (user) => {
            try {
                await SubscriptionService.expire(user.id);
                log(`Expired subscription for ${user.email}`, 'CRON');
            } catch (err) {
                log(`Failed to expire subscription for ${user.email}: ${err.message}`, 'CRON', null, 'ERROR');
            }
        }));
    }

    async checkScheduledMaintenance() {
        try {
            const settings = db.prepare('SELECT * FROM maintenance_settings WHERE id = 1').get();
            if (!settings) return;

            const now = new Date().toISOString();

            if (!settings.enabled && settings.scheduled_start_at && settings.scheduled_start_at <= now) {
                if (settings.scheduled_end_at && settings.scheduled_end_at <= now) {
                    db.prepare(`
                        UPDATE maintenance_settings SET
                            scheduled_start_at = NULL,
                            scheduled_end_at = NULL,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = 1
                    `).run();
                    log('Maintenance schedule expired, cleared', 'CRON');
                    return;
                }

                db.prepare(`
                    UPDATE maintenance_settings SET
                        enabled = 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = 1
                `).run();
                log('Maintenance auto-activated from schedule', 'CRON');
            }

            if (settings.enabled && settings.scheduled_end_at && settings.scheduled_end_at <= now) {
                db.prepare(`
                    UPDATE maintenance_settings SET
                        enabled = 0,
                        scheduled_start_at = NULL,
                        scheduled_end_at = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = 1
                `).run();
                log('Maintenance auto-deactivated: end time reached', 'CRON');
            }
        } catch (error) {
            log('Maintenance scheduler error: ' + error.message, 'SYSTEM', null, 'ERROR');
        }
    }
}

module.exports = new Scheduler();
