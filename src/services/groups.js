const { db } = require('../config/database');
const { log } = require('../utils/logger');

class GroupService {
    /**
     * Get group profile
     */
    getProfile(sessionId, groupId) {
        return db.prepare('SELECT * FROM group_profiles WHERE session_id = ? AND group_id = ?').get(sessionId, groupId);
    }

    /**
     * Update group profile
     */
    updateProfile(sessionId, groupId, profile) {
        const { mission, objectives, rules, theme } = profile;
        const stmt = db.prepare(`
            INSERT INTO group_profiles (session_id, group_id, mission, objectives, rules, theme, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(session_id, group_id) DO UPDATE SET
            mission = excluded.mission,
            objectives = excluded.objectives,
            rules = excluded.rules,
            theme = excluded.theme,
            updated_at = CURRENT_TIMESTAMP
        `);
        stmt.run(sessionId, groupId, mission, objectives, rules, theme);
    }

    /**
     * Get product links for a group
     */
    getProductLinks(sessionId, groupId) {
        return db.prepare('SELECT * FROM group_product_links WHERE session_id = ? AND group_id = ? ORDER BY created_at ASC').all(sessionId, groupId);
    }

    /**
     * Update product links for a group (replaces all)
     */
    updateProductLinks(sessionId, groupId, links) {
        db.transaction(() => {
            // Delete existing
            db.prepare('DELETE FROM group_product_links WHERE session_id = ? AND group_id = ?').run(sessionId, groupId);
            
            // Insert new
            const stmt = db.prepare(`
                INSERT INTO group_product_links (session_id, group_id, title, description, url, cta)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            
            for (const link of links) {
                stmt.run(sessionId, groupId, link.title, link.description, link.url, link.cta);
            }
        })();
    }

    /**
     * Add a single product link
     */
    addProductLink(sessionId, groupId, link) {
        const { title, description, url, cta } = link;
        const stmt = db.prepare(`
            INSERT INTO group_product_links (session_id, group_id, title, description, url, cta)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(sessionId, groupId, title, description, url, cta);
        return result.lastInsertRowid;
    }

    /**
     * Delete a product link
     */
    deleteProductLink(id) {
        return db.prepare('DELETE FROM group_product_links WHERE id = ?').run(id);
    }
}

module.exports = new GroupService();
