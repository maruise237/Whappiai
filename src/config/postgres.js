/**
 * Postgres Database Connection
 * Provides async Postgres access via node-postgres pool.
 *
 * Usage:
 *   const pg = require('./config/postgres');
 *   await pg.query('SELECT * FROM users WHERE email = $1', [email]);
 */

const { Pool } = require('pg');

let pool = null;
let isConnected = false;

/**
 * Get or create the connection pool
 */
function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[Postgres] Pool error:', err.message);
  });

  return pool;
}

/**
 * Execute a query
 */
async function query(text, params = []) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not configured');
  return p.query(text, params);
}

/**
 * Test connection
 */
async function connect() {
  try {
    const p = getPool();
    if (!p) {
      console.warn('[Postgres] No DATABASE_URL configured');
      return false;
    }
    await p.query('SELECT 1');
    isConnected = true;
    console.log('[Postgres] Connected successfully');
    return true;
  } catch (err) {
    console.error('[Postgres] Connection failed:', err.message);
    isConnected = false;
    return false;
  }
}

/**
 * Close all connections
 */
async function disconnect() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}

module.exports = { query, connect, disconnect, getPool, isConnected: () => isConnected };
