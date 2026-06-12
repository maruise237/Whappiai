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
            const user = await User.findById(id);
            if (user) {
                await User.delete(id);
                log(`User deleted via Clerk webhook: ${user.email}`, 'AUTH');
            }
        } catch (err) {
            log(`Error deleting user from Clerk: ${err.message}`, 'AUTH', null, 'ERROR');
        }
    }

    return res.status(200).json({ success: true });
});

module.exports = router;
