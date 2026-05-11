/**
 * Redis Cache Service
 * Provides caching for Clerk token validation and other frequently accessed data
 */

const { createClient } = require('redis');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isConfigured = false;
    }

    /**
     * Initialize Redis connection
     * @returns {Promise<boolean>} True if connected successfully
     */
    async connect() {
        const redisUrl = process.env.REDIS_URL;
        
        if (!redisUrl) {
            console.log('[Redis] No REDIS_URL configured, caching disabled');
            return false;
        }

        try {
            this.client = createClient({
                url: redisUrl,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 5) {
                            console.log(`[Redis] Max retries reached, disabling cache`);
                            this.isConnected = false;
                            return new Error('Max retries reached');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.client.on('error', (err) => {
                console.error('[Redis] Client Error:', err.message);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('[Redis] Connected successfully');
                this.isConnected = true;
            });

            await this.client.connect();
            this.isConfigured = true;
            
            return true;
        } catch (error) {
            console.error('[Redis] Connection failed:', error.message);
            this.isConfigured = false;
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} Cached value or null
     */
    async get(key) {
        if (!this.isConnected || !this.client) {
            return null;
        }

        try {
            const value = await this.client.get(key);
            if (value === null) {
                return null;
            }

            // Try to parse JSON
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            console.error(`[Redis] GET error for key ${key}:`, error.message);
            return null;
        }
    }

    /**
     * Set value in cache with optional TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttlSeconds - Time to live in seconds (default: 3600)
     * @returns {Promise<boolean>} True if successful
     */
    async set(key, value, ttlSeconds = 3600) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            await this.client.setEx(key, ttlSeconds, stringValue);
            return true;
        } catch (error) {
            console.error(`[Redis] SET error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} True if successful
     */
    async delete(key) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error(`[Redis] DELETE error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} True if exists
     */
    async exists(key) {
        if (!this.isConnected || !this.client) {
            return false;
        }

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            console.error(`[Redis] EXISTS error for key ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Get multiple values by keys
     * @param {string[]} keys - Array of cache keys
     * @returns {Promise<Object>} Object with key-value pairs
     */
    async mget(keys) {
        if (!this.isConnected || !this.client) {
            return {};
        }

        try {
            const values = await this.client.mGet(keys);
            const result = {};
            
            keys.forEach((key, index) => {
                const value = values[index];
                if (value !== null) {
                    try {
                        result[key] = JSON.parse(value);
                    } catch {
                        result[key] = value;
                    }
                } else {
                    result[key] = null;
                }
            });

            return result;
        } catch (error) {
            console.error('[Redis] MGET error:', error.message);
            return {};
        }
    }

    /**
     * Close Redis connection
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
                console.log('[Redis] Disconnected');
            } catch (error) {
                console.error('[Redis] Disconnect error:', error.message);
            } finally {
                this.isConnected = false;
            }
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Stats object
     */
    async getStats() {
        if (!this.isConnected || !this.client) {
            return { connected: false };
        }

        try {
            const info = await this.client.info('stats');
            return {
                connected: true,
                isConfigured: this.isConfigured,
                info: info.substring(0, 500) // Truncate for readability
            };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
