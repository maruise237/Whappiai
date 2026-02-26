/**
 * WhatsApp API Server - Main Entry Point
 * Version 3.2.0
 * 
 * This is the refactored entry point using the new modular architecture.
 * All business logic has been moved to src/ directory.
 */

// Memory optimization for production environments
if (process.env.NODE_ENV === 'production') {
    if (!process.env.NODE_OPTIONS) {
        process.env.NODE_OPTIONS = '--max-old-space-size=1024';
    }
    if (global.gc) {
        setInterval(() => global.gc(), 60000);
    }
}

require('dotenv').config();

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { createClerkClient, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');

// Import new modules
const { db } = require('./src/config/database');
const { User, Session, ActivityLog, AIModel } = require('./src/models');
const { encrypt, decrypt, isValidKey } = require('./src/utils/crypto');
const response = require('./src/utils/response');
const whatsappService = require('./src/services/whatsapp');
const engagementService = require('./src/services/engagement');
const userRoutes = require('./src/routes/users');
const webhookRoutes = require('./src/routes/webhooks');
const paymentRoutes = require('./src/routes/payments');
const subscriptionRoutes = require('./src/routes/subscriptions');
const creditRoutes = require('./src/routes/credits');
const notificationRoutes = require('./src/routes/notifications');
const { log, setBroadcastFn } = require('./src/utils/logger');
const { errorHandler, notFoundHandler, asyncHandler } = require('./src/middleware/errorHandler');

// API v1
const { initializeApi } = require('./src/routes/api');

// Validate encryption key
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || !isValidKey(ENCRYPTION_KEY)) {
    log('FATAL: TOKEN_ENCRYPTION_KEY doit être au moins de 64 caractères hexadécimaux !', 'SYSTEM', { event: 'fatal-error' }, 'ERROR');
    log('Générez-en une avec: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"', 'SYSTEM', { event: 'fatal-error-hint' }, 'ERROR');
    process.exit(1);
}

// Initialize Express
const app = express();
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        const url = new URL(origin);
        const hostname = url.hostname;

        // Production Frontend URL from environment
        const frontendUrl = process.env.FRONTEND_URL;
        if (frontendUrl && origin === frontendUrl) {
            return callback(null, true);
        }

        // Allow local development origins
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
            return callback(null, true);
        }
        // Allow ngrok origins
        if (hostname.includes('ngrok-free.app') || hostname.includes('ngrok.io')) {
            return callback(null, true);
        }

        // Allow the configured domains
        if (process.env.FRONTEND_DOMAIN && hostname === process.env.FRONTEND_DOMAIN) {
            return callback(null, true);
        }

        // In production or other cases, allow but warn or restrict if needed
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'x-requested-with']
}));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// WebSocket clients map
const wsClients = new Map();

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-me';

// Ensure sessions directory exists for FileStore
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

const sessionStore = new FileStore({
    path: './sessions',
    logFn: (msg) => {
        if (msg && !msg.includes('OK')) {
            log(`[SessionStore] ${msg}`, 'SYSTEM', { event: 'session-store-warning', message: msg }, 'WARN');
        }
    },
    retries: 10, // Increased retries for Windows stability
    factor: 1.5,
    minTimeout: 100,
    maxTimeout: 1000,
    fileExtension: '.json',
    ttl: 86400,
    reapInterval: 3600
});

// Middleware
app.use(cookieParser());
app.use(ClerkExpressWithAuth());

// Debug Clerk Auth
app.use((req, res, next) => {
    if (req.auth && req.auth.userId) {
        log(`Clerk Auth: UserID=${req.auth.userId}, Claims=${JSON.stringify(req.auth.sessionClaims)}`, 'AUTH', null, 'DEBUG');
    }
    next();
});

// JSON Body Parser with exception for Clerk Webhook (needs raw body)
app.use((req, res, next) => {
    if (req.originalUrl === '/webhooks/clerk') {
        next();
    } else {
        express.json({ limit: '1mb' })(req, res, next);
    }
});

