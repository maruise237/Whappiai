const crypto = require('crypto');
const db = require('../db/query');
const { log } = require('../utils/logger');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const SubscriptionService = require('./SubscriptionService');
const PricingService = require('./PricingService');

function getGeniusPayBaseUrl() {
    return (process.env.GENIUSPAY_BASE_URL || 'http://pay.genius.ci/api/v1/merchant').replace(/\/$/, '');
}

function getFrontendBaseUrl() {
    return (process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/$/, '');
}

function getGeniusPayHeaders() {
    const apiKey = process.env.GENIUSPAY_API_KEY;
    const apiSecret = process.env.GENIUSPAY_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error('GENIUSPAY_API_KEY ou GENIUSPAY_API_SECRET non configure');
    }

    return {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
        'Content-Type': 'application/json',
    };
}

function buildBillingRedirectUrl(status, orderId) {
    const base = getFrontendBaseUrl();
    if (!base) throw new Error('FRONTEND_URL requis pour GeniusPay');

    const url = new URL('/dashboard/billing', base);
    url.searchParams.set('payment', 'geniuspay');
    url.searchParams.set('status', status);
    if (orderId) url.searchParams.set('order', orderId);
    return url.toString();
}

function normalizeProviderStatus(status) {
    const value = String(status || '').toLowerCase();
    if (['completed', 'success', 'succeeded', 'paid'].includes(value)) return 'completed';
    if (['failed', 'failure', 'error'].includes(value)) return 'failed';
    if (['cancelled', 'canceled'].includes(value)) return 'cancelled';
    return 'pending';
}

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

    const existing = await db.get(
        'SELECT * FROM payment_transactions WHERE id = $1 OR provider_token = $2',
        [id, providerToken || null]
    );

    if (existing) {
        await db.run(`
            UPDATE payment_transactions
            SET provider = 'geniuspay',
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
        `, [providerToken, userId, planId, amount, currency, status, checkoutUrl, payload, existing.id]);
        return existing.id;
    }

    await db.run(`
        INSERT INTO payment_transactions (
            id, provider, provider_token, user_id, plan_id, amount, currency, status, checkout_url, provider_payload
        )
        VALUES ($1, 'geniuspay', $2, $3, $4, $5, $6, $7, $8, $9)
    `, [id, providerToken, userId, planId, amount, currency, status, checkoutUrl, payload]);

    return id;
}

async function createCheckoutSession(user, planCode, { phoneNumber, customerName } = {}) {
    const plan = await PricingService.getPlanByCode(planCode);
    if (!plan) throw new Error('Plan invalide');

    const orderId = crypto.randomUUID();
    const body = {
        amount: Number(plan.price),
        currency: 'XOF',
        description: `Abonnement Whappi ${plan.name}`,
        customer: {
            name: String(customerName || user.name || user.email || 'Client Whappi').trim(),
            email: user.email,
        },
        success_url: buildBillingRedirectUrl('success', orderId),
        error_url: buildBillingRedirectUrl('error', orderId),
        metadata: {
            order_id: orderId,
            user_id: user.id,
            user_email: user.email,
            plan_id: plan.id,
            plan_code: plan.code,
        },
    };

    const cleanPhone = String(phoneNumber || user.phone || user.whatsapp_number || '').trim();
    if (cleanPhone) body.customer.phone = cleanPhone;

    await saveTransaction({
        id: orderId,
        userId: user.id,
        planId: plan.id,
        amount: Number(plan.price),
        currency: 'XOF',
        status: 'created',
        providerPayload: { request: body },
    });

    const response = await fetch(`${getGeniusPayBaseUrl()}/payments`, {
        method: 'POST',
        headers: getGeniusPayHeaders(),
        body: JSON.stringify(body),
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.message || 'GeniusPay a refuse la creation du paiement');
    }

    const checkoutUrl = payload.data.checkout_url || payload.data.payment_url;
    if (!checkoutUrl) {
        throw new Error('GeniusPay n\'a retourne aucune URL de checkout');
    }

    const providerToken = payload.data.reference || String(payload.data.id || '');
    const normalizedStatus = normalizeProviderStatus(payload.data.status);

    await saveTransaction({
        id: orderId,
        providerToken,
        userId: user.id,
        planId: plan.id,
        amount: Number(plan.price),
        currency: payload.data.currency || 'XOF',
        status: normalizedStatus,
        checkoutUrl,
        providerPayload: { request: body, response: payload.data },
    });

    log(`GeniusPay checkout created for ${user.email}`, 'PAYMENT', { orderId, planCode, reference: providerToken }, 'INFO');

    return {
        provider: 'geniuspay',
        orderId,
        reference: providerToken,
        url: checkoutUrl,
        status: normalizedStatus,
    };
}

