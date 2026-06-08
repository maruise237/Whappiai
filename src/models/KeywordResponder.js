/**
 * KeywordResponder Model
 * Manages keyword-based auto-responses
 */

const db = require('../db/query');
const { v4: uuidv4 } = require('uuid');

class KeywordResponder {
    /**
     * Find all rules for a session
     */
    static async findBySessionId(sessionId) {
        return db.all('SELECT * FROM keyword_responders WHERE session_id = $1 ORDER BY created_at DESC', [sessionId]);
    }

    /**
     * Find active rules for a session
     */
    static async findActiveBySessionId(sessionId) {
        return db.all('SELECT * FROM keyword_responders WHERE session_id = $1 AND is_active = 1', [sessionId]);
    }

    /**
     * Find rule by ID
     */
    static async findById(id) {
        return db.get('SELECT * FROM keyword_responders WHERE id = $1', [id]);
    }

    /**
     * Create a new rule
     */
    static async create(data) {
        const { session_id, keyword, match_type, response_type, response_content, file_name } = data;
        const id = uuidv4();

        await db.run(`
            INSERT INTO keyword_responders (
                id, session_id, keyword, match_type, response_type, response_content, file_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, session_id, keyword, match_type || 'contains', response_type || 'text', response_content, file_name || null]);

        return this.findById(id);
    }

    /**
     * Update a rule
     */
    static async update(id, data) {
        const { keyword, match_type, response_type, response_content, file_name, is_active } = data;

        await db.run(`
            UPDATE keyword_responders
            SET keyword = COALESCE($1, keyword),
                match_type = COALESCE($2, match_type),
                response_type = COALESCE($3, response_type),
                response_content = COALESCE($4, response_content),
                file_name = COALESCE($5, file_name),
                is_active = COALESCE($6, is_active),
                updated_at = NOW()
            WHERE id = $7
        `, [keyword, match_type, response_type, response_content, file_name, is_active, id]);

        return this.findById(id);
    }

    /**
     * Delete a rule
     */
    static async delete(id) {
        const result = await db.run('DELETE FROM keyword_responders WHERE id = $1', [id]);
        return result;
    }
}

module.exports = KeywordResponder;