app.use(express.urlencoded({ extended: true }));

// Dynamic session cookie security upgrade for HTTPS/ngrok (MUST BE BEFORE SESSION MIDDLEWARE)
app.use((req, res, next) => {
    const isProxySecure = req.headers['x-forwarded-proto'] === 'https' || req.secure;
    if (isProxySecure) {
        // Force secure and none for ngrok
        req.app.set('trust proxy', 1);
    }
    next();
});

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { status: 'error', message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false }
}));

app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'whatsapp_api_session',
    proxy: true,
    cookie: {
        httpOnly: true,
        secure: 'auto', // Will be true if connection is secure
        sameSite: 'lax', // Default, we will override for ngrok
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Dynamic session cookie adjustment for ngrok and IP access
app.use((req, res, next) => {
    const isProxySecure = req.headers['x-forwarded-proto'] === 'https' || req.secure;
    const hostname = req.hostname;

    if (req.session && req.session.cookie) {
        if (isProxySecure) {
            // HTTPS (Ngrok) - Needs SameSite: None and Secure: True
            req.session.cookie.secure = true;
            req.session.cookie.sameSite = 'none';
        } else if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            // Local IP access (Phone) - Must be Secure: False and SameSite: Lax (or Default)
            // because most mobile browsers block cookies on non-localhost HTTP if Secure: True
            req.session.cookie.secure = false;
            req.session.cookie.sameSite = 'lax';
        }
    }
    next();
});

// WebSocket heartbeat
const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// WebSocket handler
wss.on('connection', async (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    const url = new URL(req.url, `http://${req.headers.host}`);
    const wsToken = url.searchParams.get('token');

    let userInfo = null;
    if (wsToken) {
        try {
            // Check if it's a JWT (3 parts) or a session ID
            let userId = null;
            if (wsToken.split('.').length === 3) {
                // It's a JWT
                const decoded = await clerkClient.verifyToken(wsToken);
                userId = decoded.sub;
            } else {
                // It's a session ID
                const session = await clerkClient.sessions.verifySession(wsToken);
                if (!session) {
                    log('WebSocket session invalide', 'SYSTEM', null, 'WARN');
                    ws.close(4001, 'Invalid session');
                    return;
                }
                userId = session.userId;
            }

            if (!userId) {
                log('WebSocket authentication failed: No user ID', 'SYSTEM', null, 'WARN');
                ws.close(4001, 'Authentication failed');
                return;
            }

            // Get user details
            const clerkUser = await clerkClient.users.getUser(userId);
            const email = clerkUser.emailAddresses[0]?.emailAddress;

            // Auto-promote maruise237@gmail.com to admin
            let targetRole = clerkUser.publicMetadata?.role || 'user';
            if (email && email.toLowerCase() === 'maruise237@gmail.com') {
                targetRole = 'admin';
            }

            // Get local user info for role
            const localUser = User.findById(clerkUser.id) || User.findByEmail(email);

            userInfo = {
                id: clerkUser.id,
                email: email,
                role: localUser?.role || targetRole
            };

            log(`Client WebSocket connecté (Clerk): ${email}`, 'SYSTEM', { email, role: userInfo.role }, 'INFO');
        } catch (err) {
            log(`Échec de validation Clerk pour WebSocket: ${err.message}`, 'SYSTEM', null, 'ERROR');

            // Check if it's a token expiration error
            if (err.message.includes('expired') || err.message.includes('Gone')) {
                ws.close(4001, 'Token expired');
            } else {
                ws.close(4000, 'Invalid token');
            }
            return;
        }
    } else if (process.env.NODE_ENV === 'production') {
        log('Connexion WebSocket refusée: Token manquant', 'SYSTEM', null, 'WARN');
        ws.close(4000, 'Authentication required');
        return;
    }

    wsClients.set(ws, userInfo);

    ws.on('close', () => {
        wsClients.delete(ws);
    });
});

wss.on('close', () => {
    clearInterval(heartbeat);
});

