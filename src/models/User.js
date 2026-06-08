/**
 * User Model
 * Postgres-based user management synced with Clerk
 */

const db = require('../db/query');
const bcrypt = require('../utils/bcrypt-compat');
const { log } = require('../utils/logger');
const crypto = require('crypto');

class User {
    /**
     * Create or Update a user from Clerk
     * @param {object} userData - User data
     * @returns {object} Created/Updated user
     */
    static async create({ id, email, name = null, role = 'user', imageUrl = null, createdBy = null }) {
        const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || '';
        const existingUser = await this.findById(id) || await this.findByEmail(email);

        const targetRole = MASTER_ADMIN_EMAIL && email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? 'admin' : role;
        
        if (existingUser) {
            await db.run(
                `UPDATE users SET email = $1, name = $2, role = $3, image_url = $4 WHERE id = $5`,
                [email.toLowerCase(), name, targetRole || existingUser.role, imageUrl, existingUser.id]
            );
            return this.findById(existingUser.id);
        }

        const normalizedEmail = email.toLowerCase();
        const userId = id || crypto.randomUUID();
        
        await db.run(
            `INSERT INTO users (
                id, email, name, password, role, image_url, created_by, created_at, 
                is_active, is_verified,
                plan_id, plan_status, message_limit, message_used, subscription_expiry
            )
            VALUES ($1, $2, $3, 'CLERK_EXTERNAL_AUTH', $4, $5, $6, NOW(), 1, 1,
                'trial', 'active', 60, 0, NOW() + INTERVAL '7 days'
            )
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                name = EXCLUDED.name,
                role = GREATEST(users.role::text, EXCLUDED.role::text)::user_role,
                image_url = EXCLUDED.image_url,
                updated_at = NOW()`,
            [userId, normalizedEmail, name, targetRole, imageUrl, createdBy]
        );

        // Add initial credit history
        try {
            await db.run(
                `INSERT INTO credit_history (id, user_id, amount, type, description)
                 VALUES ($1, $2, $3, 'bonus', $4)`,
                [crypto.randomUUID(), userId, 60, 'Crédits de bienvenue (Inscription)']
            );
        } catch (e) {
            log(`Error adding initial credits history: ${e.message}`, 'AUTH', null, 'ERROR');
        }

        return this.findById(userId);
    }

