/**
 * AI Model Model
 * Admin-configured AI models for users to choose from
 */

const db = require('../db/query');
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
    static async create(data) {
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

        // Normalize booleans for Postgres
        is_active = is_active === true || is_active === 1 || is_active === '1' ? 1 : 0;
        is_default = is_default === true || is_default === 1 || is_default === '1' ? 1 : 0;

        // If this is set as default, unset other defaults
        if (is_default) {
            await db.run('UPDATE ai_models SET is_default = 0');
        }

        await db.run(`
            INSERT INTO ai_models (
                id, name, provider, endpoint, api_key, model_name, 
                description, is_active, is_default, temperature, max_tokens
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
            id, name, provider, endpoint, api_key, model_name, 
            description, is_active, is_default, temperature, max_tokens
        ]);

        return this.findById(id);
    }

    /**
     * Find model by ID
     * @param {string} id - Model ID
     * @returns {object|null} Model object or null
     */
    static async findById(id) {
        const model = await db.get('SELECT * FROM ai_models WHERE id = $1', [id]);

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
    static async getAll(onlyActive = false) {
        let query = 'SELECT * FROM ai_models';
        const params = [];
        if (onlyActive) {
            query += ' WHERE is_active = 1';
        }
        query += ' ORDER BY is_default DESC, name ASC';
        
        return db.all(query, params);
    }

    /**
     * Get default AI model
     * @returns {object|null} Default model or null
     */
    static async getDefault() {
        const model = await db.get('SELECT * FROM ai_models WHERE is_default = 1 AND is_active = 1 LIMIT 1');
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
    static async update(id, data) {
        const existing = await this.findById(id);
        if (!existing) return null;

        // Handle is_default logic
        if (data.is_default) {
            await db.run('UPDATE ai_models SET is_default = 0 WHERE id != $1', [id]);
        }

        // Support field name aliases from frontend (endpoint -> api_endpoint etc if needed)
        const mappedData = { ...data };
        if (data.api_endpoint) mappedData.endpoint = data.api_endpoint;
        if (data.api_key) mappedData.api_key = data.api_key;
        if (data.model_code) mappedData.model_name = data.model_code;

        const allowedFields = ['name', 'provider', 'endpoint', 'api_key', 'model_name', 'description', 'is_active', 'is_default', 'temperature', 'max_tokens'];
        
        const fieldsToUpdate = [];
        const values = [];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(mappedData, field)) {
                fieldsToUpdate.push(`"${field}"`);

                let val = mappedData[field];
                // Normalize booleans for Postgres
                if (field === 'is_active' || field === 'is_default') {
                    val = (val === true || val === 1 || val === '1') ? 1 : 0;
                }
                // Secure key storage
                else if (field === 'api_key' && val && !val.includes(':')) {
                    val = encrypt(val, ENCRYPTION_KEY);
                }

                values.push(val);
            }
        }

        if (fieldsToUpdate.length === 0) return existing;

        const setClause = fieldsToUpdate.map((f, i) => `${f} = $${i + 1}`).join(', ');
        values.push(id);

        await db.run(`
            UPDATE ai_models 
            SET ${setClause}, updated_at = NOW()
            WHERE id = $${fieldsToUpdate.length + 1}
        `, values);
        return this.findById(id);
    }

    /**
     * Delete AI model
     * @param {string} id - Model ID
     * @returns {boolean} Success
     */
    static async delete(id) {
        const result = await db.run('DELETE FROM ai_models WHERE id = $1', [id]);
        return result.changes > 0;
    }

    /**
     * Ensure DeepSeek is configured as the default "Whappi AI" model
     * This is called on startup to guarantee a default model exists
     */
    static async ensureDefaultDeepSeek() {
        try {
            // Check if any default model already exists
            const existingDefault = await this.getDefault();
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
            const whappiAI = await db.get('SELECT * FROM ai_models WHERE name = $1', ['Whappi AI']);
            
            if (whappiAI) {
                // If it exists but is not default, make it default
                if (!whappiAI.is_default) {
                    await this.update(whappiAI.id, { is_default: 1 });
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
