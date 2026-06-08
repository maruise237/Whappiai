/**
 * Redis-backed rate limit store for express-rate-limit
 *
 * Replaces the default in-memory store so rate limits survive restarts
 * and are shared across multiple API instances.
 *
 * Usage:
 *   const RedisStore = require('./rateLimitStore');
 *   const limiter = rateLimit({
 *     store: new RedisStore({ prefix: 'rl:webhook:' }),
 *     ...
 *   });
 */

const { createClient } = require('redis');

class RateLimitStore {
  /**
   * @param {object} options
   * @param {string} options.prefix - Redis key prefix (e.g. 'rl:api:')
   * @param {number} options.windowMs - Window in ms (default: 60000)
   */
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs || 60000;
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection (reuses existing client if possible)
   */
  async init() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('[RateLimitStore] No REDIS_URL — falling back to in-memory store');
      return false;
    }

    try {
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 5) return new Error('Max retries');
            return Math.min(retries * 200, 3000);
          },
          connectTimeout: 3000,
        },
      });

      this.client.on('error', () => {});
      await this.client.connect();
      this.isConnected = true;
      return true;
    } catch (err) {
      console.warn(`[RateLimitStore] Redis unavailable: ${err.message}`);
      return false;
    }
  }

  /**
   * express-rate-limit store API — increment hit count
   */
  async increment(key) {
    if (!this.isConnected || !this.client) {
      // Fallback: no-op (lets requests through)
      return { totalHits: 0, resetTime: undefined };
    }

    const redisKey = `${this.prefix}${key}`;
    const windowSeconds = Math.ceil(this.windowMs / 1000);

    try {
      const multi = this.client.multi();
      multi.incr(redisKey);
      multi.pexpire(redisKey, this.windowMs);
      const results = await multi.exec();
      const totalHits = results[0][1]; // INCR result
      return { totalHits, resetTime: undefined };
    } catch (err) {
      return { totalHits: 0, resetTime: undefined };
    }
  }

  /**
   * express-rate-limit store API — decrement hit count
   */
  async decrement(key) {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.decr(`${this.prefix}${key}`);
    } catch {}
  }

  /**
   * express-rate-limit store API — reset key
   */
  async resetKey(key) {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(`${this.prefix}${key}`);
    } catch {}
  }

  /**
   * Cleanup
   */
  async close() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
      } catch {}
      this.isConnected = false;
      this.client = null;
    }
  }
}

module.exports = RateLimitStore;
