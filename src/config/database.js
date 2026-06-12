/**
 * Legacy SQLite entrypoint kept for backward compatibility with old tests and
 * maintenance scripts.
 *
 * The active Whappi runtime uses Postgres via `src/db/query.js`. Production
 * must not boot through this module unless an explicit legacy override is set.
 */

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LEGACY_SQLITE_RUNTIME !== '1') {
    throw new Error(
        'Legacy SQLite runtime is disabled in production. Use src/db/query.js with Postgres, or set ALLOW_LEGACY_SQLITE_RUNTIME=1 only for controlled migration work.'
    );
}

module.exports = require('./sqliteLegacy');
