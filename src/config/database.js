/**
 * Database Configuration and Initialization
 * SQLite database with better-sqlite3 for synchronous operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { log } = require('../utils/logger');
const MigrationRunner = require('./migrations');
const { encrypt } = require('../utils/crypto');

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
 * Initialize database schema and run migrations
 */
function initializeSchema() {
    // 1. Initial Migration Check (Before any CREATE TABLE)
    // This ensures data continuity during the Animator -> Engagement rename
    const runner = new MigrationRunner(db);
    runner.init();

    runner.run('rename-animator-to-engagement-fix-v3', (db) => {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='group_animator_tasks'").get();
        if (tableCheck) {
            const newTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='group_engagement_tasks'").get();
            if (!newTableCheck) {
                log('Migration de données : Renommage de group_animator_tasks en group_engagement_tasks', 'SYSTEM');
                db.exec("ALTER TABLE group_animator_tasks RENAME TO group_engagement_tasks");
            }
        }
    });

    // 2. Core tables (Idempotent - CREATE TABLE IF NOT EXISTS)

    // Users
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
            created_by TEXT,
            is_verified INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
    `);

    // WhatsApp sessions (metadata)
    db.exec(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
            id TEXT PRIMARY KEY,
            owner_email TEXT REFERENCES users(email) ON DELETE SET NULL,
            token TEXT NOT NULL,
            status TEXT DEFAULT 'DISCONNECTED',
            detail TEXT,
            pairing_code TEXT,
            ai_enabled INTEGER DEFAULT 0,
            ai_model TEXT,
            ai_prompt TEXT,
            ai_mode TEXT DEFAULT 'bot',
            ai_endpoint TEXT,
            ai_key TEXT,
            ai_temperature REAL DEFAULT 0.7,
            ai_max_tokens INTEGER DEFAULT 1000,
            ai_trigger_keywords TEXT,
            ai_constraints TEXT,
            ai_messages_sent INTEGER DEFAULT 0,
            ai_messages_received INTEGER DEFAULT 0,
            ai_last_error TEXT,
            ai_last_message_at DATETIME,
            ai_delay_min INTEGER DEFAULT 1,
            ai_delay_max INTEGER DEFAULT 5,
            ai_reject_calls INTEGER DEFAULT 0,
            ai_deactivate_on_typing INTEGER DEFAULT 0,
            ai_deactivate_on_read INTEGER DEFAULT 0,
            ai_session_window INTEGER DEFAULT 2,
            ai_respond_to_tags INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Credit History
    db.exec(`
        CREATE TABLE IF NOT EXISTS credit_history (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            type TEXT CHECK(type IN ('credit', 'debit', 'bonus', 'purchase')),
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Activity logs
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
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_user_date ON activity_logs(user_email, created_at)`);

    // Conversation Memory
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
    db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_session_jid ON conversation_memory(session_id, remote_jid)`);

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
            warning_reset_days INTEGER DEFAULT 0,
            welcome_enabled INTEGER DEFAULT 0,
            welcome_template TEXT,
            ai_assistant_enabled INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, session_id)
        )
    `);

    // User Warnings
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_warnings (
            group_id TEXT NOT NULL,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            user_id TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            last_warning_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (group_id, session_id, user_id)
        )
    `);

    // Group Engagement Tasks
    db.exec(`
        CREATE TABLE IF NOT EXISTS group_engagement_tasks (
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

    // AI Models
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

    // Keyword Responders
    db.exec(`
        CREATE TABLE IF NOT EXISTS keyword_responders (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            keyword TEXT NOT NULL,
            match_type TEXT DEFAULT 'contains' CHECK(match_type IN ('exact', 'contains', 'regex')),
            response_type TEXT DEFAULT 'text' CHECK(response_type IN ('text', 'image', 'document', 'audio', 'video')),
            response_content TEXT NOT NULL,
            file_name TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Webhooks
    db.exec(`
        CREATE TABLE IF NOT EXISTS webhooks (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            events TEXT,
            secret TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Knowledge Base (RAG)
    db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_base (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT CHECK(type IN ('file', 'url', 'text')),
            source TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            base_id TEXT NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
            session_id TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata TEXT
        )
    `);

    try {
        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search USING fts5(
                content,
                session_id UNINDEXED,
                chunk_id UNINDEXED,
                tokenize='unicode61 remove_diacritics 1'
            )
        `);
    } catch (e) {}

    // SaaS Components
    db.exec(`
        CREATE TABLE IF NOT EXISTS pricing_plans (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            currency TEXT DEFAULT 'XAF',
            message_limit INTEGER,
            interval TEXT DEFAULT 'month',
            is_active INTEGER DEFAULT 1,
            version INTEGER DEFAULT 1,
            chariow_product_id TEXT,
            payment_url TEXT,
            features TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            plan_id TEXT REFERENCES pricing_plans(id),
            status TEXT,
            current_period_start DATETIME,
            current_period_end DATETIME,
            cancel_at_period_end INTEGER DEFAULT 0,
            chariow_subscription_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS user_notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT REFERENCES users(id),
            type TEXT,
            title TEXT,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 3. Schema Extensions (Migrations)

    // Migration: Group Settings session_id for old schemas
    runner.run('group-settings-add-session-id', (db) => {
        const tableInfo = db.prepare("PRAGMA table_info(group_settings)").all();
        const hasSessionId = tableInfo.some(col => col.name === 'session_id');

        if (!hasSessionId) {
            const countRow = db.prepare("SELECT count(*) as count FROM group_settings").get();
            if (countRow && countRow.count > 0) {
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
            warning_reset_days INTEGER DEFAULT 0,
            welcome_enabled INTEGER DEFAULT 0,
            welcome_template TEXT,
            ai_assistant_enabled INTEGER DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (group_id, session_id)
                    )
                `);
                const sessions = db.prepare("SELECT id FROM whatsapp_sessions").all();
                if (sessions.length === 1) {
                    const sid = sessions[0].id;
                    db.exec(`INSERT INTO group_settings (group_id, session_id, is_active, anti_link, bad_words, warning_template, max_warnings, created_at, updated_at)
                             SELECT group_id, '${sid}', is_active, anti_link, bad_words, warning_template, max_warnings, created_at, updated_at FROM group_settings_old`);
                }
                db.exec("DROP TABLE group_settings_old");
            }
        }
    });

    // User table extensions (2026 SaaS fields)
    runner.run('users-saas-v2026-v2', (db) => {
        const columns = [
            { name: 'created_by', type: 'TEXT' },
            { name: 'is_verified', type: 'INTEGER DEFAULT 0' },
            { name: 'bio', type: 'TEXT' },
            { name: 'location', type: 'TEXT' },
            { name: 'website', type: 'TEXT' },
            { name: 'phone', type: 'TEXT' },
            { name: 'whatsapp_number', type: 'TEXT' },
            { name: 'whatsapp_status', type: "TEXT DEFAULT 'disconnected'" },
            { name: 'ai_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_prompt', type: 'TEXT' },
            { name: 'ai_model', type: "TEXT DEFAULT 'deepseek-chat'" },
            { name: 'image_url', type: 'TEXT' },
            { name: 'plan_id', type: "TEXT DEFAULT 'free'" },
            { name: 'plan_status', type: "TEXT DEFAULT 'active'" },
            { name: 'message_limit', type: 'INTEGER DEFAULT 100' },
            { name: 'message_used', type: 'INTEGER DEFAULT 0' },
            { name: 'subscription_expiry', type: 'DATETIME' },
            { name: 'timezone', type: "TEXT DEFAULT 'UTC'" },
            { name: 'organization_name', type: 'TEXT' },
            { name: 'sound_notifications', type: 'INTEGER DEFAULT 1' },
            { name: 'cal_access_token', type: 'TEXT' },
            { name: 'cal_refresh_token', type: 'TEXT' },
            { name: 'cal_token_expiry', type: 'INTEGER' },
            { name: 'ai_cal_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_cal_video_allowed', type: 'INTEGER DEFAULT 0' }
        ];
        columns.forEach(col => {
            try { db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });
    });

    // Migration: Cal.com Integration columns (New migration to ensure they are added)
    runner.run('users-cal-com-v1', (db) => {
        const columns = [
            { name: 'cal_access_token', type: 'TEXT' },
            { name: 'cal_refresh_token', type: 'TEXT' },
            { name: 'cal_token_expiry', type: 'INTEGER' },
            { name: 'ai_cal_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_cal_video_allowed', type: 'INTEGER DEFAULT 0' }
        ];
        columns.forEach(col => {
            try { db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });
    });

    // WhatsApp Sessions AI and delays (Definitive Migration v6)
    runner.run('whatsapp-sessions-v2026-v6-final', (db) => {
        const columns = [
            { name: 'pairing_code', type: 'TEXT' },
            { name: 'ai_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_model', type: 'TEXT' },
            { name: 'ai_prompt', type: 'TEXT' },
            { name: 'ai_mode', type: "TEXT DEFAULT 'bot'" },
            { name: 'ai_endpoint', type: 'TEXT' },
            { name: 'ai_key', type: 'TEXT' },
            { name: 'ai_temperature', type: 'REAL DEFAULT 0.7' },
            { name: 'ai_max_tokens', type: 'INTEGER DEFAULT 1000' },
            { name: 'ai_trigger_keywords', type: 'TEXT' },
            { name: 'ai_constraints', type: 'TEXT' },
            { name: 'ai_messages_sent', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_messages_received', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_last_error', type: 'TEXT' },
            { name: 'ai_last_message_at', type: 'DATETIME' },
            { name: 'ai_delay_min', type: 'INTEGER DEFAULT 1' },
            { name: 'ai_delay_max', type: 'INTEGER DEFAULT 5' },
            { name: 'ai_reject_calls', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_deactivate_on_typing', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_deactivate_on_read', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_session_window', type: 'INTEGER DEFAULT 2' },
            { name: 'ai_respond_to_tags', type: 'INTEGER DEFAULT 1' }
        ];
        columns.forEach(col => {
            try { db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });
    });

    // Group Settings Welcome & Assistant (Definitive Migration v6)
    runner.run('group-settings-engagement-v6-final', (db) => {
        const columns = [
            { name: 'welcome_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'welcome_template', type: 'TEXT' },
            { name: 'ai_assistant_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'warning_reset_days', type: 'INTEGER DEFAULT 0' }
        ];
        columns.forEach(col => {
            try { db.exec(`ALTER TABLE group_settings ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });
    });

    // Forced Schema Sync for 2026 Compatibility (Deep Repair)
    runner.run('forced-schema-repair-v2026-v7', (db) => {
        // Repair whatsapp_sessions
        const wsCols = [
            { name: 'ai_mode', type: "TEXT DEFAULT 'bot'" },
            { name: 'ai_endpoint', type: 'TEXT' },
            { name: 'ai_key', type: 'TEXT' },
            { name: 'ai_temperature', type: 'REAL DEFAULT 0.7' },
            { name: 'ai_max_tokens', type: 'INTEGER DEFAULT 1000' },
            { name: 'ai_trigger_keywords', type: 'TEXT' },
            { name: 'ai_constraints', type: 'TEXT' },
            { name: 'ai_messages_received', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_last_error', type: 'TEXT' },
            { name: 'ai_last_message_at', type: 'DATETIME' },
            { name: 'ai_respond_to_tags', type: 'INTEGER DEFAULT 1' }
        ];
        wsCols.forEach(col => {
            try { db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });

        // Repair group_settings
        const gsCols = [
            { name: 'warning_reset_days', type: 'INTEGER DEFAULT 0' }
        ];
        gsCols.forEach(col => {
            try { db.exec(`ALTER TABLE group_settings ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });
    });

    // Migration: Encrypt existing AI keys
    runner.run('encrypt-existing-ai-keys', (db) => {
        const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
        if (!encryptionKey) return;

        // 1. Encrypt session keys
        const sessions = db.prepare("SELECT id, ai_key FROM whatsapp_sessions WHERE ai_key IS NOT NULL AND ai_key != ''").all();
        const updateSession = db.prepare("UPDATE whatsapp_sessions SET ai_key = ? WHERE id = ?");

        for (const session of sessions) {
            if (session.ai_key && !session.ai_key.includes(':')) {
                try {
                    const encrypted = encrypt(session.ai_key, encryptionKey);
                    updateSession.run(encrypted, session.id);
                } catch (e) {
                    log(`Migration : Échec chiffrement clé session ${session.id}`, 'SYSTEM', null, 'ERROR');
                }
            }
        }

        // 2. Encrypt global model keys
        const models = db.prepare("SELECT id, api_key FROM ai_models WHERE api_key IS NOT NULL AND api_key != ''").all();
        const updateModel = db.prepare("UPDATE ai_models SET api_key = ? WHERE id = ?");

        for (const model of models) {
            if (model.api_key && !model.api_key.includes(':')) {
                try {
                    const encrypted = encrypt(model.api_key, encryptionKey);
                    updateModel.run(encrypted, model.id);
                } catch (e) {
                    log(`Migration : Échec chiffrement clé modèle ${model.id}`, 'SYSTEM', null, 'ERROR');
                }
            }
        }
    });

    // Initialize default plans if empty
    const countRow = db.prepare('SELECT count(*) as count FROM pricing_plans').get();
    if (countRow && countRow.count === 0) {
        const insertPlan = db.prepare(`
            INSERT INTO pricing_plans (id, code, name, price, message_limit, interval, version, chariow_product_id, payment_url, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertPlan.run('plan_starter_v1', 'starter', 'Starter', 2500, 2000, 'month', 1, 'prd_jx0jkk', 'https://esaystor.online/prd_jx0jkk', JSON.stringify({ support: 'email' }));
        insertPlan.run('plan_pro_v1', 'pro', 'Pro', 5000, 10000, 'month', 1, 'prd_l2es24', 'https://esaystor.online/prd_l2es24', JSON.stringify({ support: 'priority' }));
        insertPlan.run('plan_business_v1', 'business', 'Business', 10000, 100000, 'month', 1, 'prd_twafj6', 'https://esaystor.online/prd_twafj6', JSON.stringify({ support: 'dedicated' }));
    }

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
