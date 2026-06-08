const db = require('../db/query');
const { log } = require('../utils/logger');

class GroupService {
    /**
     * Get group profile
     */
    async getProfile(sessionId, groupId) {
        return await db.get('SELECT * FROM group_profiles WHERE session_id = $1 AND group_id = $2', [sessionId, groupId]);
    }

    /**
     * Update group profile
     */
    async updateProfile(sessionId, groupId, profile) {
        const { mission, objectives, rules, theme } = profile;
        await db.run(`
            INSERT INTO group_profiles (session_id, group_id, mission, objectives, rules, theme, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT(session_id, group_id) DO UPDATE SET
            mission = excluded.mission,
            objectives = excluded.objectives,
            rules = excluded.rules,
            theme = excluded.theme,
            updated_at = NOW()
        `, [sessionId, groupId, mission, objectives, rules, theme]);
    }

    /**
     * Get product links for a group
     */
    async getProductLinks(sessionId, groupId) {
        return await db.all('SELECT * FROM group_product_links WHERE session_id = $1 AND group_id = $2 ORDER BY created_at ASC', [sessionId, groupId]);
    }

    /**
     * Update product links for a group (replaces all)
     */
    async updateProductLinks(sessionId, groupId, links) {
        await db.run('BEGIN');
        try {
            // Delete existing
            await db.run('DELETE FROM group_product_links WHERE session_id = $1 AND group_id = $2', [sessionId, groupId]);

            // Insert new
            for (const link of links) {
                await db.run(`
                    INSERT INTO group_product_links (session_id, group_id, title, description, url, cta)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [sessionId, groupId, link.title, link.description, link.url, link.cta]);
            }

            await db.run('COMMIT');
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }
    }

    /**
     * Add a single product link
     */
    async addProductLink(sessionId, groupId, link) {
        const { title, description, url, cta } = link;
        const result = await db.get(`
            INSERT INTO group_product_links (session_id, group_id, title, description, url, cta)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [sessionId, groupId, title, description, url, cta]);
        return result.id;
    }

    /**
     * Delete a product link
     */
    async deleteProductLink(id) {
        await db.run('DELETE FROM group_product_links WHERE id = $1', [id]);
    }
}

module.exports = new GroupService();
