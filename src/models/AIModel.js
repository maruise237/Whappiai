/**
 * AI Model Model
 * Admin-configured AI models for users to choose from
 */

const { db } = require('../config/database');
const { randomUUID } = require('crypto');
const { log } = require('../utils/logger');
const { encrypt, decrypt } = require('../utils/crypto');

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

class AIModel {
    /**
     * Create a new AI Model
     * @param {object} data - Model data
     * @returns {object} Created model
     */
    static create(data) {
        const id = randomUUID();

        // Support field name aliases from frontend
        const endpoint = data.endpoint || data.api_endpoint;
        const model_name = data.model_name || data.model_code;
        let api_key = data.api_key;

        let { 
            name, provider,
            description = '', is_active = 1, is_default = 0,
            temperature = 0.7, max_tokens = 2000
        } = data;

        // Secure key storage
        if (api_key && !api_key.includes(':')) {
            api_key = encrypt(api_key, ENCRYPTION_KEY);
        }

        // Normalize booleans for SQLite
        is_active = is_active === true || is_active === 1 || is_active === '1' ? 1 : 0;
        is_default = is_default === true || is_default === 1 || is_default === '1' ? 1 : 0;

        // If this is set as default, unset other defaults
        if (is_default) {
            db.prepare('UPDATE ai_models SET is_default = 0').run();
        }

        const stmt = db.prepare(`
            INSERT INTO ai_models (
                id, name, provider, endpoint, api_key, model_name, 
                description, is_active, is_default, temperature, max_tokens
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id, name, provider, endpoint, api_key, model_name, 
            description, is_active, is_default, temperature, max_tokens
        );

        return this.findById(id);
    }

    /**
     * Find model by ID
     * @param {string} id - Model ID
     * @returns {object|null} Model object or null
     */
    static findById(id) {
        const stmt = db.prepare('SELECT * FROM ai_models WHERE id = ?');
        const model = stmt.get(id);

        if (model && model.api_key && model.api_key.includes(':')) {
            try {
                model.api_key = decrypt(model.api_key, ENCRYPTION_KEY);
            } catch (e) {
                log(`Failed to decrypt API key for model ${id}`, 'SECURITY', { error: e.message }, 'ERROR');
            }
        }

        return model;
    }

    /**
     * Get all AI models
     * @param {boolean} onlyActive - Only return active models
     * @returns {array} Array of models
     */
    static getAll(onlyActive = false) {
        let query = 'SELECT * FROM ai_models';
        if (onlyActive) {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY is_default DESC, name ASC';
        
        const stmt = db.prepare(query);
        return stmt.all();
    }

    /**
     * Get default AI model
     * @returns {object|null} Default model or null
     */
    static getDefault() {
        const stmt = db.prepare('SELECT * FROM ai_models WHERE is_default = 1 AND is_active = 1 LIMIT 1');
        const model = stmt.get();
        if (model) {
            return this.findById(model.id); // Ensure decryption
        }
        return null;
    }

    /**
     * Update AI model
     * @param {string} id - Model ID
     * @param {object} data - New data
     * @returns {object} Updated model
     */
    static update(id, data) {
        const existing = this.findById(id);
        if (!existing) return null;

        // Handle is_default logic
        if (data.is_default) {
            db.prepare('UPDATE ai_models SET is_default = 0 WHERE id != ?').run(id);
        }

        // Support field name aliases from frontend (endpoint -> api_endpoint etc if needed)
        const mappedData = { ...data };
        if (data.api_endpoint) mappedData.endpoint = data.api_endpoint;
        if (data.api_key) mappedData.api_key = data.api_key;
        if (data.model_code) mappedData.model_name = data.model_code;

        const allowedFields = ['name', 'provider', 'endpoint', 'api_key', 'model_name', 'description', 'is_active', 'is_default', 'temperature', 'max_tokens'];
        const fields = Object.keys(mappedData).filter(key => allowedFields.includes(key));
        
        if (fields.length === 0) return existing;

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => {
            let val = mappedData[field];
            // Normalize booleans for SQLite
            if (field === 'is_active' || field === 'is_default') {
                return val === true || val === 1 || val === '1' ? 1 : 0;
            }
            // Secure key storage
            if (field === 'api_key' && val && !val.includes(':')) {
                return encrypt(val, ENCRYPTION_KEY);
            }
            return val;
        });
        values.push(id);

        const stmt = db.prepare(`
            UPDATE ai_models 
            SET ${setClause}, updated_at = datetime('now')
            WHERE id = ?
        `);

        stmt.run(...values);
        return this.findById(id);
    }

    /**
     * Delete AI model
     * @param {string} id - Model ID
     * @returns {boolean} Success
     */
    static delete(id) {
        const stmt = db.prepare('DELETE FROM ai_models WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Ensure DeepSeek is configured as the default "Whappi AI" model
     * This is called on startup to guarantee a default model exists
     */
    static ensureDefaultDeepSeek() {
        try {
            // Check if any default model already exists
            const existingDefault = this.getDefault();
            if (existingDefault) {
                // If it's already "Whappi AI", we're good
                if (existingDefault.name === 'Whappi AI') {
                    return existingDefault;
                }
                // If there's another default but it's not Whappi AI, we don't force it 
                // unless we want to override. User said "configure deepseek comme defaut"
                // which implies we should make sure it's there and default.
            }

            // Check if "Whappi AI" exists at all
            const whappiAI = db.prepare('SELECT * FROM ai_models WHERE name = ?').get('Whappi AI');
            
            if (whappiAI) {
                // If it exists but is not default, make it default
                if (!whappiAI.is_default) {
                    this.update(whappiAI.id, { is_default: 1 });
                }
                return this.findById(whappiAI.id);
            }

            // Create it if it doesn't exist
            log('Initialisation du modèle DeepSeek par défaut (Whappi AI)...', 'SYSTEM');
            return this.create({
                name: 'Whappi AI',
                provider: 'deepseek',
                endpoint: 'https://api.deepseek.com/v1/chat/completions',
                api_key: 'YOUR_API_KEY_HERE', // Should be replaced by admin
                model_name: 'deepseek-chat',
                description: 'Modèle IA par défaut de Whappi (propulsé par DeepSeek)',
                is_active: 1,
                is_default: 1,
                temperature: 0.7,
                max_tokens: 2000
            });
        } catch (err) {
            log(`Erreur lors de l'initialisation du modèle par défaut: ${err.message}`, 'SYSTEM', null, 'ERROR');
            return null;
        }
    }
}

module.exports = AIModel;
