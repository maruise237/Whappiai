/**
 * Postgres Schema Migration — v3
 * Simple, direct SQL execution.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pg = require('./postgres');

async function migrate() {
  console.log('=== Postgres Schema Migration ===\n');

  const ok = await pg.connect();
  if (!ok) { console.error('Postgres connection failed'); process.exit(1); }

  const tables = [
    'users', 'whatsapp_sessions', 'activity_logs', 'pricing_plans',
    'subscriptions', 'credit_history', 'group_settings', 'user_warnings',
    'webhooks', 'group_profiles', 'group_product_links',
    'group_engagement_tasks', 'ai_models', 'keyword_responders',
    'knowledge_base', 'knowledge_chunks', 'conversation_memory',
    'maintenance_settings', 'payment_transactions', 'user_notifications',
    'support_threads', 'support_messages',
    'ai_blacklisted_numbers', 'ai_whitelisted_numbers'
  ];

  for (const table of tables) {
    try {
      const sql = await getTableSQL(table);
      await pg.query(sql);
      console.log(`  \u2705 ${table}`);
    } catch (err) {
      console.log(`  \u274c ${table}: ${err.message}`);
    }
  }

  // Indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_email)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
    'CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_owner ON whatsapp_sessions(owner_email)',
    'CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status)',
    'CREATE INDEX IF NOT EXISTS idx_group_settings_session ON group_settings(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_credit_history_user ON credit_history(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_webhooks_session ON webhooks(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_conversation_memory_session ON conversation_memory(session_id)',
    'CREATE INDEX IF NOT EXISTS idx_support_threads_user ON support_threads(user_id, last_message_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_support_threads_status ON support_threads(status, last_message_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id, created_at ASC)',
  ];

  for (const idx of indexes) {
    try {
      await pg.query(idx);
      console.log(`  \u2705 ${idx.replace('CREATE INDEX IF NOT EXISTS ', 'INDEX ')}`);
    } catch (err) {
      console.log(`  \u274c ${idx.replace('CREATE INDEX IF NOT EXISTS ', 'INDEX ')}: ${err.message}`);
    }
  }

  await pg.disconnect();
  console.log('\n=== Migration complete ===');
}

function getTableSQL(table) {
  const defs = {
    users: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT,
      password TEXT NOT NULL, role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1, bio TEXT, location TEXT,
      website TEXT, phone TEXT, whatsapp_number TEXT,
      whatsapp_status TEXT DEFAULT 'disconnected',
      ai_enabled INTEGER DEFAULT 0, ai_prompt TEXT,
      ai_model TEXT DEFAULT 'deepseek-chat', image_url TEXT,
      plan_id TEXT DEFAULT 'free', plan_status TEXT DEFAULT 'active',
      message_limit INTEGER DEFAULT 100, message_used INTEGER DEFAULT 0,
      subscription_expiry TIMESTAMP, timezone TEXT DEFAULT 'UTC',
      organization_name TEXT, sound_notifications INTEGER DEFAULT 1,
      cal_access_token TEXT, cal_refresh_token TEXT, cal_token_expiry INTEGER,
      ai_cal_enabled INTEGER DEFAULT 0, ai_cal_video_allowed INTEGER DEFAULT 0,
      chariow_license_key TEXT, created_by TEXT, is_verified INTEGER DEFAULT 0,
      address TEXT, email_notifications INTEGER DEFAULT 1,
      push_notifications INTEGER DEFAULT 1, language TEXT DEFAULT 'fr'
    )`,
    whatsapp_sessions: `CREATE TABLE IF NOT EXISTS whatsapp_sessions (
      id TEXT PRIMARY KEY, owner_email TEXT, token TEXT NOT NULL,
      status TEXT DEFAULT 'DISCONNECTED', detail TEXT,
      pairing_code TEXT, qr_code TEXT,
      ai_enabled INTEGER DEFAULT 0, ai_model TEXT, ai_prompt TEXT,
      ai_mode TEXT DEFAULT 'bot', ai_endpoint TEXT, ai_key TEXT,
      ai_temperature REAL DEFAULT 0.7, ai_max_tokens INTEGER DEFAULT 1000,
      ai_trigger_keywords TEXT, ai_constraints TEXT,
      ai_messages_sent INTEGER DEFAULT 0, ai_messages_received INTEGER DEFAULT 0,
      ai_last_error TEXT, ai_last_message_at TIMESTAMP,
      ai_delay_min INTEGER DEFAULT 1, ai_delay_max INTEGER DEFAULT 5,
      ai_reject_calls INTEGER DEFAULT 0, ai_deactivate_on_typing INTEGER DEFAULT 0,
      ai_deactivate_on_read INTEGER DEFAULT 0, ai_session_window INTEGER DEFAULT 2,
      ai_respond_to_tags INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ai_reply_delay INTEGER DEFAULT 0, ai_read_on_reply INTEGER DEFAULT 0,
      ai_random_protection_enabled INTEGER DEFAULT 1,
      ai_random_protection_rate REAL DEFAULT 0.1,
      ai_unknown_only INTEGER DEFAULT 0,
      ai_business_hours INTEGER DEFAULT 0,
      ai_business_start INTEGER DEFAULT 9,
      ai_business_end INTEGER DEFAULT 18
    )`,
    activity_logs: `CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY, user_email TEXT, action TEXT NOT NULL,
      resource TEXT, resource_id TEXT, details TEXT,
      ip TEXT, user_agent TEXT, success INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    pricing_plans: `CREATE TABLE IF NOT EXISTS pricing_plans (
      id TEXT PRIMARY KEY, code TEXT NOT NULL, name TEXT NOT NULL,
      price INTEGER NOT NULL, currency TEXT DEFAULT 'XAF',
      message_limit INTEGER, interval TEXT DEFAULT 'month',
      is_active INTEGER DEFAULT 1, version INTEGER DEFAULT 1,
      chariow_product_id TEXT, payment_url TEXT, features TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    subscriptions: `CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY, user_id TEXT, plan_id TEXT,
      status TEXT, current_period_start TIMESTAMP, current_period_end TIMESTAMP,
      cancel_at_period_end INTEGER DEFAULT 0, chariow_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    credit_history: `CREATE TABLE IF NOT EXISTS credit_history (
      id TEXT PRIMARY KEY, user_id TEXT, amount INTEGER NOT NULL,
      type TEXT, description TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    group_settings: `CREATE TABLE IF NOT EXISTS group_settings (
      group_id TEXT NOT NULL, session_id TEXT NOT NULL,
      is_active INTEGER DEFAULT 0, anti_link INTEGER DEFAULT 0, bad_words TEXT,
      warning_template TEXT,
      max_warnings INTEGER DEFAULT 5, warning_reset_days INTEGER DEFAULT 0,
      welcome_enabled INTEGER DEFAULT 0, welcome_template TEXT,
      ai_assistant_enabled INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      welcome_digest_enabled INTEGER DEFAULT 0,
      welcome_digest_time TEXT DEFAULT '18:00',
      warnings_enabled INTEGER DEFAULT 1, auto_kick_enabled INTEGER DEFAULT 0,
      PRIMARY KEY (group_id, session_id)
    )`,
    user_warnings: `CREATE TABLE IF NOT EXISTS user_warnings (
      group_id TEXT NOT NULL, session_id TEXT NOT NULL, user_id TEXT NOT NULL,
      count INTEGER DEFAULT 0, last_warning_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, session_id, user_id)
    )`,
    webhooks: `CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, url TEXT NOT NULL,
      events TEXT, secret TEXT, is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    group_profiles: `CREATE TABLE IF NOT EXISTS group_profiles (
      group_id TEXT NOT NULL, session_id TEXT NOT NULL,
      mission TEXT, objectives TEXT, rules TEXT, theme TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, session_id)
    )`,
    group_product_links: `CREATE TABLE IF NOT EXISTS group_product_links (
      id SERIAL PRIMARY KEY, group_id TEXT NOT NULL, session_id TEXT NOT NULL,
      title TEXT, description TEXT, url TEXT, cta TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    group_engagement_tasks: `CREATE TABLE IF NOT EXISTS group_engagement_tasks (
      id SERIAL PRIMARY KEY, group_id TEXT NOT NULL, session_id TEXT NOT NULL,
      message_content TEXT, media_url TEXT, media_type TEXT DEFAULT 'text',
      scheduled_at TIMESTAMP NOT NULL, recurrence TEXT DEFAULT 'none',
      status TEXT DEFAULT 'pending', error_message TEXT, last_run_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    ai_models: `CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, provider TEXT NOT NULL,
      endpoint TEXT NOT NULL, api_key TEXT NOT NULL, model_name TEXT NOT NULL,
      description TEXT, is_active INTEGER DEFAULT 1, is_default INTEGER DEFAULT 0,
      temperature REAL DEFAULT 0.7, max_tokens INTEGER DEFAULT 2000,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    keyword_responders: `CREATE TABLE IF NOT EXISTS keyword_responders (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, keyword TEXT NOT NULL,
      match_type TEXT DEFAULT 'contains', response_type TEXT DEFAULT 'text',
      response_content TEXT NOT NULL, file_name TEXT, is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    knowledge_base: `CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, name TEXT NOT NULL,
      type TEXT, source TEXT, is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    knowledge_chunks: `CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id SERIAL PRIMARY KEY, base_id TEXT NOT NULL,
      session_id TEXT NOT NULL, content TEXT NOT NULL, metadata TEXT
    )`,
    conversation_memory: `CREATE TABLE IF NOT EXISTS conversation_memory (
      id SERIAL PRIMARY KEY, session_id TEXT NOT NULL,
      remote_jid TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    maintenance_settings: `CREATE TABLE IF NOT EXISTS maintenance_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      enabled INTEGER DEFAULT 0,
      scheduled_start_at TIMESTAMP, scheduled_end_at TIMESTAMP,
      title TEXT, message TEXT, icon TEXT DEFAULT 'Wrench',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_by TEXT
    )`,
    payment_transactions: `CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_token TEXT,
      user_id TEXT, plan_id TEXT, amount INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'XAF', status TEXT DEFAULT 'created',
      checkout_url TEXT, provider_payload TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    user_notifications: `CREATE TABLE IF NOT EXISTS user_notifications (
      id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT,
      message TEXT, is_read INTEGER DEFAULT 0, metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    support_threads: `CREATE TABLE IF NOT EXISTS support_threads (
      id TEXT PRIMARY KEY, ticket_code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL, user_email TEXT NOT NULL,
      subject TEXT NOT NULL, category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'open', priority TEXT DEFAULT 'normal',
      payment_order_id TEXT, payment_reference TEXT,
      last_message_preview TEXT,
      admin_unread_count INTEGER DEFAULT 0,
      user_unread_count INTEGER DEFAULT 0,
      last_reply_by TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    support_messages: `CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
      author_user_id TEXT, author_email TEXT, author_role TEXT NOT NULL,
      message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    ai_blacklisted_numbers: `CREATE TABLE IF NOT EXISTS ai_blacklisted_numbers (
      id SERIAL PRIMARY KEY, session_id TEXT NOT NULL,
      remote_jid TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    ai_whitelisted_numbers: `CREATE TABLE IF NOT EXISTS ai_whitelisted_numbers (
      id SERIAL PRIMARY KEY, session_id TEXT NOT NULL,
      remote_jid TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  };

  return defs[table];
}

migrate().catch(err => { console.error(err); process.exit(1); });
