const { db } = require('./src/config/database');
const User = require('./src/models/User');
const CreditService = require('./src/services/CreditService');
const { log } = require('./src/utils/logger');
const crypto = require('crypto');

async function giveWelcomeCredits() {
    console.log('--- Démarrage de l\'attribution des crédits de bienvenue ---');

    try {
        const users = User.getAll();
        console.log(`Nombre total d'utilisateurs : ${users.length}`);

        let counter = 0;

        for (const user of users) {
            // Vérifier si l'utilisateur a déjà reçu le bonus de bienvenue
            const history = CreditService.getHistory(user.id);
            const hasWelcomeBonus = history.some(h =>
                (h.type === 'bonus' || h.type === 'credit') &&
                (h.description.toLowerCase().includes('bienvenue') || h.description.toLowerCase().includes('welcome'))
            );

            if (!hasWelcomeBonus) {
                console.log(`Attribution du bonus à : ${user.email} (${user.id})`);

                // Ajouter les 60 crédits
                CreditService.add(user.id, 60, 'bonus', 'Crédits de bienvenue (Rétroactif)');

                // S'assurer que message_limit est au moins à 60 si c'était plus bas
                // Mais CreditService.add fait déjà message_limit + 60.
                // Si l'utilisateur avait 0, il aura 60. S'il avait déjà des crédits mais pas le bonus officiel, on lui rajoute.

                counter++;
            } else {
                console.log(`L'utilisateur ${user.email} a déjà bénéficié du bonus.`);
            }
        }

        console.log(`--- Terminé : ${counter} utilisateurs ont reçu leurs crédits ---`);
    } catch (error) {
        console.error('Erreur lors de l\'attribution des crédits :', error);
    }
}

giveWelcomeCredits();
