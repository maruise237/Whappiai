const express = require('express');
const router = express.Router();
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const { createCheckoutSession, handleWebhook, getPaymentStatusForUser } = require('../services/payment');
const PricingService = require('../services/PricingService');
const { log } = require('../utils/logger');

// GET /api/v1/payments/diag - Diagnostic MoneyFusion (sans auth)
router.get('/diag', async (req, res) => {
    const results = {
        env: {
            MONEYFUSION_API_URL: process.env.MONEYFUSION_API_URL ? 'défini (' + process.env.MONEYFUSION_API_URL.slice(0, 30) + '...)' : 'NON DÉFINI',
            APP_URL: process.env.APP_URL || 'NON DÉFINI',
            FRONTEND_URL: process.env.FRONTEND_URL || 'NON DÉFINI',
        },
        dns: null,
        http: null,
    };

    const apiUrl = (process.env.MONEYFUSION_API_URL || '').replace(/\/$/, '');
    if (!apiUrl) {
        return res.json({ ...results, error: 'MONEYFUSION_API_URL non configuré' });
    }

    try {
        const dnsResult = await fetch('https://1.1.1.1/dns-query?name=' + encodeURIComponent(new URL(apiUrl).hostname) + '&type=A', {
            headers: { Accept: 'application/dns-json' },
        });
        const dnsData = await dnsResult.json();
        results.dns = dnsData.Answer?.map(a => `${a.name} → ${a.data}`) || 'DNS lookup failed';
    } catch (e) {
        results.dns = `DNS error: ${e.message}`;
    }

    try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 10000);
        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                totalPrice: 200,
                article: [{ name: 'Test', price: 200, quantity: 1 }],
                numeroSend: '0101010101',
                nomclient: 'Diag',
                personal_Info: [{ userId: 'diag', orderId: 'diag-' + Date.now(), planCode: 'starter', planId: 'starter' }],
            }),
            signal: ctrl.signal,
        });
        clearTimeout(timeout);
        const data = await resp.json();
        results.http = { status: resp.status, statut: data.statut, message: data.message, hasUrl: !!data.url };
    } catch (e) {
        results.http = `Fetch error: ${e.message}${e.cause ? ' | cause: ' + e.cause.message : ''}`;
    }

    res.json(results);
});

// POST /api/v1/payments/checkout
router.post('/checkout', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const { planId, phoneNumber, customerName } = req.body;
        const userId = req.auth.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Non autorisé' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const checkout = await createCheckoutSession(user, planId, { phoneNumber, customerName });
        res.json(checkout);
    } catch (error) {
        log('Erreur lors de la création du lien de paiement', 'PAYMENT', {
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 4).join(' | '),
            cause: error.cause?.message || error.cause || null,
        }, 'ERROR');
        res.status(500).json({ error: error.message || 'Erreur lors de la création du lien de paiement' });
    }
});

// GET /api/v1/payments/plans
router.get('/plans', async (req, res) => {
    try {
        const plans = await PricingService.getActivePlans();
        res.json(plans);
    } catch (error) {
        log('Erreur lors de la récupération des plans', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ error: 'Impossible de récupérer les plans' });
    }
});

// GET /api/v1/payments/status/:orderId
router.get('/status/:orderId', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Non autorisé' });
        }

        const result = await getPaymentStatusForUser(userId, req.params.orderId);
        res.json(result);
    } catch (error) {
        const statusCode = error.message === 'Accès non autorisé à cette transaction' ? 403 : 500;
        log('Erreur lors de la vérification du paiement MoneyFusion', 'PAYMENT', {
            error: error.message,
            orderId: req.params.orderId,
        }, statusCode === 403 ? 'WARN' : 'ERROR');
        res.status(statusCode).json({ error: error.message || 'Impossible de vérifier le paiement' });
    }
});

// POST /api/v1/payments/moneyfusion/webhook
// MoneyFusion webhook endpoint (no Clerk auth — called by MoneyFusion servers)
// Important: MoneyFusion does NOT sign webhooks. Security relies on:
//   - Secrecy of the webhook URL
//   - Correlation via tokenPay + personal_Info.orderId
//   - Idempotent deduplication logic in handleWebhook()
router.post('/moneyfusion/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const result = await handleWebhook(req.body);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        log('Erreur webhook MoneyFusion', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message || 'Webhook MoneyFusion error' });
    }
});

module.exports = router;
