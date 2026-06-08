const db = require('../db/query');
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
        const plan = await PricingService.getPlanByCode(planCode);
        if (!plan) throw new Error('Plan not found');

        const existingSub = await this.getCurrentSubscription(userId);
        if (existingSub) {
            await db.run(`
                UPDATE subscriptions
                SET status = 'canceled', cancel_at_period_end = 0, updated_at = NOW()
                WHERE id = $1
            `, [existingSub.id]);
        }

        const subId = crypto.randomUUID();
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await db.run(`
            INSERT INTO subscriptions (
                id, user_id, plan_id, status,
                current_period_start, current_period_end
            )
            VALUES ($1, $2, $3, 'active', $4, $5)
        `, [subId, userId, plan.id, now.toISOString(), periodEnd.toISOString()]);

        await db.run(`
            UPDATE users
            SET plan_id = $1, plan_status = $2, subscription_expiry = $3
            WHERE id = $4
        `, [plan.id, 'active', periodEnd.toISOString(), userId]);

        await CreditService.resetMonthlyCredits(userId, plan.message_limit);

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
    static async getCurrentSubscription(userId) {
        return await db.get(`
            SELECT s.*, p.name as plan_name, p.code as plan_code, p.message_limit
            FROM subscriptions s
            JOIN pricing_plans p ON s.plan_id = p.id
            WHERE s.user_id = $1 AND s.status = 'active'
            ORDER BY s.created_at DESC
            LIMIT 1
        `, [userId]);
    }

    /**
     * Cancel subscription and stop access at account level.
     */
    static async cancel(userId) {
        const sub = await this.getCurrentSubscription(userId);

        if (sub) {
            await db.run(`
                UPDATE subscriptions
                SET status = 'canceled', cancel_at_period_end = 1, updated_at = NOW()
                WHERE id = $1
            `, [sub.id]);
        }

        await db.run(`
            UPDATE users
            SET plan_status = 'canceled', message_limit = 0
            WHERE id = $1
        `, [userId]);

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
    static async checkExpirations() {
        const now = new Date();
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(now.getDate() + 3);

        const expiring = await db.all(`
            SELECT s.*, u.email
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'active'
            AND s.current_period_end BETWEEN $1 AND $2
        `, [now.toISOString(), threeDaysFromNow.toISOString()]);

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
        const sub = await this.getCurrentSubscription(userId);

        if (sub) {
            await db.run(`
                UPDATE subscriptions
                SET status = 'expired', updated_at = NOW()
                WHERE id = $1
            `, [sub.id]);
        }

        await db.run(`
            UPDATE users
            SET plan_status = 'expired', message_limit = 0
            WHERE id = $1
        `, [userId]);

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
