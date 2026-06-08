/**
 * Async Postgres Query Wrapper
 * Provides SQLite-compatible interface (.get, .all, .run, .transaction)
 * over Postgres via node-postgres pool.
 *
 * Usage:
 *   const db = require('../db/query');
 *   await db.get('SELECT * FROM users WHERE id = $1', [id]);
 *   await db.all('SELECT * FROM users');
 *   await db.run('UPDATE users SET name = $1 WHERE id = $2', [name, id]);
 */

const pg = require('../config/postgres');

module.exports = {
  /**
   * Get a single row (like stmt.get())
   * @returns {object|null}
   */
  get: async (sql, params = []) => {
    const result = await pg.query(sql, params);
    return result.rows[0] || null;
  },

  /**
   * Get all rows (like stmt.all())
   * @returns {Array}
   */
  all: async (sql, params = []) => {
    const result = await pg.query(sql, params);
    return result.rows;
  },

  /**
   * Execute a write query (like stmt.run())
   * @returns {{ changes: number, lastInsertRowid: null }}
   */
  run: async (sql, params = []) => {
    const result = await pg.query(sql, params);
    return { changes: result.rowCount || 0, lastInsertRowid: null };
  },

  /**
   * Execute a transaction wrapping an async function
   * @param {Function} fn - async (db) => { ... }
   * @returns {*} Return value of fn
   */
  transaction: async (fn) => {
    await pg.query('BEGIN');
    try {
      const result = await fn(module.exports);
      await pg.query('COMMIT');
      return result;
    } catch (err) {
      await pg.query('ROLLBACK');
      throw err;
    }
  }
};
