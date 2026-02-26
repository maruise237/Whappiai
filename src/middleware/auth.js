/**
 * Clerk Authentication Middleware for Express
 * Validates JWT tokens from Clerk
 */

const { createClerkClient } = require('@clerk/clerk-sdk-node');
const response = require('../utils/response');
const { log } = require('../utils/logger');
const User = require('../models/User');

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

/**
 * Helper to get Clerk User from request
 */
async function getClerkUser(req) {
    let auth = req.auth;

    // If not populated by ClerkExpressWithAuth, try manual extraction
    if (!auth || !auth.userId) {
        try {
            const authHeader = req.headers.authorization;
            const sessionToken = req.cookies['__session'] || (authHeader ? authHeader.split(' ')[1] : null);

            if (sessionToken) {
                try {
                    const session = await clerkClient.sessions.verifySession(sessionToken);
                    if (session) {
                        auth = { userId: session.userId };
                    }
                } catch (e) {
                    log(`Manual session verify failed: ${e.message}`, 'AUTH', null, 'DEBUG');
                }
            }
        } catch (err) {
            log(`Manual auth extraction failed: ${err.message}`, 'AUTH', null, 'DEBUG');
        }
    }

    if (!auth || !auth.userId) {
        return null;
    }

    try {
        return await clerkClient.users.getUser(auth.userId);
    } catch (e) {
        log(`Failed to get Clerk user: ${e.message}`, 'AUTH', null, 'ERROR');
        return null;
    }
}

/**
 * Middleware that only validates the Clerk token/session
 * Does NOT check/create local DB user
 */
async function requireClerkToken(req, res, next) {
    const clerkUser = await getClerkUser(req);
    if (!clerkUser) {
        return response.unauthorized(res, 'Authentication required');
    }
    req.clerkUser = clerkUser;
    next();
}

/**
 * Validates the Clerk session token (JWT) AND ensures user exists in DB
 */
async function requireClerkAuth(req, res, next) {
    const clerkUser = await getClerkUser(req);

    if (!clerkUser) {
        return response.unauthorized(res, 'Authentication required');
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
        return response.unauthorized(res, 'User email not found');
    }

    // Auto-promote maruise237@gmail.com to admin if it's not already
    const MASTER_ADMIN_EMAIL = 'maruise237@gmail.com';
    let targetRole = clerkUser.publicMetadata?.role || 'user';
    if (email && email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
        targetRole = 'admin';
    }

    // Sync with local SQLite user
    let localUser = User.findById(clerkUser.id) || User.findByEmail(email);
    
    // Auto-create or update user from Clerk
    // This ensures that anyone authenticated via Clerk has a local record
    log(`Syncing user ${email} from Clerk...`, 'AUTH', { email, id: clerkUser.id }, 'DEBUG');

    await User.create({
        id: clerkUser.id,
        email: email,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        imageUrl: clerkUser.imageUrl,
        role: targetRole // Use targetRole which includes auto-promotion
    });

    localUser = User.findById(clerkUser.id);

    if (!localUser) {
        log(`Failed to sync/create local user for ${email}`, 'AUTH', null, 'ERROR');
        return response.error(res, 'Failed to initialize user session', 500);
    }

    // Attach user info to request
    req.currentUser = {
        id: localUser.id,
        clerkId: clerkUser.id,
        email: email,
        role: (email && email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) ? 'admin' : (localUser.role || 'user')
    };

    // Compatibility for session-based checks
    if (req.session) {
        req.session.adminAuthed = req.currentUser.role === 'admin';
        req.session.userEmail = email;
        req.session.userRole = req.currentUser.role;
    }

    next();
}

/**
 * Legacy support for existing middlewares
 */
function requireAdmin(req, res, next) {
    requireClerkAuth(req, res, () => {
        if (req.currentUser.role !== 'admin') {
            return response.forbidden(res, 'Admin access required');
        }
        next();
    });
}

module.exports = {
    requireClerkAuth,
    requireClerkToken,
    requireAdmin,
    requireAuth: requireClerkAuth, // Alias for compatibility
    getCurrentUser: (req) => req.currentUser
};
