const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const { createCheckoutSession, handleWebhook } = require('../services/payment');
const MoneyFusionService = require('../services/moneyfusion');
const PricingService = require('../services/PricingService');
const { log } = require('../utils/logger');

function verifyChariowSignature(payload, signature) {
    const secret = process.env.CHARIOW_SECRET_KEY;

    if (!secret) {
        log('CHARIOW_SECRET_KEY not configured', 'PAYMENT', null, 'ERROR');
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

// POST /api/v1/payments/checkout
router.post('/checkout', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const { planId, phoneNumber, customerName, provider } = req.body;
        const userId = req.auth.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Non autorise' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }

        if (provider === 'moneyfusion' || process.env.PAYMENT_PROVIDER === 'moneyfusion' || process.env.MONEYFUSION_API_URL) {
            const checkout = await MoneyFusionService.createMoneyFusionCheckout(user, planId, { phoneNumber, customerName });
            return res.json(checkout);
        }

        const checkoutUrl = await createCheckoutSession(user, planId);
        res.json({ provider: 'chariow', url: checkoutUrl });
    } catch (error) {
        log('Erreur lors de la creation du lien de paiement', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ error: error.message || 'Erreur lors de la creation du lien de paiement' });
    }
});

// GET /api/v1/payments/plans
router.get('/plans', (req, res) => {
    try {
        const plans = PricingService.getActivePlans();
        res.json(plans);
    } catch (error) {
        log('Erreur lors de la recuperation des plans', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ error: 'Impossible de recuperer les plans' });
    }
});

// POST /api/v1/payments/moneyfusion/webhook
router.post('/moneyfusion/webhook', async (req, res) => {
    const configuredSecret = process.env.MONEYFUSION_WEBHOOK_SECRET;
    const providedSecret = req.query.secret || req.headers['x-moneyfusion-secret'];

    if (configuredSecret && providedSecret !== configuredSecret) {
        log('MoneyFusion webhook rejected: invalid secret', 'PAYMENT', null, 'WARN');
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const result = await MoneyFusionService.applyMoneyFusionPayment(req.body);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        log('Erreur webhook MoneyFusion', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: 'Webhook MoneyFusion error' });
    }
});

// GET /api/v1/payments/moneyfusion/status/:token
router.get('/moneyfusion/status/:token', ClerkExpressWithAuth(), async (req, res) => {
    try {
        if (!req.auth.userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const result = await MoneyFusionService.checkMoneyFusionStatus(req.params.token);
        res.json({ status: 'success', data: result });
    } catch (error) {
        log('Erreur verification MoneyFusion', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: 'Verification MoneyFusion impossible' });
    }
});

// POST /api/v1/payments/webhook (legacy Chariow)
router.post('/webhook', async (req, res) => {
    const signature = req.headers['x-chariow-signature'];
    const payload = req.body;

    if (signature) {
        if (!verifyChariowSignature(payload, signature)) {
            log('Invalid webhook signature', 'PAYMENT', null, 'WARN');
            return res.status(401).send('Invalid signature');
        }
    } else {
        log('Missing webhook signature - accepting for development', 'PAYMENT', null, 'DEBUG');
    }

    try {
        await handleWebhook(req.headers['x-chariow-event'] || 'unknown', payload);
        res.status(200).send('OK');
    } catch (error) {
        log('Erreur webhook', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).send('Webhook Error');
    }
});

module.exports = router;
