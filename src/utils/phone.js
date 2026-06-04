/**
 * Phone number utility
 */
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const { log } = require('./logger');

/**
 * Normalizes a phone number to a WhatsApp JID.
 * Adds the default country code if the number is too short.
 * @param {string} number - The phone number or JID
 * @param {string} defaultCountryCode - The default country code (e.g., '237')
 * @returns {string} - The normalized JID
 */
const normalizeJid = (number, defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '') => {
    if (!number) return null;
    
    let originalNumber = number;
    // If it's already a JID, return as is (normalized)
    if (number.includes('@')) {
        return jidNormalizedUser(number);
    }
    
    // Clean the number from any special characters except digits
    let cleanNumber = number.replace(/\D/g, '');
    
    // If a default country code is provided and the number is short (e.g., 9 digits for Cameroon)
    // we assume it's missing the country code.
    if (defaultCountryCode && cleanNumber.length <= 10 && !cleanNumber.startsWith(defaultCountryCode)) {
        log(`[Phone] Ajout de l'indicatif pays par défaut ${defaultCountryCode} à ${cleanNumber}`, 'SYSTEM', { original: cleanNumber, countryCode: defaultCountryCode }, 'DEBUG');
        cleanNumber = `${defaultCountryCode}${cleanNumber}`;
    }
    
    const jid = jidNormalizedUser(`${cleanNumber}@s.whatsapp.net`);
    log(`[Phone] Normalisation de ${originalNumber} en ${jid}`, 'SYSTEM', { original: originalNumber, jid }, 'DEBUG');
    return jid;
};

module.exports = {
    normalizeJid
};
