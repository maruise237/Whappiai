const express = require('express');
const router = express.Router();
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const CreditService = require('../services/CreditService');
const { log } = require('../utils/logger');

// GET /api/v1/credits/balance
router.get('/balance', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const balance = CreditService.getBalance(userId);
        res.json({ status: 'success', data: { balance } });
    } catch (error) {
        log('Error fetching credit balance', 'CREDITS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// GET /api/v1/credits/history
router.get('/history', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const history = CreditService.getHistory(userId);
        res.json({ status: 'success', data: history });
    } catch (error) {
        log('Error fetching credit history', 'CREDITS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// GET /api/v1/credits/stats
router.get('/stats', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const days = parseInt(req.query.days) || 7;
        const stats = CreditService.getUsageStats(userId, days);
        res.json({ status: 'success', data: stats });
    } catch (error) {
        log('Error fetching credit stats', 'CREDITS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST /api/v1/credits/claim-welcome
router.post('/claim-welcome', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const result = CreditService.giveWelcomeCredits(userId, 60);
        if (result) {
            res.json({ status: 'success', message: '60 crédits de bienvenue ont été ajoutés à votre compte 🎉' });
        } else {
            res.status(400).json({ status: 'error', message: 'Vous avez déjà reçu vos crédits de bienvenue ou une erreur est survenue.' });
        }
    } catch (error) {
        log('Error claiming welcome credits', 'CREDITS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
