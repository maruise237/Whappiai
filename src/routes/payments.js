const express = require('express');
const router = express.Router();
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const { createCheckoutSession, handleWebhook } = require('../services/payment');
const PricingService = require('../services/PricingService');
const { log } = require('../utils/logger');

// POST /api/v1/payments/checkout
router.post('/checkout', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const { planId, phoneNumber, customerName } = req.body;
        const userId = req.auth.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Non autorise' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }

        const checkout = await createCheckoutSession(user, planId, { phoneNumber, customerName });
        res.json(checkout);
    } catch (error) {
        log('Erreur lors de la creation du lien de paiement', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ error: error.message || 'Erreur lors de la creation du lien de paiement' });
    }
});

// GET /api/v1/payments/plans
router.get('/plans', async (req, res) => {
    try {
        const plans = await PricingService.getActivePlans();
        res.json(plans);
    } catch (error) {
        log('Erreur lors de la recuperation des plans', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ error: 'Impossible de recuperer les plans' });
    }
});

// POST /api/v1/payments/geniuspay/webhook
router.post('/geniuspay/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const result = await handleWebhook(req.body, req.headers);
        res.status(200).json({ status: 'success', data: result });
    } catch (error) {
        const statusCode = error.message === 'Invalid GeniusPay signature' ? 401 : 500;
        log('Erreur webhook GeniusPay', 'PAYMENT', { error: error.message }, statusCode === 401 ? 'WARN' : 'ERROR');
        res.status(statusCode).json({ status: 'error', message: error.message || 'Webhook GeniusPay error' });
    }
});

module.exports = router;
