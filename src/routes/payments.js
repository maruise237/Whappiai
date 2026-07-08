const express = require('express');
const router = express.Router();
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const { createCheckoutSession, handleWebhook, getPaymentStatusForUser } = require('../services/payment');
const PricingService = require('./PricingService');
const { log } = require('../utils/logger');

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
        log('Erreur lors de la création du lien de paiement', 'PAYMENT', { error: error.message }, 'ERROR');
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
