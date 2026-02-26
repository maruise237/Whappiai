const { db } = require('../config/database');
const crypto = require('crypto');

class PricingService {
    /**
     * Get active plans
     */
    static getActivePlans() {
        return db.prepare('SELECT * FROM pricing_plans WHERE is_active = 1 ORDER BY price ASC').all();
    }

    /**
     * Get all plans (including inactive/historical)
     */
    static getAllPlans() {
        return db.prepare('SELECT * FROM pricing_plans ORDER BY price ASC, version DESC').all();
    }

    /**
     * Get plan by ID
     */
    static getPlan(id) {
        return db.prepare('SELECT * FROM pricing_plans WHERE id = ?').get(id);
    }

    /**
     * Get plan by Code (returns latest version)
     */
    static getPlanByCode(code) {
        return db.prepare('SELECT * FROM pricing_plans WHERE code = ? ORDER BY version DESC LIMIT 1').get(code);
    }

    /**
     * Get plan by Chariow Product ID
     */
    static getPlanByChariowId(productId) {
        return db.prepare('SELECT * FROM pricing_plans WHERE chariow_product_id = ? ORDER BY version DESC LIMIT 1').get(productId);
    }

    /**
     * Create a new version of a plan (Historical Pricing)
     */
    static updatePlanPrice(code, newPrice, newMessageLimit, newChariowId = null, newUrl = null) {
        const current = this.getPlanByCode(code);
        if (!current) throw new Error('Plan not found');

        // Archive current? It stays in DB with its version.
        // Create new version
        const newVersion = current.version + 1;
        const newId = `plan_${code}_v${newVersion}`;

        const stmt = db.prepare(`
            INSERT INTO pricing_plans (id, code, name, price, currency, message_limit, interval, is_active, version, chariow_product_id, payment_url, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
        `);

        stmt.run(
            newId, 
            code, 
            current.name, 
            newPrice, 
            current.currency, 
            newMessageLimit, 
            current.interval, 
            newVersion, 
            newChariowId || current.chariow_product_id,
            newUrl || current.payment_url,
            current.features
        );

        // Optional: Mark old version as inactive if we don't want new users to see it
        // db.prepare('UPDATE pricing_plans SET is_active = 0 WHERE id = ?').run(current.id);
        
        return newId;
    }
}

module.exports = PricingService;