// Broadcast to WebSocket clients with role-based filtering and session isolation
function broadcastToClients(data) {
    for (const [client, userInfo] of wsClients) {
        if (client.readyState === 1) {
            // 1. Technical logs: only for admins
            if (data.type === 'log') {
                if (userInfo && userInfo.role === 'admin') {
                    client.send(JSON.stringify(data));
                }
                continue;
            }

            // 2. Session isolation for updates
            if (data.type === 'session-update') {
                const updates = Array.isArray(data.data) ? data.data : [data.data];

                // Admin sees all updates
                if (userInfo && userInfo.role === 'admin') {
                    client.send(JSON.stringify({ ...data, data: updates }));
                    continue;
                }

                // Regular users only see updates for sessions they own
                const filteredUpdates = updates.filter(update => {
                    const sessionId = update.sessionId;
                    if (!sessionId) return false;
                    const owner = userManager.getSessionOwner(sessionId);
                    return owner && owner.email === userInfo?.email;
                });

                if (filteredUpdates.length > 0) {
                    client.send(JSON.stringify({ ...data, data: filteredUpdates }));
                }
                continue;
            }

            // 3. Session isolation for deletions
            if (data.type === 'session-deleted') {
                if (userInfo && userInfo.role === 'admin') {
                    client.send(JSON.stringify(data));
                    continue;
                }

                const sessionId = data.data?.sessionId;
                if (sessionId) {
                    const owner = userManager.getSessionOwner(sessionId);
                    if (owner && owner.email === userInfo?.email) {
                        client.send(JSON.stringify(data));
                    }
                }
                continue;
            }

            // 4. Fallback: Broadcast other messages normally
            client.send(JSON.stringify(data));
        }
    }
}

// Initialize Logger
setBroadcastFn(broadcastToClients);

// User manager utility
const userManager = {
    getSessionOwner: (sessionId) => {
        const s = Session.findById(sessionId);
        return s ? { email: s.owner_email } : null;
    }
};

// Initialize wrappers for API
const sessionTokens = new Map();

// Helper to broadcast session updates
const broadcastSessionUpdate = (id, status, detail, qrOrCode) => {
    const isPairingCode = status === 'GENERATING_CODE';
    Session.updateStatus(id, status, detail, isPairingCode ? qrOrCode : null);

    broadcastToClients({
        type: 'session-update',
        data: [{
            sessionId: id,
            status,
            detail,
            qr: status === 'GENERATING_QR' ? qrOrCode : null,
            pairingCode: isPairingCode ? qrOrCode : null,
            token: Session.findById(id)?.token
        }]
    });
};

const createSessionWrapper = async (sessionId, email, phoneNumber = null) => {
    const session = Session.create(sessionId, email);
    await whatsappService.connect(sessionId, broadcastSessionUpdate, null, phoneNumber);

    if (session.token) {
        sessionTokens.set(sessionId, session.token);
    }
    return session;
};

const deleteSessionWrapper = async (sessionId) => {
    log(`Demande de suppression complète pour la session: ${sessionId}`, 'SYSTEM', { sessionId }, 'INFO');

    // 1. Clear tokens and prevent new connections
    sessionTokens.delete(sessionId);

    // 2. Delete metadata from Database first to prevent UI from showing it
    Session.delete(sessionId);

    // 3. Force disconnect and delete physical files from disk (Important to prevent syncWithFilesystem from restoring it)
    // deleteSessionData now calls disconnect(sessionId, true) internally and uses deletingSessions lock
    await whatsappService.deleteSessionData(sessionId);

    // 4. Broadcast deletion to all clients
    broadcastToClients({
        type: 'session-deleted',
        data: { sessionId }
    });
};

