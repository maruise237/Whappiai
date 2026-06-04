/**
 * Migration Runner
 * Manages database schema updates professionally
 */

const { log } = require('../utils/logger');

class MigrationRunner {
    constructor(db) {
        this.db = db;
    }

    /**
     * Initialize migration tracking table
     */
    init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }

    /**
     * Run a migration if not already applied
     * @param {string} name - Unique migration name
     * @param {function} fn - Function containing the migration logic
     */
    run(name, fn) {
        const check = this.db.prepare("SELECT id FROM _migrations WHERE name = ?").get(name);
        if (check) return;

        log(`Exécution de la migration : ${name}`, 'SYSTEM');

        try {
            this.db.transaction(() => {
                fn(this.db);
                this.db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(name);
            })();
            log(`Migration réussie : ${name}`, 'SYSTEM');
        } catch (error) {
            log(`ERREUR lors de la migration ${name} : ${error.message}`, 'SYSTEM', { error: error.message }, 'ERROR');
            // We don't rethrow here to allow the server to boot if non-critical,
            // but for core schema it might be better to throw.
            throw error;
        }
    }
}

module.exports = MigrationRunner;
