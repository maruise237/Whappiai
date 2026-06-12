const db = require('../db/query');
const User = require('../models/User');
const NotificationService = require('./NotificationService');

const PLAN_LIMITS = {
    trial: { sessions: 1, groups: 1, scheduledMessages: 3 },
    free: { sessions: 0, groups: 0, scheduledMessages: 0 },
    starter: { sessions: 3, groups: 3, scheduledMessages: 3 },
    pro: { sessions: 6, groups: 6, scheduledMessages: Infinity },
    business: { sessions: 16, groups: 16, scheduledMessages: Infinity }
};

const BLOCK_MESSAGES = {
    account_inactive: "Votre compte est inactif. Contactez le support pour le reactiver.",
    subscription_expired: "Votre essai ou abonnement a expire. Choisissez un forfait pour relancer Whappi.",
    subscription_invalid: "Votre abonnement n'est plus actif. Choisissez un forfait pour continuer.",
    action_limit_reached: "Limite d'actions atteinte pour ce forfait. Passez au forfait superieur ou renouvelez.",
    session_limit_reached: "Limite de sessions atteinte pour ce forfait.",
    group_limit_reached: "Limite de groupes moderes atteinte pour ce forfait.",
    scheduled_limit_reached: "Limite de messages programmes atteinte pour ce forfait."
};

class AccountAccessService {
    static getPlanCode(planId) {
        const value = String(planId || 'trial').toLowerCase();
        if (value.includes('business') || value.includes('organisation') || value.includes('organization')) return 'business';
        if (value.includes('pro')) return 'pro';
        if (value.includes('starter')) return 'starter';
        if (value.includes('free')) return 'free';
        return 'trial';
    }

    static getEntitlements(planId) {
        const code = this.getPlanCode(planId);
        return {
            plan: code,
            ...(PLAN_LIMITS[code] || PLAN_LIMITS.trial)
        };
    }

    static isDateExpired(value) {
        if (!value) return false;
        const date = new Date(value);
        return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
    }

    static getStatus(user) {
        if (!user) {
            return { allowed: false, code: 'account_missing', message: "Compte introuvable." };
        }

        const plan = this.getPlanCode(user.plan_id);
        const status = String(user.plan_status || 'active').toLowerCase();
        const entitlements = this.getEntitlements(plan);

        if (user.role === 'admin') {
            return { allowed: true, code: 'admin', message: 'Admin', plan, status, entitlements };
        }

        if (user.is_active === 0) {
            return { allowed: false, code: 'account_inactive', message: BLOCK_MESSAGES.account_inactive, plan, status, entitlements };
        }

        if (['expired', 'revoked', 'canceled', 'cancelled'].includes(status) || this.isDateExpired(user.subscription_expiry)) {
            return { allowed: false, code: 'subscription_expired', message: BLOCK_MESSAGES.subscription_expired, plan, status: 'expired', entitlements };
        }

        if (!['active', 'trial', 'trialing'].includes(status)) {
            return { allowed: false, code: 'subscription_invalid', message: BLOCK_MESSAGES.subscription_invalid, plan, status, entitlements };
        }

        return { allowed: true, code: 'active', message: 'Acces actif', plan, status, entitlements };
    }

    static async canConsumeAction(userId, amount = 1) {
        const user = await User.findById(userId);
        const status = this.getStatus(user);

        if (!status.allowed) {
            if (user) this.notifyBlocked(user, status.code, status.message);
            return status;
        }

        if (user.role !== 'admin' && Number(user.message_limit || 0) < amount) {
            const blocked = {
                ...status,
                allowed: false,
                code: 'action_limit_reached',
                message: BLOCK_MESSAGES.action_limit_reached
            };
            this.notifyBlocked(user, blocked.code, blocked.message);
            return blocked;
        }

        return status;
    }

    static canCreateSession(user, currentCount) {
        const status = this.getStatus(user);
        if (!status.allowed) return status;
        if (user.role === 'admin') return status;

        const limit = status.entitlements.sessions;
        if (currentCount >= limit) {
            return {
                ...status,
                allowed: false,
                code: 'session_limit_reached',
                message: `${BLOCK_MESSAGES.session_limit_reached} Limite actuelle : ${limit}.`,
                limit,
                current: currentCount
            };
        }

        return { ...status, limit, current: currentCount };
    }

