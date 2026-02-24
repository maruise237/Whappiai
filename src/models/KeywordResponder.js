/**
 * KeywordResponder Model
 * Manages keyword-based auto-responses
 */

const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class KeywordResponder {
    /**
     * Find all rules for a session
     */
    static findBySessionId(sessionId) {
        return db.prepare('SELECT * FROM keyword_responders WHERE session_id = ? ORDER BY created_at DESC').all(sessionId);
    }

    /**
     * Find active rules for a session
     */
    static findActiveBySessionId(sessionId) {
        return db.prepare('SELECT * FROM keyword_responders WHERE session_id = ? AND is_active = 1').all(sessionId);
    }

    /**
     * Find rule by ID
     */
    static findById(id) {
        return db.prepare('SELECT * FROM keyword_responders WHERE id = ?').get(id);
    }

    /**
     * Create a new rule
     */
    static create(data) {
        const { session_id, keyword, match_type, response_type, response_content, file_name } = data;
        const id = uuidv4();

        db.prepare(`
            INSERT INTO keyword_responders (
                id, session_id, keyword, match_type, response_type, response_content, file_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, session_id, keyword, match_type || 'contains', response_type || 'text', response_content, file_name || null);

        return this.findById(id);
    }

    /**
     * Update a rule
     */
    static update(id, data) {
        const { keyword, match_type, response_type, response_content, file_name, is_active } = data;

        db.prepare(`
            UPDATE keyword_responders
            SET keyword = COALESCE(?, keyword),
                match_type = COALESCE(?, match_type),
                response_type = COALESCE(?, response_type),
                response_content = COALESCE(?, response_content),
                file_name = COALESCE(?, file_name),
                is_active = COALESCE(?, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(keyword, match_type, response_type, response_content, file_name, is_active, id);

        return this.findById(id);
    }

    /**
     * Delete a rule
     */
    static delete(id) {
        return db.prepare('DELETE FROM keyword_responders WHERE id = ?').run(id);
    }
}

module.exports = KeywordResponder;
