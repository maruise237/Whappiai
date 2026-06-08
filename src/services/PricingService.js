const db = require('../db/query');
const crypto = require('crypto');

class PricingService {
    /**
     * Get active plans
     */
    static async getActivePlans() {
        return await db.all('SELECT * FROM pricing_plans WHERE is_active = 1 ORDER BY price ASC', []);
    }

    /**
     * Get all plans (including inactive/historical)
     */
    static async getAllPlans() {
        return await db.all('SELECT * FROM pricing_plans ORDER BY price ASC, version DESC', []);
    }

    /**
     * Get plan by ID
     */
    static async getPlan(id) {
        return await db.get('SELECT * FROM pricing_plans WHERE id = $1', [id]);
    }

    /**
     * Get plan by Code (returns latest version)
     */
    static async getPlanByCode(code) {
        return await db.get('SELECT * FROM pricing_plans WHERE code = $1 ORDER BY version DESC LIMIT 1', [code]);
    }

    /**
     * Get plan by Chariow Product ID
     */
    static async getPlanByChariowId(productId) {
        return await db.get('SELECT * FROM pricing_plans WHERE chariow_product_id = $1 ORDER BY version DESC LIMIT 1', [productId]);
    }

    /**
     * Create a new version of a plan (Historical Pricing)
     */
    static async updatePlanPrice(code, newPrice, newMessageLimit, newChariowId = null, newUrl = null) {
        const current = await this.getPlanByCode(code);
        if (!current) throw new Error('Plan not found');

        const newVersion = current.version + 1;
        const newId = `plan_${code}_v${newVersion}`;

        await db.run(`
            INSERT INTO pricing_plans (id, code, name, price, currency, message_limit, interval, is_active, version, chariow_product_id, payment_url, features)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11)
        `, [
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
        ]);

        return newId;
    }
}

module.exports = PricingService;
