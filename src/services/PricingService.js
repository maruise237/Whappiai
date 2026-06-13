const db = require('../db/query');

const DEFAULT_PLANS = [
    {
        id: 'starter',
        code: 'starter',
        name: 'Starter',
        price: 3500,
        currency: 'XAF',
        message_limit: 1000,
        interval: 'month',
        features: '3 groupes, blocage des liens, mots interdits manuels, auto-exclusion, message de bienvenue manuel'
    },
    {
        id: 'pro',
        code: 'pro',
        name: 'Pro IA',
        price: 8000,
        currency: 'XAF',
        message_limit: 5000,
        interval: 'month',
        features: '6 groupes, moderation Starter, assistant IA, fonctions IA avancees, presets optionnels'
    },
    {
        id: 'business',
        code: 'business',
        name: 'Business',
        price: 18000,
        currency: 'XAF',
        message_limit: 25000,
        interval: 'month',
        features: '16 groupes, tout Pro IA, fonctions avancees, administration poussee, priorite premium'
    }
];

class PricingService {
    static normalizePlanCode(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized.includes('starter')) return 'starter';
        if (normalized.includes('business') || normalized.includes('organisation') || normalized.includes('organization')) return 'business';
        if (normalized.includes('pro')) return 'pro';
        return normalized;
    }

    static async ensureDefaultPlans() {
        const existingPlans = await db.all('SELECT id, code FROM pricing_plans', []);
        const existingCodes = new Set(existingPlans.flatMap((plan) => [String(plan.id || '').toLowerCase(), String(plan.code || '').toLowerCase()]));

        for (const plan of DEFAULT_PLANS) {
            if (existingCodes.has(plan.code)) continue;

            await db.run(`
                INSERT INTO pricing_plans (
                    id, code, name, price, currency, message_limit, interval, is_active, version, payment_url, features
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 1, $8, $9)
            `, [
                plan.id,
                plan.code,
                plan.name,
                plan.price,
                plan.currency,
                plan.message_limit,
                plan.interval,
                null,
                plan.features
            ]);
        }
    }

    /**
     * Get active plans
     */
    static async getActivePlans() {
        await this.ensureDefaultPlans();
        return await db.all('SELECT * FROM pricing_plans WHERE is_active = 1 ORDER BY price ASC', []);
    }

    /**
     * Get all plans (including inactive/historical)
     */
    static async getAllPlans() {
        await this.ensureDefaultPlans();
        return await db.all('SELECT * FROM pricing_plans ORDER BY price ASC, version DESC', []);
    }

    /**
     * Get plan by ID
     */
    static async getPlan(id) {
        await this.ensureDefaultPlans();
        const normalizedId = this.normalizePlanCode(id);
        return await db.get('SELECT * FROM pricing_plans WHERE LOWER(id) = $1 ORDER BY version DESC LIMIT 1', [normalizedId]);
    }

    /**
     * Get plan by Code (returns latest version)
     */
    static async getPlanByCode(code) {
        await this.ensureDefaultPlans();
        const normalizedCode = this.normalizePlanCode(code);
        return await db.get(`
            SELECT *
            FROM pricing_plans
            WHERE LOWER(code) = $1 OR LOWER(id) = $1 OR LOWER(name) = $1
            ORDER BY version DESC
            LIMIT 1
        `, [normalizedCode]);
    }

    /**
     * Legacy helper kept for historical pricing rows that still expose
     * the original provider product column in the database schema.
     */
    static async getPlanByChariowId(productId) {
        return await db.get('SELECT * FROM pricing_plans WHERE chariow_product_id = $1 ORDER BY version DESC LIMIT 1', [productId]);
    }

    /**
     * Create a new version of a plan (historical pricing snapshot).
     * The underlying schema still keeps legacy provider columns for compatibility.
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
