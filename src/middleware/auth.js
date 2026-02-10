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
 * Validates the Clerk session token (JWT)
 */
async function requireClerkAuth(req, res, next) {
    // 1. Check if ClerkExpressWithAuth has already populated req.auth
    let auth = req.auth;

    // 2. If not, try to authenticate manually
    if (!auth || !auth.userId) {
        try {
            const authHeader = req.headers.authorization;
            const sessionToken = req.cookies['__session'] || (authHeader ? authHeader.split(' ')[1] : null);

            if (sessionToken) {
                // In v4, we can verify the session token
                // If it's a JWT, we should ideally use verifyToken, 
                // but clerkClient.sessions.verifySession is what was here.
                // Let's try to get the session from the token if it's a session ID,
                // or use authenticateRequest if it's a JWT.
                
                try {
                    const session = await clerkClient.sessions.verifySession(sessionToken);
                    if (session) {
                        auth = { userId: session.userId };
                    }
                } catch (e) {
                    // If verifySession fails, it might be a JWT. 
                    // Let's rely on req.auth from global middleware if possible.
                    log(`Manual session verify failed: ${e.message}`, 'AUTH', null, 'DEBUG');
                }
            }
        } catch (err) {
            log(`Manual auth extraction failed: ${err.message}`, 'AUTH', null, 'DEBUG');
        }
    }

    if (!auth || !auth.userId) {
        return response.unauthorized(res, 'Authentication required');
    }

    try {
        // Get user details from Clerk
        const clerkUser = await clerkClient.users.getUser(auth.userId);
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
        let localUser = User.findByEmail(email);
        
        // If user doesn't exist locally (should be handled by webhook, but as a fallback)
        if (!localUser) {
            log(`User ${email} not found in local DB, creating...`, 'AUTH');
            // We use the Clerk ID as the local ID to maintain sync
            await User.create({
                id: clerkUser.id,
                email: email,
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                imageUrl: clerkUser.imageUrl,
                role: targetRole
            });
            localUser = User.findById(clerkUser.id);
        } else {
            // Update profile data even if user exists to keep sync
            await User.create({
                id: clerkUser.id,
                email: email,
                name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
                imageUrl: clerkUser.imageUrl,
                role: targetRole // Use targetRole which includes auto-promotion
            });
            localUser = User.findById(clerkUser.id);
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
    } catch (err) {
        log(`Clerk auth error: ${err.message}`, 'AUTH', null, 'ERROR');
        return response.unauthorized(res, 'Invalid or expired session');
    }
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
    requireAdmin,
    requireAuth: requireClerkAuth, // Alias for compatibility
    getCurrentUser: (req) => req.currentUser
};
