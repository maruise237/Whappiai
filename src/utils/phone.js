/**
 * Phone number and WhatsApp JID utilities
 */
const { log } = require('./logger');

/**
 * Normalize a WhatsApp address without relying on the legacy Baileys runtime.
 * Handles common user/group JID variants and strips device suffixes.
 * @param {string} jid
 * @returns {string|null}
 */
const normalizeWhatsAppJid = (jid) => {
    if (!jid) return null;

    const raw = String(jid).trim();
    if (!raw) return null;

    if (!raw.includes('@')) {
        const digits = raw.replace(/\D/g, '');
        return digits ? `${digits}@s.whatsapp.net` : null;
    }

    const atIndex = raw.indexOf('@');
    let user = raw.slice(0, atIndex).trim();
    let domain = raw.slice(atIndex + 1).trim().toLowerCase();

    if (!user || !domain) return null;

    if (domain === 'c.us') {
        domain = 's.whatsapp.net';
    }

    if (domain === 's.whatsapp.net' || domain === 'g.us') {
        user = user.split(':')[0];
    }

    return `${user}@${domain}`;
};

/**
 * Normalize a phone number to a WhatsApp JID.
 * Adds the default country code if the number is too short.
 * @param {string} number - The phone number or JID
 * @param {string} defaultCountryCode - The default country code (e.g., '237')
 * @returns {string|null} - The normalized JID
 */
const normalizeJid = (number, defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '') => {
    if (!number) return null;

    const originalNumber = number;

    if (number.includes('@')) {
        return normalizeWhatsAppJid(number);
    }

    let cleanNumber = number.replace(/\D/g, '');

    if (defaultCountryCode && cleanNumber.length <= 10 && !cleanNumber.startsWith(defaultCountryCode)) {
        log(`[Phone] Ajout de l'indicatif pays par defaut ${defaultCountryCode} a ${cleanNumber}`, 'SYSTEM', { original: cleanNumber, countryCode: defaultCountryCode }, 'DEBUG');
        cleanNumber = `${defaultCountryCode}${cleanNumber}`;
    }

    const jid = normalizeWhatsAppJid(`${cleanNumber}@s.whatsapp.net`);
    log(`[Phone] Normalisation de ${originalNumber} en ${jid}`, 'SYSTEM', { original: originalNumber, jid }, 'DEBUG');
    return jid;
};

module.exports = {
    normalizeJid,
    normalizeWhatsAppJid
};
