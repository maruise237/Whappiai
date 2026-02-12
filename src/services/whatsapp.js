/**
 * WhatsApp Service
 * Handles Baileys WhatsApp connection logic
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    fetchLatestWaWebVersion,
    makeCacheableSignalKeyStore,
    isJidBroadcast,
    Browsers,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { log } = require('../utils/logger');

// Logger configuration
const defaultLogLevel = process.env.NODE_ENV === 'production' ? 'silent' : 'warn';
const logger = pino({ level: process.env.LOG_LEVEL || defaultLogLevel });

// Active socket connections (in-memory)
const activeSockets = new Map();
const retryCounters = new Map();

// Auth directory
const AUTH_DIR = path.join(__dirname, '../../auth_info_baileys');

/**
 * Ensure auth directory exists
 */
function ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
}

/**
 * Connect to WhatsApp
 * @param {string} sessionId - Session ID
 * @param {function} onUpdate - Callback for status updates
 * @param {function} onMessage - Callback for incoming messages
 * @param {string} phoneNumber - Optional phone number for pairing code
 * @returns {object} Socket connection
 */
async function connect(sessionId, onUpdate, onMessage, phoneNumber = null) {
    if (!require('../utils/validation').isValidId(sessionId)) {
        throw new Error('Invalid session ID');
    }

    // Disconnect existing socket if any
    disconnect(sessionId);

    ensureAuthDir();

    const sessionDir = path.join(AUTH_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Update session status
    if (onUpdate) onUpdate(sessionId, 'CONNECTING', 'Initializing...', null);

    let state, originalSaveCreds;
    try {
        log(`Chargement de l'état d'authentification depuis: ${sessionDir}`, sessionId, { event: 'auth-loading', path: sessionDir }, 'DEBUG');
        const authState = await useMultiFileAuthState(sessionDir);
        state = authState.state;
        originalSaveCreds = authState.saveCreds;
    } catch (err) {
        log(`Échec du chargement de l'état d'authentification: ${err.message}`, sessionId, { event: 'auth-error', error: err.message }, 'ERROR');
        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', `Auth state error: ${err.message}`, null);
        throw err;
    }

    // Wrapper for saveCreds with retry logic for Windows EPERM errors
    const saveCreds = async () => {
        let retries = 10;
        while (retries > 0) {
            try {
                await originalSaveCreds();
                return;
            } catch (err) {
                retries--;
                if (err.code === 'EPERM' && retries > 0) {
                    log(`Erreur EPERM lors de la sauvegarde des identifiants, tentative... (${retries} restantes)`, sessionId, { event: 'auth-save-retry', retries }, 'WARN');
                    await new Promise(resolve => setTimeout(resolve, 200));
                } else {
                    log(`Échec de la sauvegarde des identifiants: ${err.message}`, sessionId, { event: 'auth-save-error', error: err.message }, 'ERROR');
                    throw err;
                }
            }
        }
    };

    // Get latest WA version (with fallback)
    let version;
    try {
        const waVersion = await fetchLatestWaWebVersion({});
        version = waVersion.version;
        log(`Utilisation de la version WA Web: ${version.join('.')}`, sessionId, { event: 'wa-version', version: version.join('.') }, 'DEBUG');
    } catch (e) {
        const baileysVersion = await fetchLatestBaileysVersion();
        version = baileysVersion.version;
        log(`Utilisation de la version Baileys: ${version.join('.')} (fallback)`, sessionId, { event: 'baileys-version', version: version.join('.') }, 'DEBUG');
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false,
        qrTimeout: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: false,
        shouldIgnoreJid: (jid) => isJidBroadcast(jid),
        markOnlineOnConnect: true,
        linkPreviewImageThumbnailWidth: 192,
        getMessage: async (key) => {
            // This helps with message retries
            return { conversation: 'hello' };
        },
        // Performance & Stability Tweaks
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                return {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2,
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 5,
    });

    // Store socket reference
    activeSockets.set(sessionId, sock);

    // Handle Pairing Code request if phone number is provided
    if (phoneNumber && !state.creds.registered) {
        // Sanitize phone number (only digits)
        const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, '');
        log(`Demande de code d'appairage pour ${sanitizedPhoneNumber}`, sessionId, { event: 'pairing-code-request', phoneNumber: sanitizedPhoneNumber }, 'INFO');
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(sanitizedPhoneNumber);
                log(`Code d'appairage reçu: ${code}`, sessionId, { event: 'pairing-code-received', code }, 'INFO');
                if (onUpdate) onUpdate(sessionId, 'GENERATING_CODE', 'Pairing code generated', code);
            } catch (err) {
                log(`Erreur lors de la demande du code d'appairage: ${err.message}`, sessionId, { event: 'pairing-code-error', error: err.message }, 'ERROR');
                if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', `Pairing error: ${err.message}`, null);
            }
        }, 5000); // Increased delay to ensure socket is fully ready
    }

    // Handle credentials update
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            log(`Nouveau code QR généré`, sessionId, { event: 'qr-generated' }, 'INFO');
            try {
                const qrBase64 = await QRCode.toDataURL(qr);
                if (onUpdate) onUpdate(sessionId, 'GENERATING_QR', 'Scan QR code', qrBase64);
            } catch (err) {
                log(`Erreur lors de la génération du QR DataURL: ${err.message}`, sessionId, { event: 'qr-error', error: err.message }, 'ERROR');
                if (onUpdate) onUpdate(sessionId, 'GENERATING_QR', 'Scan QR code', qr);
            }
        }

        if (connection === 'connecting') {
            log(`Connexion en cours...`, sessionId, { event: 'connection-connecting' }, 'INFO');
            if (onUpdate) onUpdate(sessionId, 'CONNECTING', 'Connecting...', null);
        }

        if (connection === 'open') {
        const name = sock.user?.name || 'Unknown';
        log(`WhatsApp connecté: ${name}`, sessionId, { event: 'connection-open', user: name }, 'INFO');
        retryCounters.delete(sessionId);

        if (onUpdate) onUpdate(sessionId, 'CONNECTED', `Connected as ${name}`, null);
    }

    if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.output?.payload?.message || 'Connection closed';

        log(`WhatsApp disconnected: ${reason} (Code: ${statusCode})`, sessionId, { 
            event: 'connection-close', 
            statusCode, 
            reason 
        }, statusCode === DisconnectReason.loggedOut ? 'WARN' : 'ERROR');
        
        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', reason, null);

            // Handle reconnection logic
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                  statusCode !== 401 && 
                                  statusCode !== 403 &&
                                  statusCode !== 440; // Avoid infinite loop on session expired

            if (shouldReconnect) {
                const retryCount = (retryCounters.get(sessionId) || 0) + 1;
                retryCounters.set(sessionId, retryCount);

                // Exponential backoff for WhatsApp reconnection
                // Start with shorter delay for network glitches, then increase
                const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 60000);
                
                if (retryCount <= 15) { // Increased to 15 retries for better resilience
                log(`Reconnexion... (tentative ${retryCount}) dans ${delay}ms`, sessionId, {
                    event: 'connection-retry',
                    attempt: retryCount,
                    delay
                }, 'INFO');
                if (onUpdate) onUpdate(sessionId, 'CONNECTING', `Reconnecting (attempt ${retryCount})...`, null);
                    setTimeout(() => {
                        // Check if it's still disconnected before trying to connect again
                        if (!activeSockets.has(sessionId)) {
                            connect(sessionId, onUpdate, onMessage).catch(err => {
                                log(`Échec de la tentative de reconnexion ${retryCount}: ${err.message}`, sessionId, { event: 'reconnect-failed', attempt: retryCount, error: err.message }, 'ERROR');
                            });
                        }
                    }, delay);
                } else {
                    log(`Nombre maximum de tentatives de reconnexion atteint`, sessionId, { event: 'reconnect-max-reached' }, 'WARN');
                    retryCounters.delete(sessionId);
                    if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', 'Max reconnection attempts reached', null);
                }
            } else {
                // Clear session data on logout
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    log(`Déconnexion effectuée, nettoyage des données de session`, sessionId, { event: 'session-cleanup' }, 'INFO');
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                }
            }

            activeSockets.delete(sessionId);
        }
    });

    // Handle incoming calls (Auto-reject if enabled)
    sock.ev.on('call', async (calls) => {
        try {
            const Session = require('../models/Session');
            const session = Session.findById(sessionId);
            
            if (session && (session.ai_reject_calls === 1 || session.ai_reject_calls === true)) {
                for (const call of calls) {
                    if (call.status === 'offer') {
                        log(`Appel entrant détecté de ${call.from}, rejet automatique activé`, sessionId, { event: 'call-reject', from: call.from, callId: call.id }, 'INFO');
                        await sock.rejectCall(call.id, call.from);
                    }
                }
            }
        } catch (err) {
            log(`Erreur lors du traitement de l'appel pour ${sessionId}: ${err.message}`, sessionId, { event: 'call-reject-error', error: err.message }, 'ERROR');
        }
    });

    // Handle participant updates (moderation, welcome, etc.)
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const moderationService = require('./moderation');
            await moderationService.handleParticipantUpdate(sock, sessionId, update);
        } catch (err) {
            log(`Erreur lors du traitement de la mise à jour des participants pour ${sessionId}: ${err.message}`, sessionId, { event: 'participant-update-error', error: err.message }, 'ERROR');
        }
    });

    // Handle presence updates (typing detection)
    sock.ev.on('presence.update', async (update) => {
        const { id, presences } = update;
        const session = require('../models/Session').findById(sessionId);
        
        if (session && session.ai_enabled && session.ai_deactivate_on_typing) {
            // Check if any presence is 'composing' from the remote user
            for (const jid in presences) {
                const presence = presences[jid];
                if (presence.lastKnownPresence === 'composing') {
                    log(`Détection d'écriture de ${jid}, désactivation temporaire de l'IA pour cette session`, sessionId, { event: 'ai-auto-pause-typing', jid }, 'INFO');
                    // We don't disable ai_enabled globally, but we could flag the session to skip next message
                    // For now, let's actually disable it to be sure, or use a memory flag
                    require('../models/Session').updateAIConfig(sessionId, { enabled: false });
                    // Broadcast to frontend
                    const { broadcastToClients } = require('../index');
                    if (broadcastToClients) {
                        broadcastToClients({
                            type: 'session-update',
                            data: [{ sessionId, ai_enabled: 0, detail: 'IA désactivée (détection d\'écriture)' }]
                        });
                    }
                }
            }
        }
    });

    // Handle read receipts
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update.status === 3 || update.update.status === 4) { // READ or PLAYED
                const session = require('../models/Session').findById(sessionId);
                if (session && session.ai_enabled && session.ai_deactivate_on_read) {
                    log(`Message lu par le destinataire, désactivation de l'IA`, sessionId, { event: 'ai-auto-pause-read' }, 'INFO');
                    require('../models/Session').updateAIConfig(sessionId, { enabled: false });
                    // Broadcast to frontend
                    const { broadcastToClients } = require('../index');
                    if (broadcastToClients) {
                        broadcastToClients({
                            type: 'session-update',
                            data: [{ sessionId, ai_enabled: 0, detail: 'IA désactivée (message lu)' }]
                        });
                    }
                }
            }
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && msg.message) {
            const remoteJid = msg.key.remoteJid;
            const isGroup = remoteJid.endsWith('@g.us');
            
            log(`Message entrant de ${remoteJid} (${isGroup ? 'Groupe' : 'Direct'})`, sessionId, {
                event: 'message-received',
                remoteJid: remoteJid,
                pushName: msg.pushName,
                isGroup
            }, 'INFO');
            
            // Call standard message handler if provided
            if (onMessage) {
                onMessage(sessionId, msg);
            }

            // Call Moderation Handler
            let blocked = false;
            try {
                const moderationService = require('./moderation');
                blocked = await moderationService.handleIncomingMessage(sock, sessionId, msg);
            } catch (err) {
                log(`Erreur de modération pour la session ${sessionId}: ${err.message}`, sessionId, { event: 'moderation-error', error: err.message }, 'ERROR');
            }

            if (blocked) {
                log(`Message de ${msg.key.remoteJid} bloqué par la modération`, sessionId, {
                    event: 'moderation-block',
                    remoteJid: msg.key.remoteJid
                }, 'WARN');
                return;
            }

            // Call AI Handler if enabled (Personal Bot mode)
            // Note: Group Assistant is handled inside moderationService.handleIncomingMessage
            if (!isGroup) {
                try {
                    const aiService = require('./ai');
                    log(`Déclenchement du gestionnaire d'IA personnel pour la session ${sessionId}...`, sessionId, { event: 'ai-trigger' }, 'DEBUG');
                    await aiService.handleIncomingMessage(sock, sessionId, msg);
                } catch (err) {
                    log(`Erreur du gestionnaire d'IA pour la session ${sessionId}: ${err.message}`, sessionId, { event: 'ai-handler-error', error: err.message }, 'ERROR');
                }
            }
        }
    });

    return sock;
}

