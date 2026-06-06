/**
 * Session Service (Provider-aware)
 * Bridges Whappi session lifecycle with the active WhatsApp provider (Evolution by default).
 *
 * The legacy Baileys path is still available behind WHATSAPP_PROVIDER=baileys.
 * When WHATSAPP_PROVIDER=evolution, session creation, QR, status, delete and
 * message send go through the Evolution API client.
 */

const { createWhatsAppProvider } = require('./providers');
const Session = require('../models/Session');
const { log } = require('../utils/logger');

let _provider = null;
function getProvider() {
    if (!_provider) _provider = createWhatsAppProvider();
    return _provider;
}

function isProviderActive() {
    return (process.env.WHATSAPP_PROVIDER || 'evolution').toLowerCase() !== 'baileys';
}

const lastQrCache = new Map();

/**
 * Create a session via the active provider.
 * For Evolution, this calls /instance/create and fetches the first QR/pairing code.
 */
async function createSessionProvider(sessionId, email, phoneNumber = null) {
    const provider = getProvider();
    // Persist metadata first so the UI has a row even if the provider is slow.
    const session = Session.create(sessionId, email);
    // Pass the phone number to Evolution so it issues a pairing code on the
    // same call (we don't need a separate pairing endpoint).
    const r = await provider.createInstance(sessionId, { phoneNumber });
    if (!r.ok) {
        log(`Provider createInstance failed for ${sessionId}: ${r.error}`, 'SESSION', null, 'ERROR');
        // Best-effort cleanup of the local row to avoid orphan DB entries.
        try { Session.delete(sessionId); } catch (_) { /* ignore */ }
        throw new Error(`Provider error: ${r.error || r.status}`);
    }
    // Fetch the QR / pairing code from Evolution right after creation.
    try {
        const pair = await provider.getQr(sessionId);
        if (pair && pair.ok && pair.qr) {
            Session.updateStatus(
                sessionId,
                'CONNECTING',
                phoneNumber ? 'Pairing code issued' : 'QR issued',
                pair.qr.pairingCode || undefined,
                pair.qr.base64 || pair.qr.code || undefined
            );
        }
    } catch (e) {
        log(`QR/pairing fetch failed for ${sessionId}: ${e.message}`, 'SESSION', null, 'WARN');
    }
    return session;
}

/**
 * Fetch a fresh QR / pairing code for the given session via the provider.
 */
async function getQrProvider(sessionId) {
    const provider = getProvider();
    const r = await provider.getQr(sessionId);
    if (r && r.qr) {
        lastQrCache.set(sessionId, r.qr);
    }
    return r;
}

/**
 * Get the current status of a session via the provider.
 * Falls back to DB status when the provider is offline.
 */
async function getStatusProvider(sessionId) {
    const provider = getProvider();
    try {
        return await provider.getStatus(sessionId);
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

/**
 * Delete a session both locally and on the provider.
 */
async function deleteSessionProvider(sessionId) {
    const provider = getProvider();
    const r = await provider.deleteInstance(sessionId);
    lastQrCache.delete(sessionId);
    return r;
}

/**
 * Disconnect (logout) a session on the provider.
 */
async function disconnectSessionProvider(sessionId) {
    const provider = getProvider();
    return provider.disconnectInstance(sessionId);
}

/**
 * Send a text message via the provider.
 */
async function sendTextMessageProvider(sessionId, jid, text) {
    const provider = getProvider();
    return provider.sendTextMessage(sessionId, { jid, text });
}

module.exports = {
    isProviderActive,
    getProvider,
    createSessionProvider,
    getQrProvider,
    getStatusProvider,
    deleteSessionProvider,
    disconnectSessionProvider,
    sendTextMessageProvider,
    lastQrCache
};
