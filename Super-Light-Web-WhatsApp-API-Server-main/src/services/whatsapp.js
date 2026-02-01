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
 * @returns {object} Socket connection
 */
async function connect(sessionId, onUpdate, onMessage) {
    if (!require('../utils/validation').isValidId(sessionId)) {
        throw new Error('Invalid session ID');
    }

    ensureAuthDir();

    const sessionDir = path.join(AUTH_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Update session status
    if (onUpdate) onUpdate(sessionId, 'CONNECTING', 'Initializing...', null);

    let state, originalSaveCreds;
    try {
        console.log(`[${sessionId}] Loading auth state from: ${sessionDir}`);
        const authState = await useMultiFileAuthState(sessionDir);
        state = authState.state;
        originalSaveCreds = authState.saveCreds;
    } catch (err) {
        console.error(`[${sessionId}] Failed to load auth state:`, err);
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
                    console.warn(`[${sessionId}] EPERM error saving credentials, retrying... (${retries} left)`);
                    await new Promise(resolve => setTimeout(resolve, 200));
                } else {
                    console.error(`[${sessionId}] Failed to save credentials:`, err);
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
        console.log(`[${sessionId}] Using WA Web version: ${version.join('.')}`);
    } catch (e) {
        const baileysVersion = await fetchLatestBaileysVersion();
        version = baileysVersion.version;
        console.log(`[${sessionId}] Using Baileys version: ${version.join('.')} (fallback)`);
    }

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        logger,
        browser: ['Super Light WhatsApp', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        qrTimeout: 60000, // Increase timeout to 60s
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: false,
        logger,
        generateHighQualityLinkPreview: false,
        shouldIgnoreJid: (jid) => isJidBroadcast(jid),
        markOnlineOnConnect: true,
        defaultQueryTimeoutMs: undefined,
        getMessage: async () => ({ conversation: 'hello' })
    });

    // Store socket reference
    activeSockets.set(sessionId, sock);

    // Handle credentials update
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${sessionId}] New QR Code generated: ${qr.substring(0, 30)}...`);
            try {
                const qrBase64 = await QRCode.toDataURL(qr);
                if (onUpdate) onUpdate(sessionId, 'GENERATING_QR', 'Scan QR code', qrBase64);
            } catch (err) {
                console.error(`[${sessionId}] Failed to generate QR DataURL:`, err);
                if (onUpdate) onUpdate(sessionId, 'GENERATING_QR', 'Scan QR code', qr);
            }
        }

        if (connection === 'connecting') {
            if (onUpdate) onUpdate(sessionId, 'CONNECTING', 'Connecting...', null);
        }

        if (connection === 'open') {
            console.log(`[${sessionId}] Connected!`);
            retryCounters.delete(sessionId);

            const name = sock.user?.name || 'Unknown';
            if (onUpdate) onUpdate(sessionId, 'CONNECTED', `Connected as ${name}`, null);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.output?.payload?.message || 'Connection closed';

            console.log(`[${sessionId}] Disconnected: ${statusCode} - ${reason}`);
            if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', reason, null);

            // Handle reconnection logic
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401 && statusCode !== 403;

            if (shouldReconnect) {
                const retryCount = (retryCounters.get(sessionId) || 0) + 1;
                retryCounters.set(sessionId, retryCount);

                if (retryCount <= 5) {
                    console.log(`[${sessionId}] Reconnecting... (attempt ${retryCount})`);
                    setTimeout(() => connect(sessionId, onUpdate, onMessage), 5000);
                } else {
                    console.log(`[${sessionId}] Max retries reached`);
                    retryCounters.delete(sessionId);
                }
            } else {
                // Clear session data on logout
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    console.log(`[${sessionId}] Logged out, cleaning session data`);
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                }
            }

            activeSockets.delete(sessionId);
        }
    });

    // Handle incoming messages
    if (onMessage) {
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.key.fromMe && msg.message) {
                onMessage(sessionId, msg);
            }
        });
    }

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
