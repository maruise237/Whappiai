const { db } = require('../config/database');
const crypto = require('crypto');
const { log } = require('../utils/logger');
const PricingService = require('./PricingService');
const CreditService = require('./CreditService');
const NotificationService = require('./NotificationService');

class SubscriptionService {
    /**
     * Subscribe user to a plan.
     */
    static async subscribe(userId, planCode) {
        const plan = PricingService.getPlanByCode(planCode);
        if (!plan) throw new Error('Plan not found');

        const existingSub = this.getCurrentSubscription(userId);
        if (existingSub) {
            db.prepare(`
                UPDATE subscriptions
                SET status = 'canceled', cancel_at_period_end = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(existingSub.id);
        }

        const subId = crypto.randomUUID();
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        db.prepare(`
            INSERT INTO subscriptions (
                id, user_id, plan_id, status,
                current_period_start, current_period_end
            )
            VALUES (?, ?, ?, 'active', ?, ?)
        `).run(subId, userId, plan.id, now.toISOString(), periodEnd.toISOString());

        db.prepare(`
            UPDATE users
            SET plan_id = ?, plan_status = ?, subscription_expiry = ?
            WHERE id = ?
        `).run(plan.id, 'active', periodEnd.toISOString(), userId);

        CreditService.resetMonthlyCredits(userId, plan.message_limit);

        NotificationService.create({
            userId,
            type: 'subscription_started',
            title: 'Abonnement active',
            message: `Votre abonnement ${plan.name} est maintenant actif.`
        });

        return subId;
    }

    /**
     * Get current active subscription for a user.
     */
    static getCurrentSubscription(userId) {
        return db.prepare(`
            SELECT s.*, p.name as plan_name, p.code as plan_code, p.message_limit
            FROM subscriptions s
            JOIN pricing_plans p ON s.plan_id = p.id
            WHERE s.user_id = ? AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
        `).get(userId);
    }

    /**
     * Cancel subscription and stop access at account level.
     */
    static async cancel(userId) {
        const sub = this.getCurrentSubscription(userId);

        if (sub) {
            db.prepare(`
                UPDATE subscriptions
                SET status = 'canceled', cancel_at_period_end = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(sub.id);
        }

        db.prepare(`
            UPDATE users
            SET plan_status = 'canceled', message_limit = 0
            WHERE id = ?
        `).run(userId);

        NotificationService.create({
            userId,
            type: 'subscription_canceled',
            title: 'Abonnement annule',
            message: sub ? `Votre abonnement ${sub.plan_name} a ete annule.` : 'Votre acces Whappi a ete annule.'
        });

        return true;
    }

    /**
     * Check for expiring subscriptions.
     */
    static checkExpirations() {
        const now = new Date();
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(now.getDate() + 3);

        const expiring = db.prepare(`
            SELECT s.*, u.email
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active'
            AND s.current_period_end BETWEEN ? AND ?
        `).all(now.toISOString(), threeDaysFromNow.toISOString());

        for (const sub of expiring) {
            NotificationService.createOncePerDay({
                userId: sub.user_id,
                type: 'subscription_expiring',
                title: 'Renouvellement imminent',
                message: `Votre abonnement expire le ${new Date(sub.current_period_end).toLocaleDateString('fr-FR')}.`,
                metadata: { dedupe_key: 'subscription_expiring_3d' }
            });
        }
    }

    /**
     * Expire subscription or trial and stop automations until renewal.
     */
    static async expire(userId) {
        const sub = this.getCurrentSubscription(userId);

        if (sub) {
            db.prepare(`
                UPDATE subscriptions
                SET status = 'expired', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(sub.id);
        }

        db.prepare(`
            UPDATE users
            SET plan_status = 'expired', message_limit = 0
            WHERE id = ?
        `).run(userId);

        NotificationService.createOncePerDay({
            userId,
            type: 'subscription_expired',
            title: 'Acces Whappi expire',
            message: 'Votre essai ou abonnement a expire. Renouvelez pour relancer les automatisations.',
            metadata: { dedupe_key: 'subscription_expired' }
        });

        return true;
    }
}

module.exports = SubscriptionService;