/**
 * Disconnect a session
 * @param {string} sessionId - Session ID
 */
function disconnect(sessionId) {
    const sock = activeSockets.get(sessionId);
    if (sock) {
        sock.end();
        activeSockets.delete(sessionId);
    }
    retryCounters.delete(sessionId);
}

/**
 * Get socket for a session
 * @param {string} sessionId - Session ID
 * @returns {object|null} Socket or null
 */
function getSocket(sessionId) {
    return activeSockets.get(sessionId) || null;
}

/**
 * Check if session is connected
 * @param {string} sessionId - Session ID
 * @returns {boolean} True if connected
 */
function isConnected(sessionId) {
    const sock = activeSockets.get(sessionId);
    return sock?.user != null;
}

/**
 * Delete session data
 * @param {string} sessionId - Session ID
 */
function deleteSessionData(sessionId) {
    if (!require('../utils/validation').isValidId(sessionId)) {
        return;
    }

    disconnect(sessionId);

    const sessionDir = path.join(AUTH_DIR, sessionId);
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }
}

/**
 * Get all active sessions
 * @returns {Map} Active sockets
 */
function getActiveSessions() {
    return activeSockets;
}

module.exports = {
    connect,
    disconnect,
    getSocket,
    isConnected,
    deleteSessionData,
    getActiveSessions,
    AUTH_DIR
};
