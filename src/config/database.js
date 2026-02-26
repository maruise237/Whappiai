/**
 * Database Configuration and Initialization
 * SQLite database with better-sqlite3 for synchronous operations
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { log } = require('../utils/logger');
const MigrationRunner = require('./migrations');

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
    // 1. Core tables (Idempotent - CREATE TABLE IF NOT EXISTS)

    // Users
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
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

    // Group Engagement Tasks (Renamed from Animator)
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

    // 2. Additional Tables (Modern Whappi)

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

    // 3. Run Migrations (Professionalized)
    const runner = new MigrationRunner(db);
    runner.init();

    // Migration: Rename animator to engagement (Data continuity)
    runner.run('rename-animator-to-engagement-v2', (db) => {
        const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='group_animator_tasks'").get();
        if (tableCheck) {
            const newTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='group_engagement_tasks'").get();
            if (!newTableCheck) {
                db.exec("ALTER TABLE group_animator_tasks RENAME TO group_engagement_tasks");
            }
        }
    });

    // User table extensions
    runner.run('users-v2026-fields', (db) => {
        const columns = [
            { name: 'bio', type: 'TEXT' },
            { name: 'location', type: 'TEXT' },
            { name: 'website', type: 'TEXT' },
            { name: 'phone', type: 'TEXT' },
            { name: 'whatsapp_number', type: 'TEXT' },
            { name: 'whatsapp_status', type: "TEXT DEFAULT 'disconnected'" },
            { name: 'ai_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_prompt', type: 'TEXT' },
            { name: 'ai_model', type: "TEXT DEFAULT 'deepseek-chat'" },
            { name: 'plan_id', type: "TEXT DEFAULT 'free'" },
            { name: 'plan_status', type: "TEXT DEFAULT 'active'" },
            { name: 'message_limit', type: 'INTEGER DEFAULT 100' },
            { name: 'message_used', type: 'INTEGER DEFAULT 0' },
            { name: 'subscription_expiry', type: 'DATETIME' },
            { name: 'timezone', type: "TEXT DEFAULT 'UTC'" },
            { name: 'organization_name', type: 'TEXT' },
            { name: 'sound_notifications', type: 'INTEGER DEFAULT 1' }
        ];
        columns.forEach(col => {
            try { db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });
    });

    // WhatsApp Sessions pairing code
    runner.run('whatsapp-sessions-pairing-code', (db) => {
        try { db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN pairing_code TEXT`); } catch (e) {}
    });

    // WhatsApp Sessions AI fields
    runner.run('whatsapp-sessions-ai-fields', (db) => {
        const columns = [
            { name: 'ai_enabled', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_model', type: 'TEXT' },
            { name: 'ai_prompt', type: 'TEXT' },
            { name: 'ai_messages_sent', type: 'INTEGER DEFAULT 0' },
            { name: 'ai_delay_min', type: 'INTEGER DEFAULT 1' },
            { name: 'ai_delay_max', type: 'INTEGER DEFAULT 5' },
            { name: 'ai_reject_calls', type: 'INTEGER DEFAULT 0' }
        ];
        columns.forEach(col => {
            try { db.exec(`ALTER TABLE whatsapp_sessions ADD COLUMN ${col.name} ${col.type}`); } catch (e) {}
        });
    });

    // Group Settings extensions
    runner.run('group-settings-v2', (db) => {
        try { db.exec("ALTER TABLE group_settings ADD COLUMN welcome_enabled INTEGER DEFAULT 0"); } catch (e) {}
        try { db.exec("ALTER TABLE group_settings ADD COLUMN welcome_template TEXT"); } catch (e) {}
        try { db.exec("ALTER TABLE group_settings ADD COLUMN ai_assistant_enabled INTEGER DEFAULT 0"); } catch (e) {}
    });

    // Initialize default plans if empty
    const count = db.prepare('SELECT count(*) as count FROM pricing_plans').get();
    if (count.count === 0) {
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
