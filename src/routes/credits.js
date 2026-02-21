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

        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const history = CreditService.getHistory(userId, limit, offset);
        res.json({ status: 'success', data: history });
    } catch (error) {
        log('Error fetching credit history', 'CREDITS', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
