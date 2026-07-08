/**
 * MoneyFusion Payment Service
 *
 * Provider: MoneyFusion (FusionPay)
 * Docs: https://docs.moneyfusion.net/
 *
 * Flow:
 *   1. createCheckoutSession() → POST to MoneyFusion API → get { token, url }
 *   2. Redirect user to url (checkout page)
 *   3. MoneyFusion sends webhook to /api/v1/payments/moneyfusion/webhook
 *   4. handleWebhook() processes event, activates subscription on payin.session.completed
 *   5. User redirected to return_url (billing page) — we pass ?payment=moneyfusion&order=ORDER_ID
 *
 * Security notes:
 *   - MoneyFusion does NOT sign webhooks with HMAC.
 *   - Correlation relies on tokenPay uniqueness + personal_Info orderId match.
 *   - MoneyFusion may send duplicate webhooks — dedup via tokenPay + stored status.
 *   - The MONEYFUSION_API_URL is a secret per-merchant URL from the dashboard.
 */

const crypto = require('crypto');
const db = require('../db/query');
const { log } = require('../utils/logger');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const SubscriptionService = require('./SubscriptionService');
const PricingService = require('./PricingService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMoneyFusionApiUrl() {
    const url = (process.env.MONEYFUSION_API_URL || '').replace(/\/$/, '');
    if (!url) throw new Error('MONEYFUSION_API_URL non configuré');
    return url;
}

function getFrontendBaseUrl() {
    return (process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/$/, '');
}

function getAppBaseUrl() {
    return (process.env.APP_URL || process.env.FRONTEND_URL || '').replace(/\/$/, '');
}

function buildBillingReturnUrl(orderId) {
    const base = getFrontendBaseUrl();
    if (!base) throw new Error('FRONTEND_URL requis');
    return `${base}/dashboard/billing?payment=moneyfusion&order=${orderId}`;
}

/**
 * MoneyFusion status → Whappi internal status.
 *
 * MoneyFusion status check values: pending | paid | failure | no paid
 * Webhook events:                payin.session.pending | payin.session.completed | payin.session.cancelled
 */
function normalizeProviderStatus(status) {
    const value = String(status || '').toLowerCase().replace(/_/g, ' ');
    if (['paid', 'completed', 'success', 'succeeded'].includes(value)) return 'completed';
    if (['failure', 'failed', 'error'].includes(value)) return 'failed';
    if (['cancelled', 'canceled', 'no paid'].includes(value)) return 'cancelled';
    return 'pending';
}

/**
 * Map a webhook event name to our canonical status.
 * Returns null if the event is unknown.
 */
function normalizeWebhookEvent(event) {
    const e = String(event || '').toLowerCase().trim();
    if (e === 'payin.session.completed') return 'completed';
    if (e === 'payin.session.cancelled') return 'cancelled';
    if (e === 'payin.session.pending') return 'pending';
    return null;
}

function normalizeProviderToken(value) {
    const token = String(value || '').trim();
    return token || null;
}

// ---------------------------------------------------------------------------
// Transaction persistence
// ---------------------------------------------------------------------------

