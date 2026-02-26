/**
 * WhatsApp Session Model
 * SQLite-based session metadata management
 * Note: Actual auth credentials stored in auth_info_baileys folder
 */

const { db } = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { log } = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/crypto');

const SESSION_DIR = path.join(process.cwd(), 'auth_info_baileys');
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

class Session {
    /**
     * Create a new session
     * @param {string} sessionId - Session ID
     * @param {string} ownerEmail - Owner's email
     * @returns {object} Created session
     */
    static create(sessionId, ownerEmail = null) {
        const existingSession = this.findById(sessionId);
        if (existingSession) {
            // If the session exists but has no owner or is owned by admin@localhost,
            // and we have a specific ownerEmail, let's "claim" it for the new user.
            if (ownerEmail && (existingSession.owner_email === 'admin@localhost' || !existingSession.owner_email)) {
                log(`Session orpheline ${sessionId} revendiquée par ${ownerEmail}`, 'SYSTEM', { sessionId, ownerEmail }, 'INFO');
                const stmt = db.prepare('UPDATE whatsapp_sessions SET owner_email = ?, updated_at = datetime(\'now\') WHERE id = ?');
                stmt.run(ownerEmail.toLowerCase().trim(), sessionId);
                return this.findById(sessionId);
            }
            return existingSession; // Just return if already exists and owned
        }

        const token = crypto.randomUUID();

        const stmt = db.prepare(`
            INSERT INTO whatsapp_sessions (id, owner_email, token, status, created_at, updated_at)
            VALUES (?, ?, ?, 'DISCONNECTED', datetime('now'), datetime('now'))
        `);

        stmt.run(sessionId, ownerEmail, token);

        return this.findById(sessionId);
    }

    /**
     * Find session by owner email
     * @param {string} email - Owner email
     * @returns {object|null} Session object or null
     */
    static findByOwnerEmail(email) {
        const stmt = db.prepare('SELECT * FROM whatsapp_sessions WHERE owner_email = ?');
        return stmt.get(email?.toLowerCase());
    }

    /**
     * Find session by ID
     * @param {string} sessionId - Session ID
     * @returns {object|null} Session object or null
     */
    static findById(sessionId) {
        const stmt = db.prepare('SELECT * FROM whatsapp_sessions WHERE id = ?');
        const session = stmt.get(sessionId);

        if (session && session.ai_key && session.ai_key.includes(':')) {
            try {
                session.ai_key = decrypt(session.ai_key, ENCRYPTION_KEY);
            } catch (e) {
                log(`Failed to decrypt AI key for session ${sessionId}`, 'SECURITY', { error: e.message }, 'ERROR');
            }
        }

        return session;
    }

    /**
     * Find session by token
     * @param {string} token - Session token
     * @returns {object|null} Session object or null
     */
    static findByToken(token) {
        const stmt = db.prepare('SELECT * FROM whatsapp_sessions WHERE token = ?');
        return stmt.get(token);
    }

    /**
     * Get all sessions
     * @param {string} ownerEmail - Filter by owner (optional)
     * @param {boolean} isAdmin - If true, return all sessions
     * @returns {array} Array of sessions
     */
    static getAll(ownerEmail = null, isAdmin = false) {
        // SECURITY: Only admins (with explicit isAdmin=true) can see all sessions.
        // If ownerEmail is null/empty AND not admin → return EMPTY list to prevent data leak.
        if (isAdmin === true) {
            const stmt = db.prepare('SELECT * FROM whatsapp_sessions ORDER BY created_at DESC');
            return stmt.all();
        }

        if (!ownerEmail || typeof ownerEmail !== 'string' || ownerEmail.trim() === '') {
            log('Session.getAll called without ownerEmail and without admin flag — returning empty list for security', 'SECURITY', null, 'WARN');
            return [];
        }

        const stmt = db.prepare('SELECT * FROM whatsapp_sessions WHERE owner_email = ? ORDER BY created_at DESC');
        return stmt.all(ownerEmail.toLowerCase().trim());
    }

