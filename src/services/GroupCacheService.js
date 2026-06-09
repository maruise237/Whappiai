/**
 * Group Cache Service
 * Stocke les groupes WhatsApp en PostgreSQL pour un affichage instantané.
 * Le refresh WhatsApp se fait en arrière-plan — l'utilisateur ne patiente jamais.
 */
const db = require('../db/query');
const { log } = require('../utils/logger');

// Staleness threshold — refresh if data is older than this (default 2 min)
const STALE_MS = parseInt(process.env.GROUP_CACHE_STALE_MS || '120000', 10);
// Hard TTL — force refresh if data is older than this (default 10 min)
const TTL_MS = parseInt(process.env.GROUP_CACHE_TTL_MS || '600000', 10);

/** Ensure group_cache table exists */
async function ensureTable() {
    await db.run(`
        CREATE TABLE IF NOT EXISTS group_cache (
            session_id TEXT PRIMARY KEY,
            groups_json TEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);
}

/** Get cached groups from DB (null if missing or expired) */
async function getCachedGroups(sessionId) {
    await ensureTable();
    const row = await db.get('SELECT groups_json, updated_at FROM group_cache WHERE session_id = $1', [sessionId]);
    if (!row) return null;

    const age = Date.now() - new Date(row.updated_at).getTime();
    if (age > TTL_MS) {
        // Hard expired — delete and return null
        await db.run('DELETE FROM group_cache WHERE session_id = $1', [sessionId]);
        return null;
    }

    try {
        const groups = JSON.parse(row.groups_json);
        return { groups, stale: age > STALE_MS, updated_at: row.updated_at };
    } catch {
        await db.run('DELETE FROM group_cache WHERE session_id = $1', [sessionId]);
        return null;
    }
}

/** Save groups to cache */
async function saveGroups(sessionId, groups) {
    await ensureTable();
    await db.run(
        'INSERT INTO group_cache (session_id, groups_json, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (session_id) DO UPDATE SET groups_json = $2, updated_at = NOW()',
        [sessionId, JSON.stringify(groups)]
    );
}

/**
 * Fetch fresh groups from Evolution API and update cache.
 * Logs errors but never throws — silent background refresh.
 */
async function refreshGroups(sessionId, provider) {
    const start = Date.now();
    try {
        const result = await provider.fetchGroups(sessionId);
        if (!result.ok) {
            log(`[GroupCache] refresh failed for ${sessionId}: ${result.error}`, sessionId, null, 'WARN');
            return;
        }
        await saveGroups(sessionId, result.groups);
        log(`[GroupCache] refreshed ${sessionId} (${result.groups.length} groups) in ${Date.now() - start}ms`, sessionId, null, 'INFO');
    } catch (err) {
        log(`[GroupCache] refresh error for ${sessionId}: ${err.message}`, sessionId, null, 'WARN');
    }
}

module.exports = { getCachedGroups, saveGroups, refreshGroups };
