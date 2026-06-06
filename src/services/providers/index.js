/**
 * WhatsApp Provider Factory
 * Selects a provider implementation based on environment config.
 */

const EvolutionApiProvider = require('./EvolutionApiProvider');

/**
 * @returns {import('./WhatsAppProvider')}
 */
function createWhatsAppProvider() {
    const providerName = (process.env.WHATSAPP_PROVIDER || 'evolution').toLowerCase();
    switch (providerName) {
        case 'evolution': {
            return new EvolutionApiProvider();
        }
        default:
            throw new Error(`Unknown WHATSAPP_PROVIDER: ${providerName}`);
    }
}

module.exports = { createWhatsAppProvider };