    /**
     * Update session status
     * @param {string} sessionId - Session ID
     * @param {string} status - New status
     * @param {string} detail - Status detail
     * @param {string} pairingCode - Optional pairing code
     * @returns {object} Updated session
     */
    static updateStatus(sessionId, status, detail = null, pairingCode = null) {
        const stmt = db.prepare(`
            UPDATE whatsapp_sessions
            SET status = ?, detail = ?, pairing_code = ?, updated_at = datetime('now')
            WHERE id = ?
        `);
        stmt.run(status, detail, pairingCode, sessionId);
        return this.findById(sessionId);
    }

    /**
     * Update AI configuration for a session
     * @param {string} sessionId - Session ID
     * @param {object} aiConfig - AI configuration object
     * @returns {object} Updated session
     */
    static updateAIConfig(sessionId, aiConfig) {
        // Map common aliases from frontend
        const enabled = aiConfig.enabled !== undefined ? aiConfig.enabled : aiConfig.ai_enabled;
        const endpoint = aiConfig.endpoint || aiConfig.api_endpoint || aiConfig.ai_endpoint;
        const key = aiConfig.key || aiConfig.api_key || aiConfig.ai_key;

        const {
            model, prompt, mode, temperature, max_tokens,
            deactivate_on_typing, deactivate_on_read, trigger_keywords,
            reply_delay, read_on_reply, reject_calls,
            random_protection_enabled, random_protection_rate,
            constraints, session_window, respond_to_tags,
            delay_min, delay_max
        } = aiConfig;

        // Handle undefined values to prevent overwriting existing ones with null if not provided
        const existing = this.findById(sessionId);
        if (!existing) return null;

        // Secure key storage: encrypt before saving
        let encryptedKey = key;
        if (key !== undefined && key && !key.includes(':')) {
            encryptedKey = encrypt(key, ENCRYPTION_KEY);
        }

        const stmt = db.prepare(`
            UPDATE whatsapp_sessions 
            SET ai_enabled = ?, ai_endpoint = ?, ai_key = ?, ai_model = ?, ai_prompt = ?, ai_mode = ?, 
                ai_temperature = ?, ai_max_tokens = ?, 
                ai_deactivate_on_typing = ?, ai_deactivate_on_read = ?, ai_trigger_keywords = ?,
                ai_reply_delay = ?, ai_read_on_reply = ?, ai_reject_calls = ?,
                ai_random_protection_enabled = ?, ai_random_protection_rate = ?,
                ai_constraints = ?, ai_session_window = ?, ai_respond_to_tags = ?,
                ai_delay_min = ?, ai_delay_max = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `);

        stmt.run(
            enabled !== undefined ? (enabled ? 1 : 0) : existing.ai_enabled,
            endpoint !== undefined ? endpoint : existing.ai_endpoint,
            encryptedKey !== undefined ? encryptedKey : existing.ai_key,
            model !== undefined ? model : existing.ai_model,
            prompt !== undefined ? prompt : existing.ai_prompt,
            mode !== undefined ? mode : (existing.ai_mode || 'bot'),
            temperature !== undefined ? temperature : (existing.ai_temperature ?? 0.7),
            max_tokens !== undefined ? max_tokens : (existing.ai_max_tokens ?? 1000),
            deactivate_on_typing !== undefined ? (deactivate_on_typing ? 1 : 0) : existing.ai_deactivate_on_typing,
            deactivate_on_read !== undefined ? (deactivate_on_read ? 1 : 0) : existing.ai_deactivate_on_read,
            trigger_keywords !== undefined ? trigger_keywords : existing.ai_trigger_keywords,
            reply_delay !== undefined ? reply_delay : existing.ai_reply_delay,
            read_on_reply !== undefined ? (read_on_reply ? 1 : 0) : existing.ai_read_on_reply,
            reject_calls !== undefined ? (reject_calls ? 1 : 0) : existing.ai_reject_calls,
            random_protection_enabled !== undefined ? (random_protection_enabled ? 1 : 0) : (existing.ai_random_protection_enabled ?? 1),
            random_protection_rate !== undefined ? random_protection_rate : (existing.ai_random_protection_rate ?? 0.1),
            constraints !== undefined ? constraints : existing.ai_constraints,
            session_window !== undefined ? session_window : (existing.ai_session_window ?? 5),
            respond_to_tags !== undefined ? (respond_to_tags ? 1 : 0) : existing.ai_respond_to_tags,
            delay_min !== undefined ? delay_min : (existing.ai_delay_min ?? 1),
            delay_max !== undefined ? delay_max : (existing.ai_delay_max ?? 5),
            sessionId
        );
        return this.findById(sessionId);
    }