const getSessionsDetailsWrapper = (email, isAdmin) => {
    const sessions = Session.getAll(email, isAdmin);
    const activeSockets = whatsappService.getActiveSessions();

    return sessions.map(s => {
        const hasSocket = activeSockets.has(s.id);
        const sock = hasSocket ? activeSockets.get(s.id) : null;
        const isConnected = hasSocket && sock?.user != null;

        // If DB says CONNECTED but socket is missing or not authenticated, it's actually not connected
        let currentStatus = s.status;
        if (currentStatus === 'CONNECTED' && !isConnected) {
            currentStatus = 'DISCONNECTED';
            // We don't update DB here to avoid race conditions during server restart
            // The background connect() process will update it back to CONNECTED when ready
        }

        return {
            ...s,
            status: currentStatus,
            sessionId: s.id,
            isConnected: isConnected,
            pairingCode: s.pairing_code,
            qr: whatsappService.getLastQr(s.id)
        };
    });
};

const triggerQRWrapper = async (sessionId) => {
    const session = Session.findById(sessionId);
    if (!session) {
        log(`TriggerQR: Session ${sessionId} non trouvée dans la DB`, 'SYSTEM', { sessionId }, 'WARN');
        return false;
    }

    // Check if session is already connected
    const activeSockets = whatsappService.getActiveSessions();
    const hasSocket = activeSockets.has(sessionId);
    const sock = hasSocket ? activeSockets.get(sessionId) : null;
    const isConnected = hasSocket && sock?.user != null;

    if (isConnected) {
        log(`La session ${sessionId} est déjà connectée, reconnexion ignorée`, 'SYSTEM', { sessionId }, 'INFO');
        broadcastSessionUpdate(sessionId, 'CONNECTED', 'Déjà connecté');
        return true;
    }

    log(`Déclenchement manuel de la connexion pour le QR: ${sessionId}`, 'SYSTEM', { sessionId }, 'INFO');
    // We don't await connect() here because it's a long process (QR generation)
    // But we use a wrapper to handle errors
    whatsappService.connect(sessionId, broadcastSessionUpdate, null)
        .catch(err => log(`Erreur connect via triggerQR: ${err.message}`, 'SYSTEM', { sessionId, error: err.message }, 'ERROR'));

    return true;
};

// Session Proxy to adapt whatsappService sockets (Map<string, Socket>) to api.js expectation ({ sock, status })
const sessionsProxy = {
    get: (sessionId) => {
        const sock = whatsappService.getSocket(sessionId);
        const session = Session.findById(sessionId);

        if (sock) {
            return {
                sock: sock,
                status: 'CONNECTED',
                token: session?.token
            };
        }

        // If no socket but session exists in DB, return its status
        if (session) {
            return {
                sock: null,
                status: session.status,
                token: session.token,
                detail: session.detail
            };
        }

        return null;
    },
    has: (sessionId) => {
        return whatsappService.getActiveSessions().has(sessionId) || Session.findById(sessionId) !== null;
    },
    keys: () => {
        const activeKeys = Array.from(whatsappService.getActiveSessions().keys());
        const dbSessions = Session.getAll().map(s => s.id);
        return Array.from(new Set([...activeKeys, ...dbSessions]));
    },
    forEach: (callback) => {
        const dbSessions = Session.getAll();
        dbSessions.forEach(s => {
            const sock = whatsappService.getSocket(s.id);
            callback({
                sock: sock,
                status: sock ? 'CONNECTED' : s.status,
                owner: s.owner_email || 'unknown',
                detail: s.detail || (sock ? 'Connected' : 'Disconnected'),
                token: s.token
            }, s.id);
        });
    }
};

const apiRouter = initializeApi(
    sessionsProxy,
    sessionTokens,
    createSessionWrapper,
    getSessionsDetailsWrapper,
    deleteSessionWrapper,
    log,
    userManager,
    ActivityLog,
    triggerQRWrapper
);

// Mount routes
app.use('/webhooks', webhookRoutes);
app.use('/admin/users', userRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/credits', creditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1', apiRouter);

// Serve modern UI
const frontendPath = path.join(__dirname, 'frontend', 'out');

