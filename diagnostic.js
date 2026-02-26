const { db } = require('./src/config/database');
const User = require('./src/models/User');
const Session = require('./src/models/Session');

console.log('--- Diagnostic Système ---');

try {
    const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
    console.log(`Nombre d'utilisateurs: ${userCount}`);

    if (userCount > 0) {
        const admin = db.prepare("SELECT * FROM users WHERE role = 'admin' OR email = 'maruise237@gmail.com'").get();
        if (admin) {
            console.log(`Admin trouvé: ${admin.email} (ID: ${admin.id})`);
        } else {
            console.log('ATTENTION: Aucun admin trouvé !');
        }
    }

    const sessionCount = db.prepare('SELECT count(*) as count FROM whatsapp_sessions').get().count;
    console.log(`Nombre de sessions WhatsApp: ${sessionCount}`);

    const planCount = db.prepare('SELECT count(*) as count FROM pricing_plans').get().count;
    console.log(`Nombre de plans tarifaires: ${planCount}`);

    // Check for missing tables or columns
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    console.log('Tables présentes:', tables.join(', '));

} catch (e) {
    console.error('Erreur diagnostic:', e.message);
}