    /**
     * Update AI stats (increment counters)
     * @param {string} sessionId - Session ID
     * @param {string} type - 'received' or 'sent'
     * @param {string} error - Optional error message
     */
    static updateAIStats(sessionId, type, error = null) {
        if (type === 'received') {
            const stmt = db.prepare(`
                UPDATE whatsapp_sessions 
                SET ai_messages_received = ai_messages_received + 1,
                    ai_last_message_at = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
            `);
            stmt.run(sessionId);
        } else if (type === 'sent') {
            const stmt = db.prepare(`
                UPDATE whatsapp_sessions 
                SET ai_messages_sent = ai_messages_sent + 1,
                    updated_at = datetime('now')
                WHERE id = ?
            `);
            stmt.run(sessionId);
        }

        if (error) {
            const stmt = db.prepare(`
                UPDATE whatsapp_sessions 
                SET ai_last_error = ?, updated_at = datetime('now')
                WHERE id = ?
            `);
            stmt.run(error, sessionId);
        }
    }

    /**
     * Delete session
     * @param {string} sessionId - Session ID
     * @returns {boolean} True if deleted
     */
    static delete(sessionId) {
        const stmt = db.prepare('DELETE FROM whatsapp_sessions WHERE id = ?');
        const result = stmt.run(sessionId);
        return result.changes > 0;
    }

    /**
     * Get session token
     * @param {string} sessionId - Session ID
     * @returns {string|null} Token or null
     */
    static getToken(sessionId) {
        const session = this.findById(sessionId);
        return session ? session.token : null;
    }

    /**
     * Validate token for a session
     * @param {string} sessionId - Session ID
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid
     */
    static validateToken(sessionId, token) {
        const session = this.findById(sessionId);
        return session && session.token === token;
    }

    /**
     * Count active sessions
     * @returns {number} Count of non-disconnected sessions
     */
    static countActive() {
        const stmt = db.prepare(`
            SELECT COUNT(*) as count FROM whatsapp_sessions 
            WHERE status NOT IN ('DISCONNECTED', 'DELETED')
        `);
        return stmt.get().count;
    }

    /**
     * Get sessions by owner
     * @param {string} ownerEmail - Owner's email
     * @returns {array} Array of session IDs
     */
    static getSessionIdsByOwner(ownerEmail) {
        const stmt = db.prepare('SELECT id FROM whatsapp_sessions WHERE owner_email = ?');
        return stmt.all(ownerEmail.toLowerCase()).map(s => s.id);
    }

    /**
     * Sync database with filesystem
     * Detects session folders that are not in the DB and adds them
     */
    static syncWithFilesystem() {
        if (!fs.existsSync(SESSION_DIR)) {
            return;
        }

        const entries = fs.readdirSync(SESSION_DIR, { withFileTypes: true });
        const directories = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(name => {
                // Ensure it's a valid session folder (contains creds.json)
                const credsExists = fs.existsSync(path.join(SESSION_DIR, name, 'creds.json'));
                return credsExists;
            });

        log(`[Session] Trouvé ${directories.length} dossier(s) de session valide(s) sur le disque`, 'SYSTEM', { count: directories.length }, 'INFO');

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO whatsapp_sessions (id, owner_email, token, status, created_at, updated_at)
            VALUES (?, 'admin@localhost', ?, 'DISCONNECTED', datetime('now'), datetime('now'))
        `);

        let addedCount = 0;
        for (const sessionId of directories) {
            // Check if exists
            const exists = this.findById(sessionId);
            if (!exists) {
                const token = crypto.randomUUID();
                insertStmt.run(sessionId, token);
                addedCount++;
                log(`[Session] Session orpheline enregistrée depuis le disque: ${sessionId}`, 'SYSTEM', { sessionId }, 'INFO');
            }
        }

        if (addedCount > 0) {
            log(`[Session] Synchronisation de ${addedCount} sessions du disque vers la base de données`, 'SYSTEM', { count: addedCount }, 'INFO');
        }
    }
}

module.exports = Session;
