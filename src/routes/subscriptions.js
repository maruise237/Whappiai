const express = require('express');
const router = express.Router();
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const SubscriptionService = require('../services/SubscriptionService');
const PricingService = require('../services/PricingService');
const AccountAccessService = require('../services/AccountAccessService');
const User = require('../models/User');
const { log } = require('../utils/logger');

// GET /api/v1/subscriptions/plans
router.get('/plans', async (req, res) => {
    try {
        const plans = PricingService.getAllPlans();
        res.json({ status: 'success', data: plans });
    } catch (error) {
        log('Error fetching plans', 'PRICING', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// GET /api/v1/subscriptions/current
router.get('/current', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const email = req.auth.sessionClaims?.email || req.auth.sessionClaims?.primary_email_address;
        const user = User.findById(userId) || User.findByEmail(email);
        const subscription = SubscriptionService.getCurrentSubscription(user?.id || userId);
        const access = AccountAccessService.getStatus(user);

        res.json({
            status: 'success',
            data: {
                ...(subscription || {}),
                plan_id: subscription?.plan_id || user?.plan_id || 'trial',
                plan_code: subscription?.plan_code || user?.plan_id || 'trial',
                status: access.status || subscription?.status || user?.plan_status || 'active',
                access_allowed: access.allowed,
                access_code: access.code,
                access_message: access.message,
                entitlements: access.entitlements,
                current_period_end: subscription?.current_period_end || user?.subscription_expiry || null,
                subscription_expiry: subscription?.current_period_end || user?.subscription_expiry || null,
                renewal_reminders: [7, 3, 1, 0],
                message_limit: subscription?.message_limit || user?.message_limit || 0,
                message_used: user?.message_used || 0,
            }
        });
    } catch (error) {
        log('Error fetching subscription', 'SUBSCRIPTION', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST /api/v1/subscriptions/subscribe
router.post('/subscribe', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        const { planCode } = req.body;
        
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        if (!planCode) return res.status(400).json({ status: 'error', message: 'Plan code is required' });

        const subId = await SubscriptionService.subscribe(userId, planCode);
        res.json({ status: 'success', message: 'Subscription successful', subscriptionId: subId });
    } catch (error) {
        log('Error subscribing', 'SUBSCRIPTION', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST /api/v1/subscriptions/cancel
router.post('/cancel', ClerkExpressWithAuth(), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        const result = await SubscriptionService.cancel(userId);
        if (result) {
            res.json({ status: 'success', message: 'Subscription cancelled' });
        } else {
            res.status(400).json({ status: 'error', message: 'No active subscription found or cancellation failed' });
        }
    } catch (error) {
        log('Error cancelling subscription', 'SUBSCRIPTION', { error: error.message }, 'ERROR');
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
