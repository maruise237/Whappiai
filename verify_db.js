const { db } = require('./src/config/database');

try {
    const user = db.prepare('SELECT * FROM users LIMIT 1').get();
    console.log('Colonnes de la table users :', Object.keys(user || {}));
    
    const requiredColumns = ['plan_id', 'plan_status', 'message_limit', 'subscription_expiry', 'chariow_license_key'];
    const missingColumns = requiredColumns.filter(col => user && !Object.keys(user).includes(col));
    
    if (missingColumns.length === 0) {
        console.log('SUCCÈS: Toutes les colonnes de paiement sont présentes.');
    } else {
        console.log('ÉCHEC: Colonnes manquantes :', missingColumns);
        // Si pas d'utilisateur, on ne peut pas vérifier les clés, mais on peut vérifier la structure de la table
        const tableInfo = db.pragma('table_info(users)');
        const columns = tableInfo.map(c => c.name);
        const reallyMissing = requiredColumns.filter(col => !columns.includes(col));
        
        if (reallyMissing.length === 0) {
            console.log('SUCCÈS (via PRAGMA): Toutes les colonnes sont présentes.');
        } else {
            console.log('ÉCHEC RÉEL: Colonnes manquantes :', reallyMissing);
        }
    }
} catch (e) {
    console.error('Erreur:', e);
}
