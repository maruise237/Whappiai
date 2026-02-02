const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data/whatsapp.db');
const db = new Database(dbPath);
const users = db.prepare("SELECT id, email, role, is_active FROM users").all();
console.log("Users:");
console.log(JSON.stringify(users, null, 2));

const logs = db.prepare("SELECT * FROM activity_logs WHERE action='LOGIN' ORDER BY created_at DESC LIMIT 5").all();
console.log("\nRecent Login Logs:");
console.log(JSON.stringify(logs, null, 2));
db.close();
