/**
 * WhatsApp Session Model
 * Postgres-based session metadata management
 * Session transport is provider-managed (Evolution API)
 */

const db = require('../db/query');
const crypto = require('crypto');
const { log } = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/crypto');

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

class Session {
    static normalizeOwnerEmail(value) {
        return typeof value === 'string' ? value.toLowerCase().trim() : '';
    }

    static getOwnerAliases(owner) {
        if (!owner) return [];

        if (typeof owner === 'string') {
            const normalized = this.normalizeOwnerEmail(owner);
            return normalized ? [normalized] : [];
        }

        const aliases = new Set();
        const email = this.normalizeOwnerEmail(owner.email);
        if (email) aliases.add(email);

        if (owner.id) {
            aliases.add(`clerk-${String(owner.id).toLowerCase().trim()}`);
        }

        return [...aliases].filter(Boolean);
    }

    static isClaimable(session) {
        if (!session) return false;
        const ownerEmail = this.normalizeOwnerEmail(session.owner_email);
        return !ownerEmail || ownerEmail === 'admin@localhost';
    }

    static isOwnedBy(session, owner) {
        if (!session) return false;
        const ownerEmail = this.normalizeOwnerEmail(session.owner_email);
        if (!ownerEmail) return false;
        return this.getOwnerAliases(owner).includes(ownerEmail);
    }

    static async updateOwner(sessionId, ownerEmail) {
        const normalized = this.normalizeOwnerEmail(ownerEmail);
        if (!normalized) return this.findById(sessionId);

        await db.run(
            'UPDATE whatsapp_sessions SET owner_email = $1, updated_at = NOW() WHERE id = $2',
            [normalized, sessionId]
        );
        return this.findById(sessionId);
    }
    /**
     * Create a new session
     * @param {string} sessionId - Session ID
     * @param {string} ownerEmail - Owner's email
     * @returns {object} Created session
     */
    static async create(sessionId, ownerEmail = null) {
        const existingSession = await this.findById(sessionId);
        const normalizedOwner = this.normalizeOwnerEmail(ownerEmail);
        if (existingSession) {
            // If the session exists but has no owner or is owned by admin@localhost,
            // and we have a specific ownerEmail, let's "claim" it for the new user.
            if (normalizedOwner && this.isClaimable(existingSession)) {
                log(`Session orpheline ${sessionId} revendiquée par ${normalizedOwner}`, 'SYSTEM', { sessionId, ownerEmail: normalizedOwner }, 'INFO');
                return this.updateOwner(sessionId, normalizedOwner);
            }
            return existingSession; // Just return if already exists and owned
        }

        const token = crypto.randomUUID();

        await db.run(`
            INSERT INTO whatsapp_sessions (id, owner_email, token, status, created_at, updated_at)
            VALUES ($1, $2, $3, 'DISCONNECTED', NOW(), NOW())
        `, [sessionId, normalizedOwner || null, token]);

        return this.findById(sessionId);
    }

    /**
     * Find session by owner email
     * @param {string} email - Owner email
     * @returns {object|null} Session object or null
     */
    static async findByOwnerEmail(email) {
        return db.get('SELECT * FROM whatsapp_sessions WHERE owner_email = $1', [email?.toLowerCase()]);
    }

    /**
     * Find session by ID
     * @param {string} sessionId - Session ID
     * @returns {object|null} Session object or null
     */
    static async findById(sessionId) {
        const session = await db.get('SELECT * FROM whatsapp_sessions WHERE id = $1', [sessionId]);

        if (session && session.ai_key && session.ai_key.includes(':')) {
            try {
                session.ai_key = decrypt(session.ai_key, ENCRYPTION_KEY);
            } catch (e) {
                log(`Failed to decrypt AI key for session ${sessionId}`, 'SECURITY', { error: e.message }, 'ERROR');
                session.ai_key = null;
            }
        }

        return session;
    }

    /**
     * Find session by token
     * @param {string} token - Session token
     * @returns {object|null} Session object or null
     */
    static async findByToken(token) {
        return db.get('SELECT * FROM whatsapp_sessions WHERE token = $1', [token]);
    }

    /**
     * Get all sessions
     * @param {string} ownerEmail - Filter by owner (optional)
     * @param {boolean} isAdmin - If true, return all sessions
     * @returns {array} Array of sessions
     */
    static async getAll(ownerEmail = null, isAdmin = false) {
        // SECURITY: Only admins (with explicit isAdmin=true) can see all sessions.
        // If ownerEmail is null/empty AND not admin → return EMPTY list to prevent data leak.
        if (isAdmin === true) {
            return db.all('SELECT * FROM whatsapp_sessions ORDER BY created_at DESC');
        }

        if (!ownerEmail || typeof ownerEmail !== 'string' || ownerEmail.trim() === '') {
            log('Session.getAll called without ownerEmail and without admin flag — returning empty list for security', 'SECURITY', null, 'WARN');
            return [];
        }

        return db.all('SELECT * FROM whatsapp_sessions WHERE owner_email = $1 ORDER BY created_at DESC', [ownerEmail.toLowerCase().trim()]);
    }