    /**
     * Find user by ID
     * @param {string} id - User ID
     * @returns {object|null} User object or null
     */
    static async findById(id) {
        if (!id) return null;
        
        const user = await db.get('SELECT * FROM users WHERE id = $1', [id]);
        
        if (!user && id === 'legacy-admin') {
            const adminUser = await this.findByEmail('admin@localhost');
            return adminUser ? this._sanitize(adminUser) : null;
        }

        return user ? this._sanitize(user) : null;
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {object|null} User object or null
     */
    static async findByEmail(email) {
        if (!email) return null;
        return db.get('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    }

    /**
     * Update AI configuration for a user
     * @param {string} id - User ID
     * @param {object} aiConfig - AI configuration object
     * @returns {object} Updated user
     */
    static async updateAIConfig(id, { enabled, prompt, model }) {
        if (!id) return null;
        
        await db.run(
            `UPDATE users SET ai_enabled = $1, ai_prompt = $2, ai_model = $3 WHERE id = $4`,
            [enabled ? 1 : 0, prompt, model, id]
        );
        return this.findById(id);
    }

    /**
     * Update user subscription
     * @param {string} email - User email
     * @param {object} subscriptionData - Subscription details
     * @returns {object} Updated user
     */
    static async updateSubscription(email, { planId, status, licenseKey, expiry, messageLimit }) {
        if (!email) return null;

        const validStatuses = ['active', 'expired', 'revoked', 'trial'];
        const finalStatus = validStatuses.includes(status) ? status : 'active';

        if (messageLimit === undefined || messageLimit === null) {
            messageLimit = 100;
            if (planId === 'starter') messageLimit = 2000;
            if (planId === 'pro') messageLimit = 10000;
            if (planId === 'business') messageLimit = 100000;
        }

        await db.run(
            `UPDATE users SET plan_id = $1, plan_status = $2, chariow_license_key = $3, subscription_expiry = $4, message_limit = $5 WHERE email = $6`,
            [planId, finalStatus, licenseKey, expiry, messageLimit, email.toLowerCase()]
        );
        
        log(`Updated subscription for ${email}: ${planId} (${finalStatus})`, 'AUTH');
        return this.findByEmail(email);
    }

    /**
     * Update WhatsApp status
     * @param {string} id - User ID
     * @param {string} status - New status
     * @param {string} number - WhatsApp number
     */
    static async updateWhatsAppStatus(id, status, number = null) {
        await db.run(
            `UPDATE users SET whatsapp_status = $1, whatsapp_number = $2 WHERE id = $3`,
            [status, number, id]
        );
        return this.findById(id);
    }

    /**
     * Update user
     * @param {string} id - User ID
     * @param {object} updates - Fields to update
     * @returns {object} Updated user
     */
    static async update(id, updates) {
        const user = await this.findById(id);
        if (!user) throw new Error('User not found');

        delete updates.id;
        delete updates.password;
        delete updates.created_by;
        delete updates.created_at;

        const allowedFields = [
            'email', 'name', 'role', 'is_active', 'bio', 'location', 'website', 'phone',
            'timezone', 'address', 'organization_name', 'sound_notifications',
            'cal_access_token', 'cal_refresh_token', 'cal_token_expiry',
            'ai_cal_enabled', 'ai_cal_video_allowed'
        ];

        const fieldsToUpdate = [];
        const values = [];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(updates, field)) {
                fieldsToUpdate.push(`"${field}"`);
                values.push(updates[field]);
            }
        }

        if (fieldsToUpdate.length === 0) return user;

        const setClause = fieldsToUpdate.map((f, i) => `${f} = $${i + 1}`).join(', ');
        values.push(id);

        await db.run(`UPDATE users SET ${setClause} WHERE id = $${values.length}`, values);

        return this.findById(id);
    }

    /**
     * Delete user
     * @param {string} id - User ID
     * @returns {boolean} True if deleted
     */
    static async delete(id) {
        const result = await db.run('DELETE FROM users WHERE id = $1', [id]);
        return result.changes > 0;
    }

    /**
     * Get all users
     * @returns {array} Array of users
     */
    static async getAll() {
        const users = await db.all('SELECT * FROM users ORDER BY created_at DESC');
        return users.map(u => this._sanitize(u));
    }

    /**
     * Remove password from user object
     */
    static _sanitize(user) {
        if (!user) return null;
        const { password, ...sanitized } = user;
        return sanitized;
    }

    /**
     * Create default admin user if none exists
     */
    static async ensureAdmin(adminPassword) {
        if (!adminPassword) return;

        const adminEmail = 'admin@localhost';
        const adminUser = await this.findByEmail(adminEmail);

        if (!adminUser) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const id = 'legacy-admin-id';
            await db.run(
                `INSERT INTO users (id, email, name, password, role, created_by, created_at, is_active, is_verified)
                 VALUES ($1, $2, 'Legacy Admin', $3, 'admin', 'system', NOW(), 1, 1)`,
                [id, adminEmail, hashedPassword]
            );
            log('Utilisateur admin par défaut créé (Legacy)', 'AUTH', { email: adminEmail }, 'INFO');
        }
    }

    /**
     * Get user credit history
     */
    static async getCreditHistory(userId) {
        return db.all('SELECT * FROM credit_history WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    }

    /**
     * Deduct credits from user
     */
    static async deductCredits(userId, amount, description) {
        const user = await this.findById(userId);
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.message_limit < amount) return false;

        try {
            await db.transaction(async (tx) => {
                await tx.run(
                    `UPDATE users SET message_limit = message_limit - $1, message_used = message_used + $1 WHERE id = $2`,
                    [amount, userId]
                );
                await tx.run(
                    `INSERT INTO credit_history (id, user_id, amount, type, description)
                     VALUES ($1, $2, $3, 'debit', $4)`,
                    [crypto.randomUUID(), userId, amount, description]
                );
            });
            return true;
        } catch (error) {
            log(`Failed to deduct credits: ${error.message}`, 'DB', { userId, amount }, 'ERROR');
            return false;
        }
    }

    /**
     * Refund credits to user
     */
    static async refundCredits(userId, amount, description) {
        try {
            await db.transaction(async (tx) => {
                await tx.run(
                    `UPDATE users SET message_limit = message_limit + $1, message_used = message_used - $1 WHERE id = $2`,
                    [amount, userId]
                );
                await tx.run(
                    `INSERT INTO credit_history (id, user_id, amount, type, description)
                     VALUES ($1, $2, $3, 'credit', $4)`,
                    [crypto.randomUUID(), userId, amount, description]
                );
            });
            return true;
        } catch (error) {
            log(`Failed to refund credits: ${error.message}`, 'DB', { userId, amount }, 'ERROR');
            return false;
        }
    }
}

module.exports = User;
