const User = require('./src/models/User');
const CreditService = require('./src/services/CreditService');

async function grantCredits() {
    console.log('--- Démarrage de l\'attribution globale de crédits (+60) ---');

    try {
        const users = User.getAll();
        console.log(`Nombre total d'utilisateurs : ${users.length}`);

        let counter = 0;

        for (const user of users) {
            if (user.role === 'admin') {
                console.log(`Utilisateur admin ignoré : ${user.email}`);
                continue;
            }

            console.log(`+60 crédits pour : ${user.email} (${user.id})`);
            CreditService.add(user.id, 60, 'bonus', 'Crédits globaux +60 (campagne 2026-02)');
            counter++;
        }

        console.log(`--- Terminé : ${counter} utilisateur(s) non admin ont reçu +60 crédits ---`);
    } catch (error) {
        console.error('Erreur lors de l\'attribution globale des crédits :', error);
    }
}

grantCredits();
