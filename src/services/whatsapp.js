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
const { db } = require('../config/database');
const WebhookService = require('./WebhookService');
const KeywordService = require('./KeywordService');
const aiService = require('./ai');
const moderationService = require('./moderation');

// Logger configuration
const defaultLogLevel = process.env.NODE_ENV === 'production' ? 'silent' : 'warn';
const logger = pino({ level: process.env.LOG_LEVEL || defaultLogLevel });

// Active socket connections (in-memory)
const activeSockets = new Map();
const retryCounters = new Map();
const reconnectTimeouts = new Map();
const lastQrs = new Map();
const connectingSessions = new Set();
const deletingSessions = new Set();

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

    if (deletingSessions.has(sessionId)) {
        log(`Session ${sessionId} en cours de suppression, connexion annulée`, sessionId, { event: 'connect-aborted-deleting' }, 'WARN');
        return null;
    }

    // Connection lock to prevent concurrent attempts for same ID
    if (connectingSessions.has(sessionId)) {
        log(`Connexion déjà en cours pour ${sessionId}, abandon de l'appel concurrent`, sessionId, { event: 'connect-locked' }, 'WARN');
        return activeSockets.get(sessionId);
    }
    connectingSessions.add(sessionId);

    try {
        // Disconnect existing socket if any
        await disconnect(sessionId, false); // false = don't clear retry counter

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
        // Fast exit if session directory is gone (cleanup happened)
        if (!fs.existsSync(sessionDir)) {
            return;
        }

        let retries = 10;
        while (retries > 0) {
            try {
                await originalSaveCreds();
                return;
            } catch (err) {
                // Ignore ENOENT (directory deleted during save)
                if (err.code === 'ENOENT') {
                    log(`Sauvegarde ignorée: dossier de session supprimé`, sessionId, { event: 'auth-save-enoent' }, 'DEBUG');
                    return;
                }

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
        browser: Browsers.ubuntu(`Whappi-${sessionId}`),
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

    // Release connecting lock once socket is created and added to activeSockets
    connectingSessions.delete(sessionId);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            log(`Nouveau code QR généré`, sessionId, { event: 'qr-generated' }, 'INFO');
            try {
                const qrBase64 = await QRCode.toDataURL(qr);
                lastQrs.set(sessionId, qrBase64);
                if (onUpdate) onUpdate(sessionId, 'GENERATING_QR', 'Scan QR code', qrBase64);
            } catch (err) {
                log(`Erreur lors de la génération du QR DataURL: ${err.message}`, sessionId, { event: 'qr-error', error: err.message }, 'ERROR');
                lastQrs.set(sessionId, qr);
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

            // Wait for stability before resetting retry counter to break conflict loops (440)
            setTimeout(() => {
                const currentSock = activeSockets.get(sessionId);
                if (currentSock === sock && currentSock?.user) {
                    log(`Connexion stabilisée pour ${sessionId}, réinitialisation du compteur de tentatives`, sessionId, { event: 'connection-stabilized' }, 'DEBUG');
                    retryCounters.delete(sessionId);
                }
            }, 120000); // 2 minutes of stable connection required to reset counter

            lastQrs.delete(sessionId);

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
            
            // Clean up socket reference immediately
            activeSockets.delete(sessionId);
            lastQrs.delete(sessionId);

            if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', reason, null);

            // Handle reconnection logic
            // We now attempt to reconnect even on 440 (Conflict) and 428 (Terminated) to fulfill "permanent connection" requirement
            const isConflict = statusCode === 440;

            // Critical: If it's a conflict, we check if we've already tried too many times recently
            // to avoid infinite fighting between two processes
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                  statusCode !== 401 && 
                                  statusCode !== 403;

            if (shouldReconnect) {
                const retryCount = (retryCounters.get(sessionId) || 0) + 1;
                retryCounters.set(sessionId, retryCount);

                // Exponential backoff for WhatsApp reconnection (min 5s at startup to be safe)
                // If it's a conflict, we wait significantly longer (min 1 min) to let the other session breath
                // and we increase the delay exponentially to avoid spamming the server
                let delay = Math.max(5000, Math.min(2000 * Math.pow(2, retryCount - 1), 120000));

                if (isConflict) {
                    // Start at 1 min for conflict, up to 10 mins, + random jitter (0-30s) to break sync loops
                    const jitter = Math.floor(Math.random() * 30000);
                    delay = Math.max(delay, (60000 * Math.min(retryCount, 10)) + jitter);
                    log(`Conflit de session détecté (440). Temporisation accrue: ${Math.round(delay/1000)}s (jitter: ${Math.round(jitter/1000)}s)`, sessionId, { event: 'connection-conflict', retryCount, delay }, 'WARN');
                }

                // Increase max attempts to 100 for absolute permanence
                if (retryCount <= 100) {
                    log(`Reconnexion... (tentative ${retryCount}/100) dans ${delay}ms`, sessionId, {
                        event: 'connection-retry',
                        attempt: retryCount,
                        delay
                    }, 'INFO');

                    if (onUpdate) onUpdate(sessionId, 'CONNECTING', `Reconnecting (attempt ${retryCount}/100)...`, null);

                    const timeout = setTimeout(async () => {
                        reconnectTimeouts.delete(sessionId);
                        // Check if it's still disconnected and no new connection was started
                        if (!activeSockets.has(sessionId) && !deletingSessions.has(sessionId)) {
                            try {
                                log(`Tentative de reconnexion ${retryCount}/100 pour ${sessionId}...`, sessionId, { event: 'reconnect-attempt' }, 'INFO');
                                await connect(sessionId, onUpdate, onMessage);
                            } catch (err) {
                                log(`Échec de la tentative de reconnexion ${retryCount}: ${err.message}`, sessionId, { event: 'reconnect-failed', attempt: retryCount, error: err.message }, 'ERROR');
                            }
                        }
                    }, delay);
                    reconnectTimeouts.set(sessionId, timeout);
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
                    log(`Détection d'écriture de ${jid}, mise en pause temporaire de l'IA pour cette conversation`, sessionId, { event: 'ai-auto-pause-typing', jid }, 'INFO');
                    
                    aiService.pauseForConversation(sessionId, jid);
                    
                    // Broadcast to frontend (optional: update to show "paused" status instead of "disabled")
                    const { broadcastToClients } = require('../../index');
                    if (broadcastToClients) {
                        broadcastToClients({
                            type: 'session-update',
                            data: [{ sessionId, ai_paused_jid: jid, detail: 'IA en pause (détection d\'écriture)' }]
                        });
                    }
                }
            }
        }
    });

    // Handle read receipts
    sock.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            const session = require('../models/Session').findById(sessionId);
            if (!session || !session.ai_enabled || !session.ai_deactivate_on_read) continue;

            const jid = update.key.remoteJid;
            
            // Detection logic for "Owner read a message"
            // 1. status 4 (READ) or 5 (PLAYED) for an incoming message
            // 2. presence of 'read: true' in the update
            const isReadByMe = !update.key.fromMe && (
                update.update.status === 4 || 
                update.update.status === 5 || 
                update.update.read === true ||
                update.update.read === 1
            );

            if (isReadByMe) {
                // CRITICAL BUG FIX: Ignore read events triggered by the bot itself
                if (aiService.isReadByBot(sessionId, update.key.id)) {
                    // log(`Read event ignoré car déclenché par le bot lui-même`, sessionId, { event: 'ai-ignore-self-read' }, 'DEBUG');
                    continue;
                }

                log(`L'utilisateur (propriétaire) a lu un message de ${jid}. Mise en pause de l'IA.`, sessionId, { event: 'ai-auto-pause-read', jid, update: update.update }, 'INFO');
                
                aiService.pauseForConversation(sessionId, jid);

                // Dispatch Webhook: human_takeover
                WebhookService.dispatch(sessionId, 'human_takeover', {
                    remoteJid: jid,
                    timestamp: Math.floor(Date.now() / 1000),
                    reason: 'owner_read_message'
                });
               
                // Broadcast to frontend
                const { broadcastToClients } = require('../../index');
                if (broadcastToClients) {
                    broadcastToClients({
                        type: 'session-update',
                        data: [{ sessionId, ai_paused_jid: jid, detail: 'IA en pause (vous avez lu le message)' }]
                    });
                }
            }
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        const remoteJid = msg.key.remoteJid;

        // --- EXCLUSION DES CHAINES (@newsletter) ---
        if (remoteJid && remoteJid.endsWith('@newsletter')) {
            return; // On ignore totalement les messages provenant de chaînes
        }

        // --- FILTRE GROUPE ADMIN (SÉCURITÉ STRICTE) ---
        if (remoteJid && remoteJid.endsWith('@g.us')) {
            try {
                const groupMetadata = await moderationService.getGroupMetadata(sock, remoteJid);
                const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const myLid = sock.user.lid || sock.user.LID;
                if (!moderationService.isGroupAdmin(groupMetadata, myJid, myLid, sessionId)) {
                    // Si on n'est pas admin, on ignore totalement le message pour économiser les ressources
                    return;
                }
            } catch (e) {
                return; // En cas d'erreur de métadonnées, on ignore par sécurité
            }
        }
        
        // If message is FROM ME, it means the owner or the bot is chatting.
        if (msg.key.fromMe) {
            // CRITICAL BUG FIX: Ignore messages sent by the bot itself
            if (aiService.isSentByBot(sessionId, msg.key.id)) {
                // log(`Auto-pause ignoré car le message vient du bot lui-même`, sessionId, { event: 'ai-ignore-self-sent' }, 'DEBUG');
                return;
            }

            // Record activity for Human Priority (Session Window)
            aiService.recordOwnerActivity(sessionId, remoteJid);

            const session = require('../models/Session').findById(sessionId);
            if (session && session.ai_enabled) {
                log(`Message envoyé par le propriétaire vers ${remoteJid}. Mise en pause de l'IA.`, sessionId, { event: 'ai-auto-pause-sent', remoteJid }, 'INFO');
                aiService.pauseForConversation(sessionId, remoteJid);

                // Dispatch Webhook: human_takeover
                WebhookService.dispatch(sessionId, 'human_takeover', {
                    remoteJid,
                    timestamp: msg.messageTimestamp,
                    reason: 'owner_sent_message'
                });
            }
            return; // Don't process AI for our own messages
        }

        if (msg.message) {
            const isGroup = remoteJid.endsWith('@g.us');
            
            // Dispatch Webhook: message_received
            WebhookService.dispatch(sessionId, 'message_received', {
                remoteJid,
                pushName: msg.pushName,
                isGroup,
                message: msg.message,
                timestamp: msg.messageTimestamp
            });

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

            // --- MODÉRATION ET SÉCURITÉ (PRIORITÉ MAXIMALE) ---
            let blocked = false;
            try {
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

            // --- GESTION DES MOTS-CLÉS (NON-IA) ---
            try {
                const keywordMatched = await KeywordService.processMessage(sock, sessionId, msg);
                if (keywordMatched) {
                    log(`Réponse par mot-clé envoyée, arrêt du traitement pour ce message.`, sessionId, { event: 'keyword-processed' }, 'DEBUG');
                    return; // Arrêt du flux : pas d'IA si un mot-clé a matché
                }
            } catch (err) {
                log(`Erreur KeywordService: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
            }

            // Call AI Handler (Consolidated Trigger)
            try {
                // Determine if we should force group mode based on moderation settings
                let forceGroupMode = false;
                if (isGroup) {
                    const settings = db.prepare('SELECT ai_assistant_enabled FROM group_settings WHERE group_id = ? AND session_id = ?').get(remoteJid, sessionId);
                    if (settings?.ai_assistant_enabled) {
                        forceGroupMode = true;
                    }
                }

                await aiService.handleIncomingMessage(sock, sessionId, msg, forceGroupMode);
            } catch (err) {
                log(`Erreur du gestionnaire d'IA pour la session ${sessionId}: ${err.message}`, sessionId, { event: 'ai-handler-error', error: err.message }, 'ERROR');
            }
        }
    });

    return sock;
    } finally {
        connectingSessions.delete(sessionId);
    }
}