async function saveTransaction({
    id,
    providerToken,
    userId,
    planId,
    amount,
    currency = 'XOF',
    status,
    checkoutUrl = null,
    providerPayload = null,
}) {
    const payload = providerPayload ? JSON.stringify(providerPayload) : null;
    const normalizedToken = normalizeProviderToken(providerToken);

    const existing = await db.get(
        'SELECT * FROM payment_transactions WHERE id = $1 OR provider_token = $2',
        [id, normalizedToken]
    );

    if (existing) {
        await db.run(`
            UPDATE payment_transactions
            SET provider = 'moneyfusion',
                provider_token = COALESCE($1, provider_token),
                user_id = COALESCE($2, user_id),
                plan_id = COALESCE($3, plan_id),
                amount = COALESCE($4, amount),
                currency = COALESCE($5, currency),
                status = $6,
                checkout_url = COALESCE($7, checkout_url),
                provider_payload = COALESCE($8, provider_payload),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
        `, [normalizedToken, userId, planId, amount, currency, status, checkoutUrl, payload, existing.id]);
        return existing.id;
    }

    await db.run(`
        INSERT INTO payment_transactions (
            id, provider, provider_token, user_id, plan_id, amount, currency, status, checkout_url, provider_payload
        )
        VALUES ($1, 'moneyfusion', $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, normalizedToken, userId, planId, amount, currency, status, checkoutUrl, payload]);

    return id;
}

// ---------------------------------------------------------------------------
// Create checkout session
// ---------------------------------------------------------------------------

async function createCheckoutSession(user, planCode, { phoneNumber, customerName } = {}) {
    const apiUrl = getMoneyFusionApiUrl();
    const plan = await PricingService.getPlanByCode(planCode);
    if (!plan) throw new Error('Plan invalide');

    const orderId = crypto.randomUUID();

    // Build the request body per MoneyFusion API spec
    const body = {
        totalPrice: Number(plan.price),
        article: [
            {
                name: `Abonnement Whappi ${plan.name}`,
                price: Number(plan.price),
                quantity: 1,
            },
        ],
        numeroSend: String(phoneNumber || user.phone || user.whatsapp_number || '').trim(),
        nomclient: String(customerName || user.name || user.email || 'Client Whappi').trim(),
        personal_Info: [
            {
                userId: user.id,
                orderId: orderId,
                planCode: plan.code,
                planId: plan.id,
            },
        ],
        return_url: buildBillingReturnUrl(orderId),
        webhook_url: `${getAppBaseUrl()}/api/v1/payments/moneyfusion/webhook`,
    };

    // Persist initial transaction (pre-creation, no provider token yet)
    await saveTransaction({
        id: orderId,
        userId: user.id,
        planId: plan.id,
        amount: Number(plan.price),
        currency: 'XOF',
        status: 'created',
        providerPayload: { request: body },
    });

    // Call MoneyFusion API
    let response;
    try {
        response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        });
    } catch (fetchError) {
        // Mark transaction as failed on network error
        await saveTransaction({
            id: orderId,
            userId: user.id,
            planId: plan.id,
            amount: Number(plan.price),
            currency: 'XOF',
            status: 'failed',
            providerPayload: { request: body, error: fetchError.message },
        });
        throw new Error(`MoneyFusion inaccessible: ${fetchError.message}`);
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok || !payload?.statut || !payload?.token || !payload?.url) {
        const errorMsg = payload?.message || `MoneyFusion a retourné HTTP ${response.status}`;
        await saveTransaction({
            id: orderId,
            userId: user.id,
            planId: plan.id,
            amount: Number(plan.price),
            currency: 'XOF',
            status: 'failed',
            providerPayload: { request: body, response: payload, error: errorMsg },
        });
        throw new Error(errorMsg);
    }

    const checkoutUrl = payload.url;
    const providerToken = String(payload.token);

    await saveTransaction({
        id: orderId,
        providerToken,
        userId: user.id,
        planId: plan.id,
        amount: Number(plan.price),
        currency: 'XOF',
        status: 'pending',
        checkoutUrl,
        providerPayload: { request: body, response: payload },
    });

    log(`MoneyFusion checkout créé pour ${user.email}`, 'PAYMENT', {
        orderId,
        planCode,
        token: providerToken,
    }, 'INFO');

    return {
        provider: 'moneyfusion',
        orderId,
        reference: providerToken,
        url: checkoutUrl,
        status: 'pending',
    };
}

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------

/**
 * Handle an incoming MoneyFusion webhook.
 *
 * MoneyFusion does NOT sign webhooks, so security relies on:
 *   1. Secrecy of the webhook URL
 *   2. Correlation of tokenPay against our stored provider_token
 *   3. Matching personal_Info.orderId against our stored transaction id
 *
 * @param {Buffer|string} rawPayload - Raw HTTP body
 * @returns {Promise<{success: boolean, action: string, status?: string, reference?: string}>}
 */
async function handleWebhook(rawPayload) {
    const parsed = JSON.parse(rawPayload.toString('utf8'));
    const event = String(parsed.event || '').toLowerCase().trim();
    const normalizedEvent = normalizeWebhookEvent(event);

    if (!normalizedEvent) {
        log(`MoneyFusion webhook: event inconnu "${event}"`, 'PAYMENT', { event }, 'WARN');
        return { success: true, action: 'ignored_unknown_event', event };
    }

    // Extract correlation data from the webhook payload
    const { tokenPay, personal_Info: rawPersonalInfo, Montant, statut, numeroTransaction } = parsed;
    const personalInfo = Array.isArray(rawPersonalInfo) && rawPersonalInfo.length > 0
        ? rawPersonalInfo[0]
        : {};
    const orderId = normalizeProviderToken(personalInfo.orderId);
    const providerToken = normalizeProviderToken(tokenPay);

    // Try to find the matching transaction
    let existing = null;
    if (orderId || providerToken) {
        existing = await db.get(
            'SELECT * FROM payment_transactions WHERE id = $1 OR provider_token = $2',
            [orderId || null, providerToken || null]
        );
    }

    const existingPayload = existing?.provider_payload
        ? (typeof existing.provider_payload === 'string'
            ? JSON.parse(existing.provider_payload)
            : existing.provider_payload)
        : {};
    const requestPersonalInfo = existingPayload?.request?.personal_Info?.[0] || {};

    const userId = personalInfo.userId
        || existing?.user_id
        || requestPersonalInfo.userId
        || null;

    const planCode = personalInfo.planCode
        || requestPersonalInfo.planCode
        || null;

    const planId = personalInfo.planId
        || existing?.plan_id
        || requestPersonalInfo.planId
        || null;

    const amount = Number(Montant || existing?.amount || 0);
    const canonicalOrderId = orderId || existing?.id || null;

    // Derive the canonical status from the event first, then fall back to statut field
    const computedStatus = normalizedEvent === 'completed' ? 'completed'
        : normalizedEvent === 'cancelled' ? 'cancelled'
        : normalizeProviderStatus(statut || normalizedEvent);

    // If we can't correlate at all, log and return
    if (!canonicalOrderId && !providerToken && !userId) {
        log('MoneyFusion webhook: payload non corrélable — ignoré', 'PAYMENT', {
            event,
            tokenPay,
            personalInfo,
        }, 'WARN');
        return { success: true, action: 'ignored_unmatched', status: computedStatus };
    }

    // Persist the webhook update
    const resolvedId = canonicalOrderId || buildUnmatchedTransactionId(providerToken, rawPayload);
    await saveTransaction({
        id: resolvedId,
        providerToken,
        userId,
        planId,
        amount,
        currency: 'XOF',
        status: computedStatus,
        checkoutUrl: existing?.checkout_url || null,
        providerPayload: parsed,
    });

    // ── Non-terminal statuses ───────────────────────────────────────────
    if (computedStatus !== 'completed') {
        log(`MoneyFusion webhook: statut ${computedStatus} pour transaction ${resolvedId}`, 'PAYMENT', {
            orderId: canonicalOrderId,
            token: providerToken,
            event,
            numeroTransaction: numeroTransaction || null,
        }, 'INFO');
        return { success: true, action: 'status_updated', status: computedStatus, reference: providerToken };
    }

    // ── Duplicate detection ─────────────────────────────────────────────
    if (existing?.status === 'completed') {
        log(`MoneyFusion webhook: doublon ignoré pour ${resolvedId}`, 'PAYMENT', {
            orderId: canonicalOrderId,
            token: providerToken,
        }, 'INFO');
        return { success: true, action: 'ignored_duplicate', status: 'completed', reference: providerToken };
    }

    // ── Resolve user ────────────────────────────────────────────────────
    const user = (userId && await User.findById(userId))
        || (personalInfo.userEmail && await User.findByEmail(personalInfo.userEmail));
    if (!user) {
        await flagForAdminReview(resolvedId, providerToken, userId, planId, amount, parsed,
            `Utilisateur introuvable (userId=${userId})`);
        log('MoneyFusion: utilisateur introuvable', 'PAYMENT', {
            orderId: canonicalOrderId,
            token: providerToken,
            userId,
            personalInfo,
        }, 'ERROR');
        return { success: true, action: 'needs_admin_review_user_missing', status: 'needs_review', reference: providerToken };
    }

    // ── Resolve plan ────────────────────────────────────────────────────
    const plan = (planCode && await PricingService.getPlanByCode(planCode))
        || (planId && await PricingService.getPlan(planId));
    if (!plan) {
        await flagForAdminReview(resolvedId, providerToken, user.id, planId, amount, parsed,
            `Plan introuvable (code=${planCode}, id=${planId})`);
        log('MoneyFusion: plan introuvable', 'PAYMENT', {
            orderId: canonicalOrderId,
            token: providerToken,
            planId,
            planCode,
            userEmail: user.email,
        }, 'ERROR');
        return { success: true, action: 'needs_admin_review_plan_missing', status: 'needs_review', reference: providerToken };
    }

    // ── Amount check ────────────────────────────────────────────────────
    if (amount && amount < Number(plan.price)) {
        await flagForAdminReview(resolvedId, providerToken, user.id, plan.id, amount, parsed,
            `Montant insuffisant: ${amount} < ${plan.price}`);
        log('MoneyFusion: montant insuffisant', 'PAYMENT', {
            orderId: canonicalOrderId,
            amount,
            expected: plan.price,
            planCode: plan.code,
            userEmail: user.email,
        }, 'ERROR');
        return { success: true, action: 'needs_admin_review_amount_mismatch', status: 'needs_review', reference: providerToken };
    }

    // ── Activate! ───────────────────────────────────────────────────────
    await SubscriptionService.subscribe(user.id, plan.code);

    log(`MoneyFusion: abonnement ${plan.code} activé pour ${user.email}`, 'PAYMENT', {
        orderId: canonicalOrderId,
        reference: providerToken,
        planCode: plan.code,
        event,
        numeroTransaction: numeroTransaction || null,
    }, 'INFO');

    ActivityLog.log({
        userEmail: user.email,
        action: 'MONEYFUSION_PAYMENT_COMPLETED',
        resource: 'subscription',
        resourceId: plan.code,
        success: true,
        details: {
            orderId: canonicalOrderId,
            reference: providerToken,
            amount,
            event,
            numeroTransaction: numeroTransaction || null,
        },
    });

    return {
        success: true,
        action: 'subscription_activated',
        status: 'completed',
        reference: providerToken,
        user: user.email,
    };
}

/**
 * Flag a transaction for admin review when automatic activation cannot proceed.
 */
async function flagForAdminReview(transactionId, providerToken, userId, planId, amount, parsedPayload, reason) {
    await saveTransaction({
        id: transactionId,
        providerToken,
        userId,
        planId,
        amount,
        currency: 'XOF',
        status: 'needs_review',
        checkoutUrl: null,
        providerPayload: { webhook: parsedPayload, review_reason: reason },
    });
}

/**
 * Build a synthetic transaction ID for webhooks that arrive for an unknown order.
 */
function buildUnmatchedTransactionId(providerToken, rawPayload) {
    const safeToken = String(providerToken || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    if (safeToken) return `moneyfusion_unmatched_${safeToken}`;
    const hash = crypto.createHash('sha256')
        .update(Buffer.from(String(rawPayload || '')))
        .digest('hex')
        .slice(0, 32);
    return `moneyfusion_unmatched_${hash}`;
}

// ---------------------------------------------------------------------------
// Payment status lookup
// ---------------------------------------------------------------------------

async function getPaymentStatusForUser(userId, orderId) {
    if (!orderId) throw new Error('orderId requis');

    const transaction = await db.get(`
        SELECT t.*, p.code as plan_code, p.name as plan_name
        FROM payment_transactions t
        LEFT JOIN pricing_plans p ON p.id = t.plan_id
        WHERE t.id = $1
    `, [orderId]);

    if (!transaction) {
        return { found: false, orderId, status: 'unknown' };
    }

    if (transaction.user_id && userId && transaction.user_id !== userId) {
        throw new Error('Accès non autorisé à cette transaction');
    }

    return {
        found: true,
        orderId: transaction.id,
        reference: transaction.provider_token || null,
        provider: transaction.provider,
        status: transaction.status || 'unknown',
        planId: transaction.plan_id || null,
        planCode: transaction.plan_code || null,
        planName: transaction.plan_name || null,
        checkoutUrl: transaction.checkout_url || null,
        updatedAt: transaction.updated_at || transaction.created_at || null,
        createdAt: transaction.created_at || null,
    };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    createCheckoutSession,
    handleWebhook,
    getPaymentStatusForUser,
};
