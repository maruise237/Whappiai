const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'whatsapp.db');
const db = new sqlite3.Database(dbPath);

db.get('SELECT status, token FROM whatsapp_sessions WHERE sessionId = ?', ['kamtech'], (err, row) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Result:', JSON.stringify(row));
    }
    db.close();
});
