/**
 * SessionStore - Redis-backed Express session store + API token store
 *
 * Replaces:
 *   - session-file-store (Express sessions on filesystem)
 *   - sessionTokens = new Map()    (API tokens in memory)
 *
 * Safe for multi-instance:
 *   - Express sessions survive restarts
 *   - API tokens survive restarts
 *   - Both are shared across instances
 */

const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');
const { log } = require('../utils/logger');

const TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

class SessionStore {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.store = null;
  }

  /**
   * Initialize Redis connection
   * @param {Object} sessionModule - kept for compatibility with existing bootstrap code
   * @returns {Promise<{store: RedisStore|null, isConnected: boolean}>}
   */
  async connect(sessionModule) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      log('[SessionStore] No REDIS_URL configured - using local in-memory session store for non-production runtime', 'SYSTEM', { event: 'session-store-fallback' }, 'WARN');
      return { store: null, isConnected: false };
    }

    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              log('[SessionStore] Max Redis retries reached', 'SYSTEM', { event: 'redis-max-retries' }, 'ERROR');
              return new Error('Max retries reached');
            }
            return Math.min(retries * 200, 5000);
          },
          connectTimeout: 10000,
        },
      });

      this.client.on('error', (err) => {
        log(`[SessionStore] Redis error: ${err.message}`, 'SYSTEM', { event: 'redis-error' }, 'ERROR');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        log('[SessionStore] Redis connected', 'SYSTEM', { event: 'redis-connected' }, 'INFO');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        this.isConnected = false;
      });

      await this.client.connect();

      this.store = new RedisStore({
        client: this.client,
        prefix: 'whappi:sess:',
        ttl: 86400,
        disableTTL: false,
      });

      log('[SessionStore] Redis session store initialized', 'SYSTEM', { event: 'session-store-ready' }, 'INFO');
      return { store: this.store, isConnected: true };
    } catch (error) {
      log(`[SessionStore] Connection failed: ${error.message}`, 'SYSTEM', { event: 'session-store-error' }, 'ERROR');
      this.isConnected = false;
      return { store: null, isConnected: false };
    }
  }

  /**
   * Get a session token from Redis
   * @param {string} sessionId
   * @returns {Promise<string|null>}
   */
  async getToken(sessionId) {
    if (!this.isConnected || !this.client) return null;
    try {
      return await this.client.get(`whappi:token:${sessionId}`);
    } catch (err) {
      log(`[SessionStore] getToken error: ${err.message}`, 'SYSTEM', null, 'ERROR');
      return null;
    }
  }

  /**
   * Set a session token in Redis with TTL
   * @param {string} sessionId
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  async setToken(sessionId, token) {
    if (!this.isConnected || !this.client) return false;
    try {
      await this.client.setEx(`whappi:token:${sessionId}`, TOKEN_TTL, token);
      return true;
    } catch (err) {
      log(`[SessionStore] setToken error: ${err.message}`, 'SYSTEM', null, 'ERROR');
      return false;
    }
  }

  /**
   * Delete a session token from Redis
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async deleteToken(sessionId) {
    if (!this.isConnected || !this.client) return false;
    try {
      await this.client.del(`whappi:token:${sessionId}`);
      return true;
    } catch (err) {
      log(`[SessionStore] deleteToken error: ${err.message}`, 'SYSTEM', null, 'ERROR');
      return false;
    }
  }

  /**
   * Check if a token exists
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async hasToken(sessionId) {
    if (!this.isConnected || !this.client) return false;
    try {
      const exists = await this.client.exists(`whappi:token:${sessionId}`);
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * List all token keys (admin)
   * @returns {Promise<string[]>}
   */
  async listTokens() {
    if (!this.isConnected || !this.client) return [];
    try {
      const keys = await this.client.keys('whappi:token:*');
      return keys.map((key) => key.replace('whappi:token:', ''));
    } catch {
      return [];
    }
  }

  /**
   * Graceful disconnect
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        log('[SessionStore] Disconnected', 'SYSTEM', { event: 'session-store-disconnected' }, 'INFO');
      } catch (err) {
        log(`[SessionStore] Disconnect error: ${err.message}`, 'SYSTEM', null, 'ERROR');
      } finally {
        this.isConnected = false;
        this.client = null;
        this.store = null;
      }
    }
  }
}

const sessionStore = new SessionStore();
module.exports = sessionStore;
