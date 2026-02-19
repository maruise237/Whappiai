/**
 * Clerk Webhooks Handler
 * Syncs Clerk users with local SQLite database
 */

const express = require('express');
const router = express.Router();
const { Webhook } = require('svix');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { log } = require('../utils/logger');
const paymentService = require('../services/payment');

router.post('/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET || WEBHOOK_SECRET === 'whsec_your_actual_secret_here') {
        log('Clerk Webhook Secret not configured', 'SYSTEM', null, 'ERROR');
        return res.status(400).json({ error: 'Webhook secret missing' });
    }

    // Get the headers
    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return res.status(400).json({ error: 'Missing svix headers' });
    }

    // Get the body
    const payload = req.body.toString();
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;

    // Verify the payload
    try {
        evt = wh.verify(payload, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        });
    } catch (err) {
        log(`Webhook verification failed: ${err.message}`, 'SYSTEM', null, 'ERROR');
        return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the webhook
    const eventType = evt.type;
    log(`Clerk Webhook received: ${eventType}`, 'SYSTEM');

    if (eventType === 'user.created' || eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
        const email = email_addresses[0]?.email_address;

        try {
            const userData = {
                id: id,
                email: email,
                name: `${first_name || ''} ${last_name || ''}`.trim(),
                role: public_metadata?.role || 'user'
            };

            await User.create(userData);
            
            log(`User synced from Clerk: ${email} (${eventType})`, 'AUTH');
            
            ActivityLog.log({
                userEmail: email,
                action: eventType.toUpperCase(),
                resource: 'user',
                resourceId: id,
                success: true,
                details: { eventType }
            });
        } catch (err) {
            log(`Error syncing user from Clerk: ${err.message}`, 'AUTH', null, 'ERROR');
        }
    }

    if (eventType === 'user.deleted') {
        const { id } = evt.data;
        try {
            const user = User.findById(id);
            if (user) {
                User.delete(id);
                log(`User deleted via Clerk webhook: ${user.email}`, 'AUTH');
            }
        } catch (err) {
            log(`Error deleting user from Clerk: ${err.message}`, 'AUTH', null, 'ERROR');
        }
    }

    return res.status(200).json({ success: true });
});

/**
 * Chariow Webhook Handler
 * Handles license events (issued, expired, revoked)
 */
router.post('/chariow', async (req, res) => {
    // 1. Security Check: Validate Webhook Secret if configured
    // Chariow allows adding query params to the webhook URL.
    // Configure your webhook URL in Chariow as: https://your-api.com/webhooks/chariow?secret=YOUR_SECRET
    const configuredSecret = process.env.CHARIOW_WEBHOOK_SECRET;
    const incomingSecret = req.query.secret;

    if (configuredSecret && configuredSecret !== incomingSecret) {
        log('Chariow Webhook rejected: Invalid secret', 'SYSTEM', { 
            expected: '***', 
            received: incomingSecret ? '***' : 'null' 
        }, 'WARN');
        return res.status(403).json({ error: 'Forbidden: Invalid webhook secret' });
    }

    // 2. Log the incoming webhook for debugging
    log(`Chariow Webhook received`, 'SYSTEM', { 
        headers: req.headers,
        body: req.body 
    }, 'DEBUG');

    const { event, payload } = req.body;

    if (!event || !payload) {
        log('Invalid Chariow webhook format', 'SYSTEM', null, 'WARN');
        return res.status(400).json({ error: 'Invalid payload' });
    }

    try {
        // All logic (including logging) is now handled in paymentService
        const result = await paymentService.handleLicenseEvent(event, payload);
        
        if (result.success) {
            res.json({ success: true });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        log(`Error processing Chariow webhook: ${error.message}`, 'SYSTEM', null, 'ERROR');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
