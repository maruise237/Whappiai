const { db } = require('../config/database');
const crypto = require('crypto');
const { log } = require('../utils/logger');
const PricingService = require('./PricingService');
const CreditService = require('./CreditService');
const NotificationService = require('./NotificationService');

class SubscriptionService {
    /**
     * Subscribe user to a plan
     */
    static async subscribe(userId, planCode) {
        // 1. Get latest version of the plan
        const plan = PricingService.getPlanByCode(planCode);
        if (!plan) throw new Error('Plan not found');

        // 2. Cancel any existing active subscriptions
        const existingSub = this.getCurrentSubscription(userId);
        if (existingSub) {
            db.prepare(`
                UPDATE subscriptions 
                SET status = 'canceled', cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(existingSub.id);
        }

        // 3. Create Subscription Record
        const subId = crypto.randomUUID();
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1); // Default 1 month

        const stmt = db.prepare(`
            INSERT INTO subscriptions (
                id, user_id, plan_id, status, 
                current_period_start, current_period_end
            )
            VALUES (?, ?, ?, 'active', ?, ?)
        `);

        stmt.run(subId, userId, plan.id, now.toISOString(), periodEnd.toISOString());

        // 4. Update User Profile
        db.prepare('UPDATE users SET plan_id = ?, plan_status = ? WHERE id = ?')
          .run(plan.id, 'active', userId);

        // 5. Grant Credits
        CreditService.resetMonthlyCredits(userId, plan.message_limit);

        // 6. Send Notification
        NotificationService.create({
            userId,
            type: 'subscription_started',
            title: 'Abonnement activé',
            message: `Votre abonnement ${plan.name} est maintenant actif.`
        });

        return subId;
    }

    /**
     * Get current active subscription for a user
     */
    static getCurrentSubscription(userId) {
        const sub = db.prepare(`
            SELECT s.*, p.name as plan_name, p.code as plan_code, p.message_limit
            FROM subscriptions s
            JOIN pricing_plans p ON s.plan_id = p.id
            WHERE s.user_id = ? AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
        `).get(userId);
        
        return sub;
    }

    /**
     * Cancel subscription
     */
    static async cancel(userId) {
        const sub = this.getCurrentSubscription(userId);
        if (!sub) return false;

        // 1. Mark subscription as canceled
        db.prepare(`
            UPDATE subscriptions 
            SET status = 'canceled', cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(sub.id);

        // 2. Update User Profile to Free
        db.prepare('UPDATE users SET plan_id = ?, plan_status = ? WHERE id = ?')
          .run('free', 'expired', userId);

        // 3. Reset Credits to Free Tier
        CreditService.resetMonthlyCredits(userId, 100);

        // 4. Send Notification
        NotificationService.create({
            userId,
            type: 'subscription_canceled',
            title: 'Abonnement annulé',
            message: `Votre abonnement ${sub.plan_name} a été annulé.`
        });

        return true;
    }

    /**
     * Check for expiring subscriptions (Cron Job Candidate)
     */
    static checkExpirations() {
        const now = new Date();
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(now.getDate() + 3);

        // Find subs expiring in 3 days
        const expiring = db.prepare(`
            SELECT s.*, u.email 
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active' 
            AND s.current_period_end BETWEEN ? AND ?
        `).all(now.toISOString(), threeDaysFromNow.toISOString());

        for (const sub of expiring) {
            NotificationService.create({
                userId: sub.user_id,
                type: 'subscription_expiring',
                title: 'Renouvellement imminent',
                message: `Votre abonnement expire le ${new Date(sub.current_period_end).toLocaleDateString()}.`
            });
        }
    }

    /**
     * Expire subscription (force)
     */
    static async expire(userId) {
        const sub = this.getCurrentSubscription(userId);
        if (!sub) return false;

        db.prepare(`
            UPDATE subscriptions 
            SET status = 'expired' 
            WHERE id = ?
        `).run(sub.id);
        
        // Reset credits to free tier
        CreditService.resetMonthlyCredits(userId, 100); 

        return true;
    }
}

module.exports = SubscriptionService;
