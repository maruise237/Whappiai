const express = require('express');
const router = express.Router();
const CalService = require('../services/CalService');
const { log } = require('../utils/logger');

// OAuth Callback (Unprotected, handles its own state)
router.get('/callback', async (req, res) => {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
        return res.status(400).send('Missing code or state');
    }

    try {
        await CalService.exchangeCode(code, userId);
        // Redirect back to frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005';
        res.redirect(`${frontendUrl}/dashboard/ai?cal=success`);
    } catch (error) {
        log(`OAuth Callback error: ${error.message}`, 'SYSTEM', null, 'ERROR');
        res.status(500).send('Authentication failed');
    }
});

module.exports = router;
