/**
 * Session Service (Provider-aware)
 * Bridges Whappi session lifecycle with the active WhatsApp provider (Evolution by default).
 *
 * Production runs on Evolution API. Session creation, QR, status, delete and
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
    return true;
}

const lastQrCache = new Map();

function normalizeOwner(owner) {
    if (!owner) return { id: null, email: null, role: 'user' };
    if (typeof owner === 'string') return { id: null, email: owner, role: 'user' };
    return {
        id: owner.id || null,
        email: owner.email || null,
        role: owner.role || 'user'
    };
}

function buildError(code, message, status = 400, extra = {}) {
    const err = new Error(message);
    err.code = code;
    err.status = status;
    Object.assign(err, extra);
    return err;
}

/**
 * Create or reconcile a session via the active provider.
 * Handles three drift cases robustly:
 *  - local session exists, provider missing   -> recreate provider instance
 *  - provider exists, local row missing       -> admin can adopt it
 *  - legacy owner alias (clerk-user_*)        -> auto-migrate to canonical email
 */
async function createSessionProvider(sessionId, ownerInput, phoneNumber = null, options = {}) {
    const provider = getProvider();
    const owner = normalizeOwner(ownerInput);
    const allowAdoptProviderOrphan = options.allowAdoptProviderOrphan === true || owner.role === 'admin';

    let session = await Session.findById(sessionId);
    const hadLocalSession = Boolean(session);

    if (session) {
        if (Session.isClaimable(session) && owner.email) {
            session = await Session.updateOwner(sessionId, owner.email);
        } else if (!Session.isOwnedBy(session, owner)) {
            throw buildError('SESSION_OWNERSHIP_CONFLICT', 'Cette session appartient déjà à un autre utilisateur', 403);
        } else if (owner.email && Session.normalizeOwnerEmail(session.owner_email) !== Session.normalizeOwnerEmail(owner.email)) {
            session = await Session.updateOwner(sessionId, owner.email);
            log(`Session ${sessionId} owner normalized to ${owner.email}`, 'SESSION', { sessionId, ownerId: owner.id }, 'INFO');
        }
    }

    const providerStatus = await provider.getStatus(sessionId);
    const providerExists = providerStatus && providerStatus.ok;
    const providerMissing = !providerExists && Number(providerStatus && providerStatus.status) === 404;

    if (!session) {
        if (providerExists && !allowAdoptProviderOrphan) {
            throw buildError('SESSION_NAME_TAKEN', `Ce nom de session est déjà utilisé. Choisissez un autre nom.`, 409);
        }

        session = await Session.create(sessionId, owner.email);

        if (providerExists && allowAdoptProviderOrphan) {
            log(`Provider-only session ${sessionId} adopted locally by ${owner.email || owner.id || 'unknown-user'}`, 'SESSION', { sessionId, owner }, 'WARN');
        }
    }

    if (!providerExists) {
        if (!providerMissing && providerStatus && providerStatus.error) {
            throw buildError('PROVIDER_STATUS_ERROR', `Provider error: ${providerStatus.error}`, 502, { providerStatus });
        }

        const r = await provider.createInstance(sessionId, { phoneNumber });
        if (!r.ok) {
            log(`Provider createInstance failed for ${sessionId}: ${r.error}`, 'SESSION', null, 'ERROR');
            if (!hadLocalSession) {
                try { await Session.delete(sessionId); } catch (_) { /* ignore */ }
            }
            throw buildError('PROVIDER_CREATE_ERROR', `Provider error: ${r.error || r.status}`, 502, { providerResult: r });
        }
    }

    // Fetch the QR / pairing code after creation or reconciliation.
    try {
        const pair = await provider.getQr(sessionId);
        if (pair && pair.ok && pair.qr) {
            await Session.updateStatus(
                sessionId,
                'CONNECTING',
                phoneNumber ? 'Pairing code issued' : 'QR issued',
                pair.qr.pairingCode || undefined,
                pair.qr.base64 || pair.qr.code || undefined
            );
        } else if (providerExists) {
            await Session.updateStatus(sessionId, 'CONNECTING', 'Provider instance found');
        }
    } catch (e) {
        log(`QR/pairing fetch failed for ${sessionId}: ${e.message}`, 'SESSION', null, 'WARN');
    }

    return await Session.findById(sessionId);
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
async function sendTextMessageProvider(sessionId, input) {
    const provider = getProvider();
    return provider.sendTextMessage(sessionId, { jid: input.jid, text: input.text });
}

/**
 * Send a media message via the provider.
 */
async function sendMediaProvider(sessionId, input) {
    const provider = getProvider();
    return provider.sendMedia(sessionId, {
        jid: input.jid,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType || 'image',
        caption: input.caption || '',
        fileName: input.fileName
    });
}

/**
 * Delete a message for everyone via the provider.
 */
async function deleteMessageProvider(sessionId, msg) {
    const provider = getProvider();
    return provider.deleteMessage(sessionId, msg);
}

/**
 * Update group participants (kick/promote/demote) via the provider.
 */
async function groupUpdateParticipantProvider(sessionId, opts) {
    const provider = getProvider();
    return provider.groupUpdateParticipant(sessionId, opts);
}

/**
 * Resolve a @lid participant JID to the actual WhatsApp phone JID.
 */
async function resolveParticipantJidProvider(sessionId, lidJid) {
    const provider = getProvider();
    return provider.resolveParticipantJid(sessionId, lidJid);
}

/**
 * Reconcile all sessions' local DB status with the provider's live state.
 * Called before returning session list so the UI never shows stale status.
 *
 * @param {string} ownerEmail - filter sessions for this owner (optional)
 * @param {boolean} isAdmin  - if true, reconcile all sessions
 */
async function reconcileSessionsStatus(ownerEmail = null, isAdmin = false) {
    if (!isProviderActive()) return;

    const sessions = await Session.getAll(ownerEmail, isAdmin);
    const provider = getProvider();

    const stateMap = {
        'open': 'CONNECTED',
        'connecting': 'CONNECTING',
        'close': 'DISCONNECTED',
        'closed': 'DISCONNECTED',
        'disconnected': 'DISCONNECTED'
    };

    for (const session of sessions) {
        try {
            const r = await provider.getStatus(session.id);
            if (!r.ok || !r.state) continue;

            const liveStatus = stateMap[r.state.toLowerCase()] || null;
            if (!liveStatus) {
                log(`[Reconcile] Unknown state "${r.state}" for ${session.id}`, 'SESSION', null, 'DEBUG');
                continue;
            }

            // Skip if DB already matches live state
            if (session.status === liveStatus) continue;

            log(
                `[Reconcile] ${session.id}: DB=${session.status} → Evolution=${r.state} (→ ${liveStatus})`,
                'SESSION',
                { sessionId: session.id, from: session.status, to: liveStatus, evolutionState: r.state },
                'INFO'
            );

            Session.updateStatus(session.id, liveStatus, `Reconciled from Evolution: ${r.state}`);
        } catch (e) {
            log(`[Reconcile] Error checking ${session.id}: ${e.message}`, 'SESSION', null, 'WARN');
        }
    }
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
    sendMediaProvider,
    deleteMessageProvider,
    resolveParticipantJidProvider,
    groupUpdateParticipantProvider,
    reconcileSessionsStatus,
    lastQrCache
};
