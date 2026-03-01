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
const NotificationService = require('./NotificationService');
const User = require('../models/User');
const Session = require('../models/Session');

// Active socket connections
const activeSockets = new Map();
const retryCounters = new Map();
const reconnectTimeouts = new Map();
const lastQrs = new Map();
const connectingSessions = new Set();
const deletingSessions = new Set();

const AUTH_DIR = path.join(__dirname, '../../auth_info_baileys');

function ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function connect(sessionId, onUpdate, onMessage, phoneNumber = null) {
    if (!require('../utils/validation').isValidId(sessionId)) throw new Error('Invalid session ID');
    if (deletingSessions.has(sessionId)) return null;

    if (connectingSessions.has(sessionId)) {
        const existingSock = activeSockets.get(sessionId);
        if (existingSock && phoneNumber && !existingSock.registered) {
            log(`Demande de code reçue alors que la session ${sessionId} est déjà en cours de connexion`, sessionId, { event: 'pairing-on-existing' }, 'INFO');
            // Instead of returning, we could potentially force a disconnect and reconnect if we really need to change the phoneNumber
            // but for now let's just log it. The problem is often that the first call didn't have a phoneNumber.
            await disconnect(sessionId, false);
            // After disconnect, we continue to create a new one with the phoneNumber
        } else {
            log(`Connexion déjà active pour ${sessionId}`, sessionId, { event: 'connect-locked' }, 'DEBUG');
            return existingSock;
        }
    }
    connectingSessions.add(sessionId);

    try {
        await disconnect(sessionId, false);
        ensureAuthDir();

        const sessionDir = path.join(AUTH_DIR, sessionId);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

        if (onUpdate) onUpdate(sessionId, 'CONNECTING', 'Initialisation...', null);

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        let version;
        try {
            const waVersion = await fetchLatestWaWebVersion({});
            version = waVersion.version;
        } catch (e) {
            const baileysVersion = await fetchLatestBaileysVersion();
            version = baileysVersion.version;
        }

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'), // Ubuntu Chrome is highly stable for pairing
            syncFullHistory: false,
            qrTimeout: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            shouldIgnoreJid: (jid) => isJidBroadcast(jid),
            markOnlineOnConnect: true,
            getMessage: async (key) => ({ conversation: 'hello' }),
            retryRequestDelayMs: 2000,
            maxMsgRetryCount: 5,
        });

        activeSockets.set(sessionId, sock);

        // Pairing Code Request
        if (phoneNumber && !state.creds.registered) {
            const sanitizedPhoneNumber = phoneNumber.replace(/\D/g, '');
            log(`Préparation de la demande de code pour ${sanitizedPhoneNumber} (Socket exists: ${!!sock})`, sessionId, { event: 'pairing-prep' }, 'INFO');

            // Set intermediate state without clearing existing code/qr
            if (onUpdate) onUpdate(sessionId, 'GENERATING_CODE', 'Demande en cours...', undefined);

            const requestPairing = async (retry = 0) => {
                try {
                    const currentSock = activeSockets.get(sessionId);
                    if (currentSock === sock && sock.ws && (sock.ws.readyState === 1 || sock.ws.readyState === 'OPEN')) {
                        const code = await sock.requestPairingCode(sanitizedPhoneNumber);
                        log(`Code d'appairage reçu: ${code}`, sessionId, { event: 'pairing-success' }, 'INFO');

                        // Persist pairing code immediately in DB
                        Session.updateStatus(sessionId, 'GENERATING_CODE', 'Code prêt', code);
                        if (onUpdate) onUpdate(sessionId, 'GENERATING_CODE', 'Code prêt', code);

                        // Send notification
                        const session = Session.findById(sessionId);
                        if (session?.owner_email) {
                            const user = User.findByEmail(session.owner_email);
                            if (user) {
                                NotificationService.send(user.id, 'session', {
                                    title: "Code d'appairage prêt",
                                    message: `Le code d'appairage pour ${sessionId} est : ${code}`,
                                    sessionId: sessionId
                                });
                            }
                        }
                    } else if (retry < 15) {
                        const delay = 5000;
                        log(`Socket non prêt pour ${sessionId}, tentative ${retry + 1}/15 dans ${delay/1000}s... (WS state: ${sock.ws?.readyState})`, sessionId, { event: 'pairing-retry', wsState: sock.ws?.readyState }, 'DEBUG');
                        setTimeout(() => requestPairing(retry + 1), delay);
                    } else {
                        log(`Socket non prêt après 15 tentatives, abandon de la demande de code`, sessionId, { event: 'pairing-aborted' }, 'WARN');
                        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', 'Le serveur WhatsApp prend trop de temps à répondre (socket non prêt)', null);
                    }
                } catch (err) {
                    log(`Erreur lors de la demande de code (tentative ${retry}): ${err.message}`, sessionId, { error: err.message }, 'ERROR');
                    if (retry < 3) {
                        setTimeout(() => requestPairing(retry + 1), 5000);
                    } else {
                        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', `Échec code: ${err.message}`, null);
                    }
                }
            };

            setTimeout(() => requestPairing(), 10000);
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // CRITICAL: Ensure only the active socket can trigger updates
            if (activeSockets.get(sessionId) !== sock && connection !== 'connecting') return;

            if (qr) {
                try {
                    const qrBase64 = await QRCode.toDataURL(qr);
                    lastQrs.set(sessionId, qrBase64);
                    if (onUpdate) onUpdate(sessionId, 'GENERATING_QR', 'Scan QR code', qrBase64);
                } catch (e) {
                    lastQrs.set(sessionId, qr);
                    if (onUpdate) onUpdate(sessionId, 'GENERATING_QR', 'Scan QR code', qr);
                }
            }

            if (connection === 'connecting') {
                if (onUpdate) onUpdate(sessionId, 'CONNECTING', 'Connexion en cours...', null);
            }

            if (connection === 'open') {
                log(`WhatsApp connecté: ${sock.user?.name}`, sessionId, { event: 'open' }, 'INFO');
                retryCounters.delete(sessionId);
                lastQrs.delete(sessionId);
                if (onUpdate) onUpdate(sessionId, 'CONNECTED', `Connecté: ${sock.user?.name || 'Session'}`, null);

                // Send connected notification
                const session = Session.findById(sessionId);
                if (session?.owner_email) {
                    const user = User.findByEmail(session.owner_email);
                    if (user) {
                        NotificationService.send(user.id, 'session', {
                            title: 'Session Connectée',
                            message: `Votre session WhatsApp "${sessionId}" (${sock.user?.id.split(':')[0]}) est maintenant opérationnelle.`,
                            sessionId: sessionId
                        });
                    }
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.output?.payload?.message || 'Connection closed';

                log(`WhatsApp déconnecté: ${reason} (${statusCode})`, sessionId, { event: 'close', statusCode }, 'WARN');
                
                // Only clean up activeSockets if this is still the active socket
                if (activeSockets.get(sessionId) === sock) {
                    activeSockets.delete(sessionId);
                    lastQrs.delete(sessionId);
                    if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', reason, null);
                }

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401 && statusCode !== 403;
                if (shouldReconnect && activeSockets.get(sessionId) !== sock) {
                    const retryCount = (retryCounters.get(sessionId) || 0) + 1;
                    retryCounters.set(sessionId, retryCount);

                    let delay = Math.max(5000, Math.min(2000 * Math.pow(2, retryCount - 1), 60000));
                    if (statusCode === 440) {
                        const jitter = Math.floor(Math.random() * 15000);
                        delay = Math.max(delay, (30000 * Math.min(retryCount, 5)) + jitter);
                    }

                    if (retryCount <= 50) {
                        const timeout = setTimeout(async () => {
                            reconnectTimeouts.delete(sessionId);
                            if (!activeSockets.has(sessionId) && !deletingSessions.has(sessionId)) {
                                await connect(sessionId, onUpdate, onMessage);
                            }
                        }, delay);
                        reconnectTimeouts.set(sessionId, timeout);
                    }
                } else if (statusCode === DisconnectReason.loggedOut) {
                    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
                }
            }
        });

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            const remoteJid = msg.key.remoteJid;
            if (!remoteJid || remoteJid.endsWith('@newsletter')) return;

            if (msg.key.fromMe) {
                if (aiService.isSentByBot(sessionId, msg.key.id)) return;
                aiService.recordOwnerActivity(sessionId, remoteJid);
                const session = db.prepare('SELECT ai_enabled FROM whatsapp_sessions WHERE id = ?').get(sessionId);
                if (session?.ai_enabled) aiService.pauseForConversation(sessionId, remoteJid);
                return;
            }

            if (msg.message) {
                if (onMessage) onMessage(sessionId, msg);
                let blocked = await moderationService.handleIncomingMessage(sock, sessionId, msg);
                if (blocked) return;
                const keywordMatched = await KeywordService.processMessage(sock, sessionId, msg);
                if (keywordMatched) return;

                let forceGroupMode = false;
                if (remoteJid.endsWith('@g.us')) {
                    const settings = db.prepare('SELECT ai_assistant_enabled FROM group_settings WHERE group_id = ? AND session_id = ?').get(remoteJid, sessionId);
                    if (settings?.ai_assistant_enabled) forceGroupMode = true;
                }
                await aiService.handleIncomingMessage(sock, sessionId, msg, forceGroupMode);
            }
        });

        return sock;
    } finally {
        connectingSessions.delete(sessionId);
    }
}

