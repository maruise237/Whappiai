const db = require('../db/query');

let schemaReady = false;

async function ensureSupportSchema() {
    if (schemaReady) return;

    await db.run(`
        CREATE TABLE IF NOT EXISTS support_threads (
            id TEXT PRIMARY KEY,
            ticket_code TEXT UNIQUE NOT NULL,
            user_id TEXT NOT NULL,
            user_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            status TEXT DEFAULT 'open',
            priority TEXT DEFAULT 'normal',
            payment_order_id TEXT,
            payment_reference TEXT,
            last_message_preview TEXT,
            admin_unread_count INTEGER DEFAULT 0,
            user_unread_count INTEGER DEFAULT 0,
            last_reply_by TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS support_messages (
            id TEXT PRIMARY KEY,
            thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
            author_user_id TEXT,
            author_email TEXT,
            author_role TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_support_threads_user ON support_threads(user_id, last_message_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_support_threads_status ON support_threads(status, last_message_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_support_threads_payment ON support_threads(payment_order_id)',
        'CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id, created_at ASC)',
        'CREATE INDEX IF NOT EXISTS idx_payment_transactions_updated ON payment_transactions(updated_at DESC)',
    ];

    for (const sql of indexes) {
        await db.run(sql);
    }

    schemaReady = true;
}

module.exports = {
    ensureSupportSchema,
};