if (fs.existsSync(frontendPath)) {
    // 1. Serve _next/static explicitly with long-term caching
    // Fix: Map /_next/static to frontend/out/_next/static
    app.use('/_next/static', express.static(path.join(frontendPath, '_next', 'static'), {
        maxAge: '1y',
        immutable: true,
        fallthrough: false // Fail if not found to avoid falling back to index.html for assets
    }));

    // 2. Serve other static files
    app.use(express.static(frontendPath, {
        extensions: ['html'],
        index: 'index.html'
    }));

    // 3. Fallback to index.html for SPA routing
    app.get('*', (req, res, next) => {
        // Skip for API routes
        if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
            return next();
        }
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.status(200).json({
            status: 'online',
            message: 'Whappi API Server is running.',
            frontend: 'Not found in /frontend/out. Please build it with "npm run build".'
        });
    });
}

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Ensure default admin exists
User.ensureAdmin(process.env.ADMIN_DASHBOARD_PASSWORD);

// Ensure default AI model exists
AIModel.ensureDefaultDeepSeek();

// Initialize existing sessions on startup
if (require.main === module) {
    (async () => {
        // Sync sessions from disk to DB
        Session.syncWithFilesystem();

        // IMPORTANT: use admin mode to retrieve all sessions for automatic reinitialization
        const existingSessions = Session.getAll(null, true);
        log(`Trouvé ${existingSessions.length} session(s) existante(s)`, 'SYSTEM', { count: existingSessions.length }, 'INFO');

        for (const session of existingSessions) {
            // Populate sessionTokens
            if (session.token) {
                sessionTokens.set(session.id, session.token);
            }

            // Re-initialize any session that was previously connected
            // IMPORTANT: Reconnect ONLY sessions that have a valid creds folder to avoid infinite QR loop at start
            const sessionDir = path.join(process.cwd(), 'auth_info_baileys', session.id);
            const credsFile = path.join(sessionDir, 'creds.json');
            
            if (fs.existsSync(credsFile)) {
                log(`Session ${session.id} trouvée avec des identifiants valides. Réinitialisation automatique...`, 'SYSTEM', { sessionId: session.id, status: session.status }, 'INFO');

                // Increase delay to 3s between session initializations to prevent Dokploy CPU spikes and mass disconnects during updates
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Fire and forget: don't wait for the connection to be established to start others
                whatsappService.connect(session.id, broadcastSessionUpdate, null)
                    .catch(err => {
                        log(`Échec de l'initialisation auto de ${session.id}: ${err.message}`, 'SYSTEM', { sessionId: session.id, error: err.message }, 'ERROR');
                    });
            } else {
                log(`Session ${session.id} ignorée au démarrage (pas d'identifiants sur le disque)`, 'SYSTEM', { sessionId: session.id, status: session.status }, 'DEBUG');
                // If it was supposed to be CONNECTED but no files exist, reset status
                if (session.status === 'CONNECTED') {
                    Session.updateStatus(session.id, 'DISCONNECTED', 'No credentials found on disk');
                }
            }
        }

        // Start engagement service
        engagementService.start();

        // Start SaaS Scheduler
        const scheduler = require('./src/cron/scheduler');
        scheduler.start();
    })();
}

// Start server
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    server.listen(PORT, () => {
        log(`Serveur en cours d'exécution sur le port ${PORT}`, 'SYSTEM', { port: PORT }, 'INFO');
        log(`Tableau de bord: http://localhost:${PORT}`, 'SYSTEM', { url: `http://localhost:${PORT}` }, 'INFO');
    });
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    log(`Signal ${signal} reçu. Arrêt en cours...`, 'SYSTEM', { signal }, 'INFO');

    try {
        // Disconnect all WhatsApp sessions cleanly
        await whatsappService.disconnectAll();
    } catch (err) {
        log(`Erreur lors de la déconnexion des sessions: ${err.message}`, 'SYSTEM', null, 'WARN');
    }

    server.close(() => {
        log('Serveur arrêté proprement', 'SYSTEM', null, 'INFO');
        process.exit(0);
    });

    // Safety exit after 10s if server.close hangs
    setTimeout(() => {
        log('Arrêt forcé après timeout', 'SYSTEM', null, 'WARN');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = { app, server, wss };