/**
 * Disconnect a session
 * @param {string} sessionId - Session ID
 * @param {boolean} clearRetry - Whether to clear the retry counter (default: true)
 */
async function disconnect(sessionId, clearRetry = true) {
    // 1. Clear any pending reconnection timer
    const timeout = reconnectTimeouts.get(sessionId);
    if (timeout) {
        clearTimeout(timeout);
        reconnectTimeouts.delete(sessionId);
        log(`Timer de reconnexion annulé pour ${sessionId}`, sessionId, { event: 'reconnect-cancelled' }, 'DEBUG');
    }

    // 2. Disconnect socket
    const sock = activeSockets.get(sessionId);
    if (sock) {
        log(`Déconnexion demandée pour la session ${sessionId}`, sessionId, { event: 'disconnect-request' }, 'DEBUG');
        try {
            // Unregister all events to prevent callbacks during shutdown
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.ev.on('creds.update', () => {}); // Fallback empty handler
            sock.ev.removeAllListeners('messages.upsert');
            sock.ev.removeAllListeners('presence.update');
            sock.ev.removeAllListeners('messages.update');
            sock.ev.removeAllListeners('group-participants.update');
            sock.ev.removeAllListeners('call');
            
            // End the socket properly
            sock.end();
            
            // Wait a small delay to ensure OS resources are released
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            log(`Erreur lors de la déconnexion de ${sessionId}: ${err.message}`, sessionId, { event: 'disconnect-error', error: err.message }, 'WARN');
        }
        activeSockets.delete(sessionId);
    }

    if (clearRetry) {
        retryCounters.delete(sessionId);
    }
}

