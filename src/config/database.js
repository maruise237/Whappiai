/**
 * Database Configuration and Initialization
 * SQLite database with better-sqlite3 for synchronous operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { log } = require('../utils/logger');

// Database file path
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/whatsapp.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create database instance
const db = new Database(DB_PATH, {
    verbose: process.env.NODE_ENV === 'development' ? (msg) => log(`[DB] ${msg}`, 'SYSTEM', null, 'DEBUG') : null
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
function initializeSchema() {
    // Users table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
            whatsapp_number TEXT,
            whatsapp_status TEXT DEFAULT 'disconnected',
            ai_enabled INTEGER DEFAULT 0,
            ai_prompt TEXT,
            ai_model TEXT DEFAULT 'deepseek-chat',
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_active INTEGER DEFAULT 1,
            bio TEXT,
            location TEXT,
            website TEXT,
            phone TEXT
        )
    `);

    // Add missing columns to users table for migration
    const userColumns = [
        { name: 'name', type: 'TEXT' },
        { name: 'bio', type: 'TEXT' },
        { name: 'location', type: 'TEXT' },
        { name: 'website', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'whatsapp_number', type: 'TEXT' },
        { name: 'whatsapp_status', type: "TEXT DEFAULT 'disconnected'" },
        { name: 'ai_enabled', type: 'INTEGER DEFAULT 0' },
        { name: 'ai_prompt', type: 'TEXT' },
        { name: 'ai_model', type: "TEXT DEFAULT 'deepseek-chat'" },
        { name: 'is_verified', type: 'INTEGER DEFAULT 0' },
        { name: 'verification_token', type: 'TEXT' },
        { name: 'verification_token_expires', type: 'DATETIME' },
        { name: 'reset_token', type: 'TEXT' },
        { name: 'reset_token_expires', type: 'DATETIME' },
        { name: 'image_url', type: 'TEXT' }
    ];

    userColumns.forEach(col => {
        try {
            db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            // Column might already exist
        }
    });

    // WhatsApp sessions table (metadata only, auth stored in auth_info_baileys)
    db.exec(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
            id TEXT PRIMARY KEY,
            owner_email TEXT REFERENCES users(email) ON DELETE SET NULL,
            token TEXT NOT NULL,
            status TEXT DEFAULT 'DISCONNECTED',
            detail TEXT,
            pairing_code TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration for pairing_code column
    try {
        db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN pairing_code TEXT`);
    } catch (e) {
        // Column might already exist
    }

    // Sessions table (new version)
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            status TEXT DEFAULT 'disconnected',
            whatsapp_number TEXT,
            ai_enabled INTEGER DEFAULT 0,
            ai_prompt TEXT,
            ai_model TEXT DEFAULT 'deepseek-chat',
            ai_endpoint TEXT,
            ai_key TEXT,
            ai_mode TEXT DEFAULT 'bot',
            ai_temperature REAL DEFAULT 0.7,
            ai_max_tokens INTEGER DEFAULT 1000,
            ai_messages_received INTEGER DEFAULT 0,
            ai_messages_sent INTEGER DEFAULT 0,
            ai_last_error TEXT,
            ai_last_message_at DATETIME,
            created_by TEXT REFERENCES users(email),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration for sessions table
    const sessionColumns = [
        { name: 'ai_endpoint', type: 'TEXT' },
        { name: 'ai_key', type: 'TEXT' },
        { name: 'ai_mode', type: "TEXT DEFAULT 'bot'" },
        { name: 'ai_temperature', type: 'REAL DEFAULT 0.7' },
        { name: 'ai_max_tokens', type: 'INTEGER DEFAULT 1000' },
        { name: 'ai_messages_received', type: 'INTEGER DEFAULT 0' },
        { name: 'ai_messages_sent', type: 'INTEGER DEFAULT 0' },
        { name: 'ai_last_error', type: 'TEXT' },
        { name: 'ai_last_message_at', type: 'DATETIME' }
    ];

    sessionColumns.forEach(col => {
        try {
            db.exec(`ALTER TABLE sessions ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {}
    });

    // Campaigns table
    db.exec(`
        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'ready', 'sending', 'paused', 'completed', 'cancelled')),
            session_id TEXT REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
            message_content TEXT,
            message_type TEXT DEFAULT 'text',
            media_url TEXT,
            media_caption TEXT,
            ptt INTEGER DEFAULT 0,
            message_delay_min INTEGER DEFAULT 3,
            message_delay_max INTEGER DEFAULT 8,
            created_by TEXT REFERENCES users(email) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            scheduled_at DATETIME,
            started_at DATETIME,
            completed_at DATETIME
        )
    `);

    // Migration for existing databases: Add media_caption and ptt columns if they don't exist
    try {
        db.exec("ALTER TABLE campaigns ADD COLUMN media_caption TEXT");
    } catch (e) {
        // Column might already exist
    }
    try {
        db.exec("ALTER TABLE campaigns ADD COLUMN ptt INTEGER DEFAULT 0");
    } catch (e) {
        // Column might already exist
    }

    // Migration for AI columns in whatsapp_sessions
    const aiColumns = [
        { name: 'ai_enabled', type: 'INTEGER DEFAULT 0' },
        { name: 'ai_endpoint', type: 'TEXT' },
        { name: 'ai_key', type: 'TEXT' },
        { name: 'ai_model', type: 'TEXT' },
        { name: 'ai_prompt', type: 'TEXT' },
        { name: 'ai_mode', type: "TEXT DEFAULT 'bot' CHECK(ai_mode IN ('bot', 'human', 'hybrid'))" },
        { name: 'ai_messages_received', type: 'INTEGER DEFAULT 0' },
        { name: 'ai_messages_sent', type: 'INTEGER DEFAULT 0' },
        { name: 'ai_last_error', type: 'TEXT' },
        { name: 'ai_last_message_at', type: 'DATETIME' },
        { name: 'ai_temperature', type: 'REAL DEFAULT 0.7' },
        { name: 'ai_max_tokens', type: 'INTEGER DEFAULT 1000' }
    ];

    aiColumns.forEach(col => {
        try {
            db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
            // Column might already exist
        }
    });

    // Campaign recipients table
    db.exec(`
        CREATE TABLE IF NOT EXISTS campaign_recipients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
            number TEXT NOT NULL,
            name TEXT,
            custom_fields TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'retry')),
            sent_at DATETIME,
            error TEXT,
            retry_count INTEGER DEFAULT 0,
            UNIQUE(campaign_id, number)
        )
    `);

    // Create index for faster recipient lookups
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_recipients_campaign_status 
        ON campaign_recipients(campaign_id, status)
    `);

    // Activity logs table
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            action TEXT NOT NULL,
            resource TEXT,
            resource_id TEXT,
            details TEXT,
            ip TEXT,
            user_agent TEXT,
            success INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create index for activity log queries
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_user_date 
        ON activity_logs(user_email, created_at)
    `);

    // Recipient lists table
    db.exec(`
        CREATE TABLE IF NOT EXISTS recipient_lists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            recipients TEXT NOT NULL,
            created_by TEXT REFERENCES users(email) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Group Moderation Settings
    db.exec(`
        CREATE TABLE IF NOT EXISTS group_settings (
            group_id TEXT NOT NULL,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            is_active INTEGER DEFAULT 0,
            anti_link INTEGER DEFAULT 0,
            bad_words TEXT,
            warning_template TEXT DEFAULT 'ATTENTION @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.',
            max_warnings INTEGER DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, session_id)
        )
    `);

    // Migration for group_settings: Add session_id column if it doesn't exist (fix for older versions)
    try {
        const tableInfo = db.prepare("PRAGMA table_info(group_settings)").all();
        const hasSessionId = tableInfo.some(col => col.name === 'session_id');
        
        if (!hasSessionId) {
            log('Migration group_settings: ajout de la colonne session_id', 'SYSTEM');
            
            // Si la table existe sans session_id, on doit la recréer car elle fait partie de la PK
            // Mais pour simplifier et ne pas perdre de données (si peu probable), 
            // on tente un ALTER TABLE simple d'abord si c'est possible, 
            // sinon on vide et recrée car session_id est requis pour la PK.
            
            db.transaction(() => {
                // Sauvegarde des données existantes si possible
                const count = db.prepare("SELECT count(*) as count FROM group_settings").get().count;
                if (count > 0) {
                    log(`Migration group_settings: ${count} lignes existantes, recréation de la table...`, 'SYSTEM');
                    db.exec("ALTER TABLE group_settings RENAME TO group_settings_old");
                    db.exec(`
                        CREATE TABLE group_settings (
                            group_id TEXT NOT NULL,
                            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
                            is_active INTEGER DEFAULT 0,
                            anti_link INTEGER DEFAULT 0,
                            bad_words TEXT,
                            warning_template TEXT DEFAULT 'ATTENTION @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.',
                            max_warnings INTEGER DEFAULT 5,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (group_id, session_id)
                        )
                    `);
                    // On ne peut pas facilement mapper l'ancienne session_id car elle n'existait pas.
                    // On laisse la table vide ou on essaie de deviner la session si une seule existe.
                    const sessions = db.prepare("SELECT id FROM whatsapp_sessions").all();
                    if (sessions.length === 1) {
                        const sid = sessions[0].id;
                        db.exec(`INSERT INTO group_settings (group_id, session_id, is_active, anti_link, bad_words, warning_template, max_warnings, created_at, updated_at)
                                 SELECT group_id, '${sid}', is_active, anti_link, bad_words, warning_template, max_warnings, created_at, updated_at FROM group_settings_old`);
                    }
                    db.exec("DROP TABLE group_settings_old");
                } else {
                    db.exec("DROP TABLE group_settings");
                    db.exec(`
                        CREATE TABLE group_settings (
                            group_id TEXT NOT NULL,
                            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
                            is_active INTEGER DEFAULT 0,
                            anti_link INTEGER DEFAULT 0,
                            bad_words TEXT,
                            warning_template TEXT DEFAULT 'ATTENTION @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.',
                            max_warnings INTEGER DEFAULT 5,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (group_id, session_id)
                        )
                    `);
                }
            })();
        }
    } catch (e) {
        log(`Erreur migration group_settings: ${e.message}`, 'SYSTEM', null, 'ERROR');
    }

    // User Warnings
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_warnings (
            group_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            last_warning_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, session_id, user_id)
        )
    `);

    // Group Animator Tasks
    db.exec(`
        CREATE TABLE IF NOT EXISTS group_animator_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT NOT NULL,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            message_content TEXT,
            media_url TEXT,
            media_type TEXT DEFAULT 'text',
            scheduled_at DATETIME NOT NULL,
            recurrence TEXT DEFAULT 'none' CHECK(recurrence IN ('none', 'daily', 'weekly')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
            error_message TEXT,
            last_run_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Group Profiles
    db.exec(`
        CREATE TABLE IF NOT EXISTS group_profiles (
            group_id TEXT NOT NULL,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            mission TEXT,
            objectives TEXT,
            rules TEXT,
            theme TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, session_id)
        )
    `);

    // Group Product Links
    db.exec(`
        CREATE TABLE IF NOT EXISTS group_product_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT NOT NULL,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            title TEXT,
            description TEXT,
            url TEXT,
            cta TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration for group_settings: Add welcome columns
    try {
        db.exec("ALTER TABLE group_settings ADD COLUMN welcome_enabled INTEGER DEFAULT 0");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE group_settings ADD COLUMN welcome_template TEXT");
    } catch (e) {}

    try {
        db.exec("ALTER TABLE group_settings ADD COLUMN ai_assistant_enabled INTEGER DEFAULT 0");
    } catch (e) {}

    // Migration for user_warnings: Add session_id column if it doesn't exist
    try {
        const tableInfo = db.prepare("PRAGMA table_info(user_warnings)").all();
        const hasSessionId = tableInfo.some(col => col.name === 'session_id');
        
        if (!hasSessionId) {
            log('Migration user_warnings: ajout de la colonne session_id', 'SYSTEM');
            db.transaction(() => {
                db.exec("ALTER TABLE user_warnings RENAME TO user_warnings_old");
                db.exec(`
                    CREATE TABLE user_warnings (
                        group_id TEXT NOT NULL,
                        session_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        count INTEGER DEFAULT 0,
                        last_warning_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (group_id, session_id, user_id)
                    )
                `);
                const sessions = db.prepare("SELECT id FROM whatsapp_sessions").all();
                if (sessions.length === 1) {
                    const sid = sessions[0].id;
                    db.exec(`INSERT INTO user_warnings (group_id, session_id, user_id, count, last_warning_at)
                             SELECT group_id, '${sid}', user_id, count, last_warning_at FROM user_warnings_old`);
                }
                db.exec("DROP TABLE user_warnings_old");
            })();
        }
    } catch (e) {
        log(`Erreur migration user_warnings: ${e.message}`, 'SYSTEM', null, 'ERROR');
    }

    // Migration for group_animator_tasks: Add media_type if missing and update status CHECK constraint
    try {
        db.exec("ALTER TABLE group_animator_tasks ADD COLUMN media_type TEXT DEFAULT 'text'");
    } catch (e) {}

    try {
        db.exec("ALTER TABLE group_animator_tasks ADD COLUMN error_message TEXT");
    } catch (e) {}

    try {
        // SQLite doesn't allow altering CHECK constraints easily. 
        // We check if 'processing' is allowed by trying to insert/update a dummy task (rollback later) or checking table info.
        // A better way is to check the table schema via sql.
        const tableSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='group_animator_tasks'").get().sql;
        if (!tableSchema.includes("'processing'")) {
            log('Migration group_animator_tasks: mise à jour de la contrainte CHECK status', 'SYSTEM');
            db.transaction(() => {
                db.exec("ALTER TABLE group_animator_tasks RENAME TO group_animator_tasks_old");
                db.exec(`
                    CREATE TABLE group_animator_tasks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        group_id TEXT NOT NULL,
                        session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
                        message_content TEXT,
                        media_url TEXT,
                        media_type TEXT DEFAULT 'text',
                        scheduled_at DATETIME NOT NULL,
                        recurrence TEXT DEFAULT 'none' CHECK(recurrence IN ('none', 'daily', 'weekly')),
                        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
                        error_message TEXT,
                        last_run_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                db.exec(`
                    INSERT INTO group_animator_tasks (id, group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence, status, last_run_at, created_at, updated_at)
                    SELECT id, group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence, status, last_run_at, created_at, updated_at FROM group_animator_tasks_old
                `);
                db.exec("DROP TABLE group_animator_tasks_old");
            })();
        }
    } catch (e) {
        log(`Erreur migration group_animator_tasks status: ${e.message}`, 'SYSTEM', null, 'ERROR');
    }

    // Conversation Memory table
    db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            remote_jid TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create index for faster memory retrieval
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_memory_session_jid 
        ON conversation_memory(session_id, remote_jid)
    `);

    // AI Models table (Global configuration by admin)
    db.exec(`
        CREATE TABLE IF NOT EXISTS ai_models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            api_key TEXT NOT NULL,
            model_name TEXT NOT NULL,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            is_default INTEGER DEFAULT 0,
            temperature REAL DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 2000,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration for ai_models: Add is_active and is_default if missing
    try {
        db.exec("ALTER TABLE ai_models ADD COLUMN is_active INTEGER DEFAULT 1");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE ai_models ADD COLUMN is_default INTEGER DEFAULT 0");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE ai_models ADD COLUMN temperature REAL DEFAULT 0.7");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE ai_models ADD COLUMN max_tokens INTEGER DEFAULT 2000");
    } catch (e) {}

    log('Schéma de la base de données initialisé avec succès', 'SYSTEM', { event: 'db-schema-init' }, 'INFO');
}

/**
 * Close database connection
 */
function close() {
    db.close();
}

// Initialize schema on load
initializeSchema();

// Handle graceful shutdown
process.on('exit', () => db.close());
process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});

module.exports = {
    db,
    initializeSchema,
    close,
    DB_PATH
};
