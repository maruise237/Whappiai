const express = require('express');
const router = express.Router();
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const { createCheckoutSession, handleWebhook, PLANS } = require('../services/payment');
const { log } = require('../utils/logger');

// POST /api/v1/payments/checkout
router.post('/checkout', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.auth.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Non autorisé' });
        }

        const user = User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const checkoutUrl = await createCheckoutSession(user, planId);
        res.json({ url: checkoutUrl });
    } catch (error) {
        log('Erreur lors de la création du lien de paiement', 'PAYMENT', { error: error.message }, 'ERROR');
        res.status(500).json({ error: 'Erreur lors de la création du lien de paiement' });
    }
});

// GET /api/v1/payments/plans
router.get('/plans', (req, res) => {
    res.json(PLANS);
});

module.exports = router;