/**
 * Disconnect all active sessions
 */
async function disconnectAll() {
    log('Déconnexion de toutes les sessions actives...', 'SYSTEM');
    const sessions = Array.from(activeSockets.keys());
    for (const sessionId of sessions) {
        await disconnect(sessionId);
    }
}

/**
 * Get last QR code for a session
 * @param {string} sessionId - Session ID
 * @returns {string|null} QR DataURL or null
 */
function getLastQr(sessionId) {
    return lastQrs.get(sessionId) || null;
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
async function deleteSessionData(sessionId) {
    if (!require('../utils/validation').isValidId(sessionId)) {
        return;
    }

    deletingSessions.add(sessionId);
    log(`Début de la suppression des données pour ${sessionId}`, sessionId, { event: 'delete-session-data-start' }, 'INFO');

    try {
        // Attempt clean logout if connected
        const sock = activeSockets.get(sessionId);
        if (sock && sock.user) {
            try {
                log(`Tentative de déconnexion propre (logout) pour ${sessionId}`, sessionId, { event: 'logout-attempt' }, 'INFO');
                // We wrap logout in a timeout because it can sometimes hang if connection is bad
                await Promise.race([
                    sock.logout(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
                ]);
                log(`Logout réussi pour ${sessionId}`, sessionId, { event: 'logout-success' }, 'INFO');
            } catch (err) {
                log(`Logout échoué ou ignoré pour ${sessionId}: ${err.message}`, sessionId, { event: 'logout-failed' }, 'WARN');
            }
        }

        await disconnect(sessionId, true);

        const sessionDir = path.join(AUTH_DIR, sessionId);
        if (fs.existsSync(sessionDir)) {
            // Robust deletion with retry for locked files
            let retries = 10;
            while (retries > 0) {
                try {
                    // Force recursive removal
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    log(`Données de session supprimées sur le disque: ${sessionId}`, sessionId, { event: 'auth-data-deleted' }, 'INFO');
                    break;
                } catch (err) {
                    retries--;
                    if (err.code === 'EPERM' || err.code === 'EBUSY' || err.code === 'ENOTEMPTY') {
                        log(`Fichiers verrouillés pour ${sessionId}, tentative ${10-retries}/10...`, sessionId, { event: 'auth-delete-retry', error: err.code }, 'WARN');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else if (err.code === 'ENOENT') {
                        break; // Already gone
                    } else {
                        log(`Erreur critique lors de la suppression des données de ${sessionId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
                        break;
                    }
                }
            }
        }
    } catch (err) {
        log(`Erreur globale lors de la suppression de ${sessionId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
    } finally {
        deletingSessions.delete(sessionId);
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
    disconnectAll,
    getSocket,
    getLastQr,
    isConnected,
    deleteSessionData,
    getActiveSessions,
    AUTH_DIR
};