    /**
     * Update session status
     * @param {string} sessionId - Session ID
     * @param {string} status - New status
     * @param {string} detail - Status detail
     * @param {string} pairingCode - Optional pairing code
     * @returns {object} Updated session
     */
    static async updateStatus(sessionId, status, detail = null, pairingCode = undefined, qrCode = undefined) {
        const existing = await this.findById(sessionId);
        if (!existing) return null;

        // Partial update: only update if value is not undefined
        const newStatus = status !== undefined ? status : existing.status;
        const newDetail = detail !== undefined ? detail : existing.detail;
        // If status is DISCONNECTED, we explicitly clear QR and pairing code in the DB
        let newPairingCode = pairingCode !== undefined ? pairingCode : existing.pairing_code;
        let newQrCode = qrCode !== undefined ? qrCode : existing.qr_code;

        if (newStatus === 'DISCONNECTED' && pairingCode === undefined && qrCode === undefined) {
            newPairingCode = null;
            newQrCode = null;
        }

        await db.run(`
            UPDATE whatsapp_sessions
            SET status = $1, detail = $2, pairing_code = $3, qr_code = $4, updated_at = NOW()
            WHERE id = $5
        `, [newStatus, newDetail, newPairingCode, newQrCode, sessionId]);
        return this.findById(sessionId);
    }

    /**
     * Update AI configuration for a session
     * @param {string} sessionId - Session ID
     * @param {object} aiConfig - AI configuration object
     * @returns {object} Updated session
     */
    static async updateAIConfig(sessionId, aiConfig) {
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
        const existing = await this.findById(sessionId);
        if (!existing) return null;

        // Secure key storage: encrypt before saving
        let encryptedKey = key;
        if (key !== undefined && key && !key.includes(':')) {
            encryptedKey = encrypt(key, ENCRYPTION_KEY);
        }

        await db.run(`
            UPDATE whatsapp_sessions 
            SET ai_enabled = $1, ai_endpoint = $2, ai_key = $3, ai_model = $4, ai_prompt = $5, ai_mode = $6, 
                ai_temperature = $7, ai_max_tokens = $8, 
                ai_deactivate_on_typing = $9, ai_deactivate_on_read = $10, ai_trigger_keywords = $11,
                ai_reply_delay = $12, ai_read_on_reply = $13, ai_reject_calls = $14,
                ai_random_protection_enabled = $15, ai_random_protection_rate = $16,
                ai_constraints = $17, ai_session_window = $18, ai_respond_to_tags = $19,
                ai_delay_min = $20, ai_delay_max = $21,
                updated_at = NOW()
            WHERE id = $22
        `, [
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
        ]);
        return this.findById(sessionId);
    }

    /**
     * Update AI stats (increment counters)
     * @param {string} sessionId - Session ID
     * @param {string} type - 'received' or 'sent'
     * @param {string} error - Optional error message
     */
    static async updateAIStats(sessionId, type, error = null) {
        if (type === 'received') {
            await db.run(`
                UPDATE whatsapp_sessions 
                SET ai_messages_received = ai_messages_received + 1,
                    ai_last_message_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            `, [sessionId]);
        } else if (type === 'sent') {
            await db.run(`
                UPDATE whatsapp_sessions 
                SET ai_messages_sent = ai_messages_sent + 1,
                    updated_at = NOW()
                WHERE id = $1
            `, [sessionId]);
        }

        if (error) {
            await db.run(`
                UPDATE whatsapp_sessions 
                SET ai_last_error = $1, updated_at = NOW()
                WHERE id = $2
            `, [error, sessionId]);
        }
    }

    /**
     * Delete session
     * @param {string} sessionId - Session ID
     * @returns {boolean} True if deleted
     */
    static async delete(sessionId) {
        const result = await db.run('DELETE FROM whatsapp_sessions WHERE id = $1', [sessionId]);
        return result.changes > 0;
    }

    /**
     * Get session token
     * @param {string} sessionId - Session ID
     * @returns {string|null} Token or null
     */
    static async getToken(sessionId) {
        const session = await this.findById(sessionId);
        return session ? session.token : null;
    }

    /**
     * Validate token for a session
     * @param {string} sessionId - Session ID
     * @param {string} token - Token to validate
     * @returns {boolean} True if valid
     */
    static async validateToken(sessionId, token) {
        const session = await this.findById(sessionId);
        return session && session.token === token;
    }

    /**
     * Count active sessions
     * @returns {number} Count of non-disconnected sessions
     */
    static async countActive() {
        const result = await db.get(`
            SELECT COUNT(*) as count FROM whatsapp_sessions 
            WHERE status NOT IN ('DISCONNECTED', 'DELETED')
        `);
        return Number(result.count);
    }

    /**
     * Get sessions by owner
     * @param {string} ownerEmail - Owner's email
     * @returns {array} Array of session IDs
     */
    static async getSessionIdsByOwner(ownerEmail) {
        const rows = await db.all('SELECT id FROM whatsapp_sessions WHERE owner_email = $1', [this.normalizeOwnerEmail(ownerEmail)]);
        return rows.map(s => s.id);
    }

    /**
     * Legacy no-op kept for compatibility with older callers.
     * Session state is now provider-managed by Evolution API.
     */
    static syncWithFilesystem() {
        log('[Session] syncWithFilesystem skipped: Evolution API mode', 'SYSTEM', null, 'DEBUG');
    }
}

module.exports = Session;
