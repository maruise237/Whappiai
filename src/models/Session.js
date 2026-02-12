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

const SESSION_DIR = path.join(process.cwd(), 'auth_info_baileys');

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
            return existingSession; // Just return if already exists
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
        return stmt.get(sessionId);
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
        if (isAdmin || !ownerEmail) {
            const stmt = db.prepare('SELECT * FROM whatsapp_sessions ORDER BY created_at DESC');
            return stmt.all();
        }

        const stmt = db.prepare('SELECT * FROM whatsapp_sessions WHERE owner_email = ? ORDER BY created_at DESC');
        return stmt.all(ownerEmail);
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
        if (pairingCode) {
            const stmt = db.prepare(`
                UPDATE whatsapp_sessions 
                SET status = ?, detail = ?, pairing_code = ?, updated_at = datetime('now')
                WHERE id = ?
            `);
            stmt.run(status, detail, pairingCode, sessionId);
        } else {
            const stmt = db.prepare(`
                UPDATE whatsapp_sessions 
                SET status = ?, detail = ?, updated_at = datetime('now')
                WHERE id = ?
            `);
            stmt.run(status, detail, sessionId);
        }
        return this.findById(sessionId);
    }

    /**
     * Update AI configuration for a session
     * @param {string} sessionId - Session ID
     * @param {object} aiConfig - AI configuration object
     * @returns {object} Updated session
     */
    static updateAIConfig(sessionId, aiConfig) {
        const { enabled, endpoint, key, model, prompt, mode, temperature, max_tokens } = aiConfig;
        
        // Handle undefined values to prevent overwriting existing ones with null if not provided
        const existing = this.findById(sessionId);
        if (!existing) return null;

        const stmt = db.prepare(`
            UPDATE whatsapp_sessions 
            SET ai_enabled = ?, ai_endpoint = ?, ai_key = ?, ai_model = ?, ai_prompt = ?, ai_mode = ?, 
                ai_temperature = ?, ai_max_tokens = ?, updated_at = datetime('now')
            WHERE id = ?
        `);
        
        stmt.run(
            enabled !== undefined ? (enabled ? 1 : 0) : existing.ai_enabled, 
            endpoint !== undefined ? endpoint : existing.ai_endpoint, 
            key !== undefined ? key : existing.ai_key, 
            model !== undefined ? model : existing.ai_model, 
            prompt !== undefined ? prompt : existing.ai_prompt, 
            mode !== undefined ? mode : (existing.ai_mode || 'bot'), 
            temperature !== undefined ? temperature : (existing.ai_temperature ?? 0.7), 
            max_tokens !== undefined ? max_tokens : (existing.ai_max_tokens ?? 1000), 
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