    static async canCreateScheduledTask(userId) {
        const user = await User.findById(userId);
        const status = this.getStatus(user);
        if (!status.allowed) return status;
        if (user.role === 'admin') return status;

        const limit = status.entitlements.scheduledMessages;
        if (!Number.isFinite(limit)) return { ...status, limit, current: await this.countActiveScheduledTasks(userId) };

        const current = await this.countActiveScheduledTasks(userId);
        if (current >= limit) {
            const blocked = {
                ...status,
                allowed: false,
                code: 'scheduled_limit_reached',
                message: `${BLOCK_MESSAGES.scheduled_limit_reached} Limite actuelle : ${limit}.`,
                limit,
                current
            };
            this.notifyBlocked(user, blocked.code, blocked.message);
            return blocked;
        }

        return { ...status, limit, current };
    }

    static async canManageModeratedGroup(userId, sessionId, groupId, nextSettings) {
        const user = await User.findById(userId);
        const status = this.getStatus(user);
        if (!status.allowed) return status;
        if (user.role === 'admin') return status;

        const limit = status.entitlements.groups;
        const current = await this.countManagedGroups(userId);
        const existing = await db.get(
            'SELECT * FROM group_settings WHERE group_id = $1 AND session_id = $2',
            [groupId, sessionId]
        );
        const wasActive = this.hasManagedGroupSettings(existing);
        const willBeActive = this.hasManagedGroupSettings(nextSettings);

        if (!willBeActive) {
            return { ...status, limit, current, wasActive, projected: current };
        }

        if (wasActive) {
            return { ...status, limit, current, wasActive, projected: current };
        }

        if (current >= limit) {
            const blocked = {
                ...status,
                allowed: false,
                code: 'group_limit_reached',
                message: `${BLOCK_MESSAGES.group_limit_reached} Limite actuelle : ${limit}.`,
                limit,
                current
            };
            this.notifyBlocked(user, blocked.code, blocked.message);
            return blocked;
        }

        return { ...status, limit, current, wasActive, projected: current + 1 };
    }

    static async countActiveScheduledTasks(userId) {
        const user = await User.findById(userId);
        if (!user?.email) return 0;

        const row = await db.get(`
            SELECT count(*) as count
            FROM group_engagement_tasks t
            JOIN whatsapp_sessions s ON s.id = t.session_id
            WHERE lower(s.owner_email) = lower($1)
            AND t.status IN ('pending', 'processing')
        `, [user.email]);

        return row?.count || 0;
    }

    static async countManagedGroups(userId) {
        const user = await User.findById(userId);
        if (!user?.email) return 0;

        const row = await db.get(`
            SELECT COUNT(*) as count
            FROM group_settings g
            JOIN whatsapp_sessions s ON s.id = g.session_id
            WHERE lower(s.owner_email) = lower($1)
            AND (
                COALESCE(g.is_active, 0) = 1
                OR COALESCE(g.anti_link, 0) = 1
                OR COALESCE(g.warnings_enabled, 0) = 1
                OR COALESCE(g.auto_kick_enabled, 0) = 1
                OR COALESCE(g.welcome_enabled, 0) = 1
                OR COALESCE(g.welcome_digest_enabled, 0) = 1
                OR COALESCE(g.ai_assistant_enabled, 0) = 1
                OR NULLIF(BTRIM(COALESCE(g.bad_words, '')), '') IS NOT NULL
            )
        `, [user.email]);

        return Number(row?.count || 0);
    }

    static hasManagedGroupSettings(settings) {
        if (!settings) return false;

        const badWords = String(
            settings.bad_words ??
            settings.banned_words ??
            settings.forbiddenWords ??
            ''
        ).trim();

        return Boolean(
            Number(settings.is_active || 0) ||
            Number(settings.anti_link || settings.anti_links_enabled || 0) ||
            Number(settings.warnings_enabled || settings.warningsEnabled || 0) ||
            Number(settings.auto_kick_enabled || settings.exclusionEnabled || 0) ||
            Number(settings.welcome_enabled || settings.welcomeEnabled || 0) ||
            Number(settings.welcome_digest_enabled || 0) ||
            Number(settings.ai_assistant_enabled || 0) ||
            badWords
        );
    }

    static notifyBlocked(user, reason, message) {
        NotificationService.createOncePerDay({
            userId: user.id,
            type: 'account_access_blocked',
            title: 'Action Whappi bloquee',
            message,
            metadata: { reason, plan: this.getPlanCode(user.plan_id), dedupe_key: reason }
        });
    }
}

module.exports = AccountAccessService;
