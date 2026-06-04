// Bcrypt compatibility layer
// Tries to use bcrypt (faster, native) if available, falls back to bcryptjs (pure JS)

const { log } = require('./logger');
let bcrypt;

try {
    // Try to load native bcrypt first
    bcrypt = require('bcrypt');
    log('Utilisation de bcrypt natif (meilleures performances)', 'SYSTEM', { implementation: 'native' }, 'DEBUG');
} catch (error) {
    try {
        // Fall back to bcryptjs if bcrypt is not available
        bcrypt = require('bcryptjs');
        log('Utilisation de bcryptjs (implémentation pure JavaScript)', 'SYSTEM', { implementation: 'js' }, 'DEBUG');
    } catch (error2) {
        log('ERREUR: Ni bcrypt ni bcryptjs ne sont installés !', 'SYSTEM', { event: 'missing-dependency' }, 'ERROR');
        log('Veuillez lancer: npm install bcryptjs', 'SYSTEM', { hint: 'npm install bcryptjs' }, 'ERROR');
        process.exit(1);
    }
}

module.exports = bcrypt; 