/**
 * User & Authentication Routes
 * Handles user info, sync, and auth-related endpoints
 */

const User = require('../../models/User');
const CreditService = require('../../services/CreditService');

/**
 * Initialize user routes with dependencies
 */
function initializeUserRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, log } = dependencies;

    // Get current user info
    routerInstance.get('/me', checkSessionOrTokenAuth, (req, res) => {
        const freshUser = User.findById(req.currentUser.id) || User.findByEmail(req.currentUser.email);
        res.json({
            status: 'success',
            data: {
                ...freshUser,
                ...req.currentUser,
                id: freshUser?.id || req.currentUser.id,
                email: (freshUser?.email || req.currentUser.email || '').toLowerCase(),
                role: req.currentUser.role || freshUser?.role || 'user',
                plan_id: freshUser?.plan_id || req.currentUser.plan_id || 'trial',
                plan_status: freshUser?.plan_status || req.currentUser.plan_status || 'active',
                message_limit: freshUser?.message_limit || req.currentUser.message_limit || 0,
                message_used: freshUser?.message_used || req.currentUser.message_used || 0,
                subscription_expiry: freshUser?.subscription_expiry || req.currentUser.subscription_expiry || null,
            }
        });
    });

    // Sync user from Clerk
    routerInstance.post('/users/sync', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const { email, id, role } = req.currentUser;
            const name = req.body.name || req.auth.sessionClaims?.name || email.split('@')[0];
            const imageUrl = req.body.imageUrl || req.auth.sessionClaims?.image_url;

            log(`Syncing user ${email} (ID: ${id})`, 'AUTH');

            const existingUser = User.findById(id) || User.findByEmail(email);
            const isNewUser = !existingUser;

            const user = await User.create({
                id,
                email: email.toLowerCase().trim(),
                name,
                role,
                imageUrl
            });

            if (isNewUser && role !== 'admin') {
                try {
                    const granted = CreditService.giveWelcomeCredits(id);
                    if (granted) {
                        log(`Welcome credits granted to new user ${email}`, 'CREDITS');
                    }
                } catch (creditErr) {
                    log(`Welcome credits failed for ${email}: ${creditErr.message}`, 'CREDITS', null, 'WARN');
                }
            }

            res.json({ status: 'success', data: user, isNew: isNewUser });
        } catch (err) {
            log(`Sync failed: ${err.message}`, 'AUTH', null, 'ERROR');
            res.status(500).json({ status: 'error', message: 'Failed to sync user' });
        }
    });

    // WebSocket token endpoint
    routerInstance.get('/ws-token', checkSessionOrTokenAuth, (req, res) => {
        res.json({ status: 'success', data: { message: 'Use your Clerk session token for WS' } });
    });
}

module.exports = initializeUserRoutes;
