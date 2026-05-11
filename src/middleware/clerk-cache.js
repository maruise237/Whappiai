/**
 * Clerk Cache Middleware
 * Caches Clerk token validation results in Redis to reduce API calls
 */

const redisService = require('../services/redis');

/**
 * Middleware to cache Clerk authentication validation
 * @param {number} cacheTTL - Cache TTL in seconds (default: 300 = 5 minutes)
 */
const cacheClerkAuth = (cacheTTL = 300) => {
    return async (req, res, next) => {
        // Skip if no auth header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Skip if Redis is not configured
        if (!redisService.isConnected) {
            return next();
        }

        try {
            // Generate cache key from token hash (simplified: use first 16 chars)
            const tokenPrefix = token.substring(0, 16);
            const cacheKey = `clerk:auth:${tokenPrefix}`;

            // Check cache first
            const cachedResult = await redisService.get(cacheKey);
            
            if (cachedResult && cachedResult.valid) {
                // Restore auth context from cache
                req.auth = {
                    userId: cachedResult.userId,
                    sessionId: cachedResult.sessionId,
                    sessionClaims: cachedResult.claims
                };
                
                // Add debug header
                res.setHeader('X-Clerk-Cache', 'HIT');
                return next();
            }

            // Cache miss - proceed with normal validation
            res.setHeader('X-Clerk-Cache', 'MISS');
            
            // Override res.json to capture and cache the result
            const originalJson = res.json.bind(res);
            
            res.json = (data) => {
                // If response indicates successful auth, cache it
                if (req.auth && req.auth.userId) {
                    const cacheData = {
                        valid: true,
                        userId: req.auth.userId,
                        sessionId: req.auth.sessionId,
                        claims: req.auth.sessionClaims,
                        cachedAt: Date.now()
                    };
                    
                    // Cache in background (don't block response)
                    redisService.set(cacheKey, cacheData, cacheTTL).catch(err => {
                        console.error('[ClerkCache] Failed to cache:', err.message);
                    });
                }
                
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('[ClerkCache] Error:', error.message);
            // Continue without caching on error
            next();
        }
    };
};

/**
 * Helper function to manually cache Clerk user data
 * @param {string} userId - Clerk user ID
 * @param {Object} userData - User data to cache
 * @param {number} ttlSeconds - Cache TTL in seconds
 */
const cacheUserData = async (userId, userData, ttlSeconds = 3600) => {
    if (!redisService.isConnected) {
        return false;
    }

    try {
        const cacheKey = `clerk:user:${userId}`;
        await redisService.set(cacheKey, userData, ttlSeconds);
        return true;
    } catch (error) {
        console.error('[ClerkCache] Failed to cache user data:', error.message);
        return false;
    }
};

/**
 * Helper function to get cached user data
 * @param {string} userId - Clerk user ID
 * @returns {Promise<Object|null>} Cached user data or null
 */
const getCachedUserData = async (userId) => {
    if (!redisService.isConnected) {
        return null;
    }

    try {
        const cacheKey = `clerk:user:${userId}`;
        return await redisService.get(cacheKey);
    } catch (error) {
        console.error('[ClerkCache] Failed to get user data:', error.message);
        return null;
    }
};

/**
 * Invalidate cached Clerk auth for a token
 * @param {string} token - The auth token
 */
const invalidateAuthCache = async (token) => {
    if (!redisService.isConnected || !token) {
        return false;
    }

    try {
        const tokenPrefix = token.substring(0, 16);
        const cacheKey = `clerk:auth:${tokenPrefix}`;
        await redisService.delete(cacheKey);
        return true;
    } catch (error) {
        console.error('[ClerkCache] Failed to invalidate auth cache:', error.message);
        return false;
    }
};

/**
 * Invalidate cached user data
 * @param {string} userId - Clerk user ID
 */
const invalidateUserCache = async (userId) => {
    if (!redisService.isConnected || !userId) {
        return false;
    }

    try {
        const cacheKey = `clerk:user:${userId}`;
        await redisService.delete(cacheKey);
        return true;
    } catch (error) {
        console.error('[ClerkCache] Failed to invalidate user cache:', error.message);
        return false;
    }
};

module.exports = {
    cacheClerkAuth,
    cacheUserData,
    getCachedUserData,
    invalidateAuthCache,
    invalidateUserCache
};
