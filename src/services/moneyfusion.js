const axios = require('axios');
const crypto = require('crypto');
const db = require('../db/query');
const { log } = require('../utils/logger');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const PricingService = require('./PricingService');
const SubscriptionService = require('./SubscriptionService');

function getPublicApiBaseUrl() {
    return (process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || process.env.BACKEND_URL || process.env.APP_URL || '').replace(/\/$/, '');
}

function getFrontendBaseUrl() {
    return (process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/$/, '');
}

function buildMoneyFusionWebhookUrl() {
    const base = getPublicApiBaseUrl();
    if (!base) return '';

    const url = new URL('/api/v1/payments/moneyfusion/webhook', base);
    if (process.env.MONEYFUSION_WEBHOOK_SECRET) {
        url.searchParams.set('secret', process.env.MONEYFUSION_WEBHOOK_SECRET);
    }
    return url.toString();
}

function buildMoneyFusionReturnUrl(orderId) {
    const base = getFrontendBaseUrl();
    if (!base) return '';

    const url = new URL('/dashboard/billing', base);
    url.searchParams.set('payment', 'moneyfusion');
    if (orderId) url.searchParams.set('order', orderId);
    return url.toString();
}

function buildMoneyFusionPaymentData({ user, plan, orderId, phoneNumber, customerName, returnUrl, webhookUrl }) {
    const cleanPhone = String(phoneNumber || '').trim() || 'None';
    if (!plan) throw new Error('Plan invalide');

    const displayName = String(customerName || user?.name || user?.email || 'Client Whappi').trim();

    return {
        totalPrice: Number(plan.price),
        article: [
            {
                [`Whappi ${plan.name}`]: Number(plan.price)
            }
        ],
        personal_Info: [
            {
                userId: user.id,
                email: user.email,
                planCode: plan.code,
                planId: plan.id,
                orderId
            }
        ],
        numeroSend: cleanPhone,
        nomclient: displayName,
        return_url: returnUrl,
        webhook_url: webhookUrl
    };
}

function normalizeMoneyFusionStatus(payload = {}) {
    const event = String(payload.event || '').toLowerCase();
    const status = String(payload.statut || payload.status || payload.data?.statut || '').toLowerCase();

    if (event.includes('completed') || status === 'paid') return 'completed';
    if (event.includes('cancelled') || event.includes('canceled') || ['failure', 'failed', 'no paid', 'cancelled', 'canceled'].includes(status)) return 'cancelled';
    if (event.includes('pending') || status === 'pending') return 'pending';
    return status || 'pending';
}

function extractMoneyFusionPersonalInfo(payload = {}) {
    const source = payload.personal_Info || payload.data?.personal_Info || [];
    if (Array.isArray(source)) return source[0] || {};
    if (source && typeof source === 'object') return source;
    return {};
}

function extractMoneyFusionToken(payload = {}) {
    return payload.tokenPay || payload.token || payload.data?.tokenPay || payload.data?.token || null;
}

async function findTransactionByTokenOrOrder(token, orderId) {
    if (token) {
        const byToken = await db.get('SELECT * FROM payment_transactions WHERE provider_token = $1', [token]);
        if (byToken) return byToken;
    }
    if (orderId) {
        return await db.get('SELECT * FROM payment_transactions WHERE id = $1', [orderId]);
    }
    return null;
}