async function disconnect(sessionId, clearRetry = true) {
    const timeout = reconnectTimeouts.get(sessionId);
    if (timeout) { clearTimeout(timeout); reconnectTimeouts.delete(sessionId); }
    const sock = activeSockets.get(sessionId);
    if (sock) {
        try {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            sock.ev.removeAllListeners('messages.upsert');
            sock.end();
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {}
        activeSockets.delete(sessionId);
    }
    if (clearRetry) retryCounters.delete(sessionId);
}

async function disconnectAll() {
    for (const sessionId of activeSockets.keys()) await disconnect(sessionId);
}

function getLastQr(sessionId) { return lastQrs.get(sessionId) || null; }
function getSocket(sessionId) { return activeSockets.get(sessionId) || null; }
function isConnected(sessionId) { return activeSockets.get(sessionId)?.user != null; }

async function deleteSessionData(sessionId) {
    if (!require('../utils/validation').isValidId(sessionId)) return;
    deletingSessions.add(sessionId);
    try {
        const sock = activeSockets.get(sessionId);
        if (sock?.user) try { await sock.logout(); } catch (e) {}
        await disconnect(sessionId, true);
        const sessionDir = path.join(AUTH_DIR, sessionId);
        if (fs.existsSync(sessionDir)) {
            let retries = 5;
            while (retries > 0) {
                try { fs.rmSync(sessionDir, { recursive: true, force: true }); break; }
                catch (e) { retries--; if (retries > 0) await new Promise(r => setTimeout(r, 1000)); }
            }
        }
    } finally {
        deletingSessions.delete(sessionId);
    }
}

function getActiveSessions() { return activeSockets; }

module.exports = {
    connect, disconnect, disconnectAll, getSocket, getLastQr,
    isConnected, deleteSessionData, getActiveSessions, AUTH_DIR
};