function verifyWebhookSignature(rawPayload, signature) {
    const secret = process.env.GENIUSPAY_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error('GENIUSPAY_WEBHOOK_SECRET non configure');
    }

    if (!signature) return false;

    const expected = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    if (signature.length !== expected.length) return false;

    try {
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
        return false;
    }
}

async function handleWebhook(rawPayload, headers = {}) {
    const signature = headers['x-geniuspay-signature'];
    if (!verifyWebhookSignature(rawPayload, signature)) {
        throw new Error('Invalid GeniusPay signature');
    }

    const parsed = JSON.parse(rawPayload.toString('utf8'));
    const event = String(parsed.event || headers['x-geniuspay-event'] || '').toLowerCase();
    const transaction = parsed.data?.transaction || {};
    const metadata = transaction.metadata || {};
    const status = normalizeProviderStatus(transaction.status || (event === 'payment.success' ? 'completed' : 'pending'));
    const orderId = metadata.order_id || crypto.randomUUID();
    const providerToken = transaction.reference || String(transaction.id || '');

    const existing = await db.get(
        'SELECT * FROM payment_transactions WHERE id = $1 OR provider_token = $2',
        [orderId, providerToken || null]
    );
    const existingPayload = existing?.provider_payload ? JSON.parse(existing.provider_payload) : {};
    const planId = metadata.plan_id || existing?.plan_id || existingPayload?.request?.metadata?.plan_id || null;
    const planCode = metadata.plan_code || existingPayload?.request?.metadata?.plan_code || null;
    const userId = metadata.user_id || existing?.user_id || existingPayload?.request?.metadata?.user_id || null;
    const amount = Number(transaction.amount || existing?.amount || 0);

    await saveTransaction({
        id: orderId,
        providerToken,
        userId,
        planId,
        amount,
        currency: transaction.currency || existing?.currency || 'XOF',
        status,
        checkoutUrl: existing?.checkout_url || null,
        providerPayload: parsed,
    });

    if (status !== 'completed') {
        return { success: true, action: 'status_updated', status, reference: providerToken };
    }

    if (existing?.status === 'completed') {
        return { success: true, action: 'ignored_duplicate', status, reference: providerToken };
    }

    const user = (userId && await User.findById(userId))
        || (metadata.user_email && await User.findByEmail(metadata.user_email))
        || (transaction.customer?.email && await User.findByEmail(transaction.customer.email));
    if (!user) throw new Error('Utilisateur GeniusPay introuvable');

    const plan = (planCode && await PricingService.getPlanByCode(planCode))
        || (planId && await PricingService.getPlan(planId));
    if (!plan) throw new Error('Plan GeniusPay introuvable');

    if (amount && amount < Number(plan.price)) {
        throw new Error(`Montant GeniusPay insuffisant: ${amount} < ${plan.price}`);
    }

    await SubscriptionService.subscribe(user.id, plan.code);

    ActivityLog.log({
        userEmail: user.email,
        action: 'GENIUSPAY_PAYMENT_COMPLETED',
        resource: 'subscription',
        resourceId: plan.code,
        success: true,
        details: {
            orderId,
            reference: providerToken,
            amount,
            event,
        }
    });

    return { success: true, action: 'subscription_activated', status, reference: providerToken, user: user.email };
}

module.exports = {
    createCheckoutSession,
    handleWebhook,
    verifyWebhookSignature,
};