async function saveTransactionUpdate({ id, providerToken, status, providerPayload, checkoutUrl }) {
    const existing = await findTransactionByTokenOrOrder(providerToken, id);
    const payload = JSON.stringify(providerPayload || {});

    if (existing) {
        await db.run(`
            UPDATE payment_transactions
            SET provider_token = COALESCE($1, provider_token),
                status = $2,
                provider_payload = $3,
                checkout_url = COALESCE($4, checkout_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [providerToken, status, payload, checkoutUrl || null, existing.id]);
        return existing.id;
    }

    await db.run(`
        INSERT INTO payment_transactions (
            id, provider, provider_token, user_id, plan_id, amount, currency, status, checkout_url, provider_payload
        )
        VALUES ($1, 'moneyfusion', $2, $3, $4, $5, 'XAF', $6, $7, $8)
    `, [id, providerToken, providerPayload.userId || null, providerPayload.planId || null, providerPayload.amount || 0, status, checkoutUrl || null, payload]);

    return id;
}

async function createMoneyFusionCheckout(user, planCode, { phoneNumber, customerName } = {}) {
    const apiUrl = process.env.MONEYFUSION_API_URL;
    if (!apiUrl) throw new Error('MONEYFUSION_API_URL non configure');

    const plan = await PricingService.getPlanByCode(planCode);
    if (!plan) throw new Error('Plan invalide');

    const orderId = crypto.randomUUID();
    const returnUrl = buildMoneyFusionReturnUrl(orderId);
    const webhookUrl = buildMoneyFusionWebhookUrl();
    if (!returnUrl) throw new Error('FRONTEND_URL requis pour MoneyFusion');
    if (!webhookUrl) throw new Error('PUBLIC_API_URL ou BACKEND_URL requis pour le webhook MoneyFusion');

    const paymentData = buildMoneyFusionPaymentData({
        user,
        plan,
        orderId,
        phoneNumber: phoneNumber || user.phone || user.whatsapp_number,
        customerName,
        returnUrl,
        webhookUrl
    });

    await db.run(`
        INSERT INTO payment_transactions (
            id, provider, user_id, plan_id, amount, currency, status, provider_payload
        )
        VALUES ($1, 'moneyfusion', $2, $3, $4, 'XAF', 'created', $5)
    `, [orderId, user.id, plan.id, plan.price, JSON.stringify(paymentData)]);

    const response = await axios.post(apiUrl, paymentData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
    });

    if (!response.data?.statut || !response.data?.url || !response.data?.token) {
        throw new Error(response.data?.message || 'MoneyFusion a refuse la demande de paiement');
    }

    await db.run(`
        UPDATE payment_transactions
        SET provider_token = $1, status = 'pending', checkout_url = $2, provider_payload = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
    `, [response.data.token, response.data.url, JSON.stringify({ request: paymentData, response: response.data }), orderId]);

    log(`MoneyFusion checkout created for ${user.email}`, 'PAYMENT', { orderId, planCode, tokenPay: response.data.token }, 'INFO');

    return {
        provider: 'moneyfusion',
        orderId,
        token: response.data.token,
        url: response.data.url,
        status: 'pending'
    };
}

async function applyMoneyFusionPayment(payload = {}) {
    const status = normalizeMoneyFusionStatus(payload);
    const token = extractMoneyFusionToken(payload);
    const personalInfo = extractMoneyFusionPersonalInfo(payload);
    const orderId = personalInfo.orderId;
    const transaction = await findTransactionByTokenOrOrder(token, orderId);
    const previousStatus = transaction?.status || null;

    if (previousStatus === status || (previousStatus === 'completed' && status === 'completed')) {
        return { success: true, action: 'ignored_duplicate', status, token };
    }

    const providerPayload = {
        ...payload,
        userId: personalInfo.userId,
        planId: personalInfo.planId,
        amount: payload.Montant || payload.data?.Montant || payload.amount || transaction?.amount || 0
    };

    const transactionId = await saveTransactionUpdate({
        id: orderId || crypto.randomUUID(),
        providerToken: token,
        status,
        providerPayload
    });

    if (status !== 'completed') {
        return { success: true, action: 'status_updated', status, token, transactionId };
    }

    const user = (personalInfo.userId && await User.findById(personalInfo.userId)) || (personalInfo.email && await User.findByEmail(personalInfo.email));
    if (!user) throw new Error('Utilisateur MoneyFusion introuvable');

    const planCode = personalInfo.planCode || transaction?.plan_id;
    const plan = await PricingService.getPlanByCode(planCode);
    if (!plan) throw new Error('Plan MoneyFusion introuvable');

    const amount = Number(payload.Montant || payload.data?.Montant || transaction?.amount || 0);
    if (amount && amount < Number(plan.price)) {
        throw new Error(`Montant MoneyFusion insuffisant: ${amount} < ${plan.price}`);
    }

    await SubscriptionService.subscribe(user.id, plan.code);

    ActivityLog.log({
        userEmail: user.email,
        action: 'MONEYFUSION_PAYMENT_COMPLETED',
        resource: 'subscription',
        resourceId: plan.code,
        success: true,
        details: { tokenPay: token, transactionId, amount }
    });

    return { success: true, action: 'subscription_activated', status, token, transactionId, user: user.email };
}

async function checkMoneyFusionStatus(token) {
    const response = await axios.get(`https://www.pay.moneyfusion.net/paiementNotif/${encodeURIComponent(token)}`, {
        timeout: 15000
    });
    return applyMoneyFusionPayment(response.data);
}

module.exports = {
    applyMoneyFusionPayment,
    buildMoneyFusionPaymentData,
    checkMoneyFusionStatus,
    createMoneyFusionCheckout,
    extractMoneyFusionPersonalInfo,
    normalizeMoneyFusionStatus
};
