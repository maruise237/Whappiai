/**
 * User Model
 * SQLite-based user management synced with Clerk
 */

const { db } = require('../config/database');
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
        const MASTER_ADMIN_EMAIL = 'maruise237@gmail.com';
        const existingUser = this.findById(id) || this.findByEmail(email);
        
        // Auto-promote maruise237@gmail.com to admin
        const targetRole = email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? 'admin' : role;
        
        if (existingUser) {
            // Update existing user if needed (e.g. name, role or image change)
            const stmt = db.prepare(`
                UPDATE users 
                SET email = ?, name = ?, role = ?, image_url = ?
                WHERE id = ?
            `);
            stmt.run(email.toLowerCase(), name, targetRole || existingUser.role, imageUrl, existingUser.id);
            return this.findById(existingUser.id);
        }

        const normalizedEmail = email.toLowerCase();
        const userId = id || crypto.randomUUID();
        
        const stmt = db.prepare(`
            INSERT INTO users (
                id, email, name, password, role, image_url, created_by, created_at, 
                is_active, is_verified,
                plan_id, plan_status, message_limit, message_used, subscription_expiry
            )
            VALUES (?, ?, ?, 'CLERK_EXTERNAL_AUTH', ?, ?, ?, datetime('now'), 1, 1,
                'trial', 'active', 60, 0, datetime('now', '+15 days')
            )
        `);

        stmt.run(userId, normalizedEmail, name, targetRole, imageUrl, createdBy);

        // Add initial credit history
        try {
            const creditStmt = db.prepare(`
                INSERT INTO credit_history (id, user_id, amount, type, description)
                VALUES (?, ?, ?, ?, ?)
            `);
            creditStmt.run(crypto.randomUUID(), userId, 60, 'bonus', 'Crédits de bienvenue (Inscription)');
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
    static findById(id) {
        if (!id) return null;
        
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        const user = stmt.get(id);
        
        if (!user && id === 'legacy-admin') {
            const adminUser = this.findByEmail('admin@localhost');
            return adminUser ? this._sanitize(adminUser) : null;
        }

        return user ? this._sanitize(user) : null;
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {object|null} User object or null
     */
    static findByEmail(email) {
        if (!email) return null;
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email.toLowerCase());
    }

    /**
     * Update AI configuration for a user
     * @param {string} id - User ID
     * @param {object} aiConfig - AI configuration object
     * @returns {object} Updated user
     */
    static updateAIConfig(id, aiConfig) {
        const { enabled, prompt, model } = aiConfig;
        const stmt = db.prepare(`
            UPDATE users 
            SET ai_enabled = ?, ai_prompt = ?, ai_model = ?
            WHERE id = ?
        `);
        stmt.run(enabled ? 1 : 0, prompt, model, id);
        return this.findById(id);
    }

    /**
     * Update WhatsApp status
     * @param {string} id - User ID
     * @param {string} status - New status
     * @param {string} number - WhatsApp number
     */
    static updateWhatsAppStatus(id, status, number = null) {
        const stmt = db.prepare(`
            UPDATE users 
            SET whatsapp_status = ?, whatsapp_number = ?
            WHERE id = ?
        `);
        stmt.run(status, number, id);
        return this.findById(id);
    }

    /**
     * Update user
     * @param {string} id - User ID
     * @param {object} updates - Fields to update
     * @returns {object} Updated user
     */
    static async update(id, updates) {
        const user = this.findById(id);
        if (!user) throw new Error('User not found');

        // Don't allow updating certain fields through this method
        delete updates.id;
        delete updates.password; // Clerk handles passwords
        delete updates.created_by;
        delete updates.created_at;

        const allowedFields = ['email', 'name', 'role', 'is_active', 'bio', 'location', 'website', 'phone'];
        const fieldsToUpdate = Object.keys(updates).filter(k => allowedFields.includes(k));

        if (fieldsToUpdate.length === 0) return user;

        const setClause = fieldsToUpdate.map(f => `${f} = ?`).join(', ');
        const values = fieldsToUpdate.map(f => updates[f]);

        const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`);
        stmt.run(...values, id);

        return this.findById(id);
    }

    /**
     * Delete user
     * @param {string} id - User ID
     * @returns {boolean} True if deleted
     */
    static delete(id) {
        const stmt = db.prepare('DELETE FROM users WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Get all users
     * @returns {array} Array of users
     */
    static getAll() {
        const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
        return stmt.all().map(u => this._sanitize(u));
    }

    /**
     * Remove password from user object
     * @param {object} user - User object
     * @returns {object} User without password
     */
    static _sanitize(user) {
        if (!user) return null;
        const { password, ...sanitized } = user;
        return sanitized;
    }

    /**
     * Create default admin user if none exists (Legacy support)
     * @param {string} adminPassword - Admin password from environment
     */
    static async ensureAdmin(adminPassword) {
        if (!adminPassword) return;

        const adminEmail = 'admin@localhost';
        const adminUser = this.findByEmail(adminEmail);

        if (!adminUser) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            const id = 'legacy-admin-id';
            const stmt = db.prepare(`
                INSERT INTO users (id, email, name, password, role, created_by, created_at, is_active, is_verified)
                VALUES (?, ?, 'Legacy Admin', ?, 'admin', 'system', datetime('now'), 1, 1)
            `);
            stmt.run(id, adminEmail, hashedPassword);
            log('Utilisateur admin par défaut créé (Legacy)', 'AUTH', { email: adminEmail }, 'INFO');
        }
    }

    /**
     * Get user credit history
     * @param {string} userId - User ID
     * @returns {Array} Credit history records
     */
    static getCreditHistory(userId) {
        const stmt = db.prepare('SELECT * FROM credit_history WHERE user_id = ? ORDER BY created_at DESC');
        return stmt.all(userId);
    }

    /**
     * Deduct credits from user
     * @param {string} userId - User ID
     * @param {number} amount - Amount to deduct
     * @param {string} description - Description for history
     * @returns {boolean} True if successful, false if insufficient funds
     */
    static deductCredits(userId, amount, description) {
        const user = this.findById(userId);
        if (!user) return false;

        // Admins have unlimited credits
        if (user.role === 'admin') return true;

        if (user.message_limit < amount) return false;

        const stmt = db.prepare(`
            UPDATE users 
            SET message_limit = message_limit - ?, message_used = message_used + ?
            WHERE id = ?
        `);
        
        try {
            const historyStmt = db.prepare(`
                INSERT INTO credit_history (id, user_id, amount, type, description)
                VALUES (?, ?, ?, 'debit', ?)
            `);

            // Use db.transaction to ensure atomicity
            const transaction = db.transaction((uid, amt, desc) => {
                stmt.run(amt, amt, uid);
                historyStmt.run(crypto.randomUUID(), uid, amt, desc);
            });

            transaction(userId, amount, description);
            return true;
        } catch (error) {
            log(`Failed to deduct credits: ${error.message}`, 'DB', { userId, amount }, 'ERROR');
            return false;
        }
    }

    /**
     * Refund credits to user (e.g. failed message)
     * @param {string} userId - User ID
     * @param {number} amount - Amount to refund
     * @param {string} description - Description
     */
    static refundCredits(userId, amount, description) {
        const stmt = db.prepare(`
            UPDATE users 
            SET message_limit = message_limit + ?, message_used = message_used - ?
            WHERE id = ?
        `);
        
        try {
            const historyStmt = db.prepare(`
                INSERT INTO credit_history (id, user_id, amount, type, description)
                VALUES (?, ?, ?, 'credit', ?)
            `);

            const transaction = db.transaction((uid, amt, desc) => {
                stmt.run(amt, amt, uid);
                historyStmt.run(crypto.randomUUID(), uid, amt, desc);
            });

            transaction(userId, amount, description);
            return true;
        } catch (error) {
            log(`Failed to refund credits: ${error.message}`, 'DB', { userId, amount }, 'ERROR');
            return false;
        }
    }
}

module.exports = User;
