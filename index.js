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
const compression = require('compression');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { createClerkClient, ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');

// Import new modules
const pg = require('./src/config/postgres');
const { User, Session, ActivityLog, AIModel } = require('./src/models');
const { encrypt, decrypt, isValidKey } = require('./src/utils/crypto');
const response = require('./src/utils/response');
const SessionService = require('./src/services/SessionService');
const engagementService = require('./src/services/engagement');
const userRoutes = require('./src/routes/users');
const adminRoutes = require('./src/routes/admin');
const webhookRoutes = require('./src/routes/webhooks');
const paymentRoutes = require('./src/routes/payments');
const subscriptionRoutes = require('./src/routes/subscriptions');
const creditRoutes = require('./src/routes/credits');
const notificationRoutes = require('./src/routes/notifications');
const calRoutes = require('./src/routes/cal');
const publicRoutes = require('./src/routes/public');
const evolutionWebhookRouter = require('./src/services/EvolutionWebhookHandler');
const { log, setBroadcastFn } = require('./src/utils/logger');
const { errorHandler, notFoundHandler, asyncHandler } = require('./src/middleware/errorHandler');
const redisService = require('./src/services/redis');
const whappiSessionStore = require('./src/services/SessionStore');
const queueService = require('./src/services/QueueService');

// API v1
const { initializeApi } = require('./src/routes/api');

// Helper to sanitize environment variables (removes quotes and whitespace)
const _clean = (val) => typeof val === 'string' ? val.trim().replace(/^["']|["']$/g, '') : val;

// Validate encryption key
const ENCRYPTION_KEY = _clean(process.env.TOKEN_ENCRYPTION_KEY);
if (!ENCRYPTION_KEY || !isValidKey(ENCRYPTION_KEY)) {
    log('FATAL: TOKEN_ENCRYPTION_KEY doit être au moins de 64 caractères hexadécimaux !', 'SYSTEM', { event: 'fatal-error' }, 'ERROR');
    log('Générez-en une avec: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"', 'SYSTEM', { event: 'fatal-error-hint' }, 'ERROR');
    process.exit(1);
}

// Validate required environment variables
const REQUIRED_ENV_VARS = ['CLERK_SECRET_KEY', 'SESSION_SECRET'];
const missingVars = REQUIRED_ENV_VARS.filter(key => !_clean(process.env[key]));
if (missingVars.length > 0) {
    log(`FATAL: Variables d'environnement manquantes: ${missingVars.join(', ')}`, 'SYSTEM', { event: 'fatal-error' }, 'ERROR');
    process.exit(1);
}

// Initialize Express
const app = express();

// Apply compression middleware to optimize LCP by reducing payload size (Gzip/Brotli)
app.use(compression());

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

        if (process.env.NODE_ENV === 'production') {
            log(`CORS blocked unknown origin: ${origin}`, 'SECURITY', null, 'WARN');
            return callback(new Error('CORS policy: origin not allowed'));
        }
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
const sessionSecret = _clean(process.env.SESSION_SECRET) || 'dev-secret-change-me';

// Use FileStore as default; Redis will be swapped in after async connect
const FileStore = require('session-file-store')(session);

// Ensure sessions directory exists for FileStore fallback
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

const fallbackSessionStore = new FileStore({
    path: './sessions',
    logFn: (msg) => {
        if (msg && !msg.includes('OK')) {
            log(`[SessionStore] ${msg}`, 'SYSTEM', { event: 'session-store-warning', message: msg }, 'WARN');
        }
    },
    retries: 10,
    factor: 1.5,
    minTimeout: 100,
    maxTimeout: 1000,
    fileExtension: '.json',
    ttl: 86400,
    reapInterval: 3600
});

// Will be upgraded to RedisStore after async connect succeeds
let activeSessionStore = fallbackSessionStore;

// Middleware
app.use(cookieParser());
app.use(ClerkExpressWithAuth());

// Debug Clerk Auth without exposing session claims.
app.use((req, res, next) => {
    if (req.auth && req.auth.userId && process.env.LOG_AUTH_DEBUG === '1') {
        log('Clerk Auth verified', 'AUTH', {
            userId: req.auth.userId,
            path: req.originalUrl,
            sessionId: req.auth.sessionId || req.auth.sid || null
        }, 'DEBUG');
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

// Security Headers with Helmet
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true
}));

// Rate Limiting with tiered approach
const RateLimitStore = require('./src/services/rateLimitStore');

// Redis-backed rate limit stores (initialized lazily)
let rlStoresInitialized = false;
let generalStore = null;
let authStore = null;
let webhookStore = null;
let apiStore = null;

async function initRateLimitStores() {
  if (rlStoresInitialized) return;
  rlStoresInitialized = true;

  generalStore = new RateLimitStore({ prefix: 'rl:general:', windowMs: 60000 });
  authStore = new RateLimitStore({ prefix: 'rl:auth:', windowMs: 900000 });
  webhookStore = new RateLimitStore({ prefix: 'rl:webhook:', windowMs: 1000 });  // 1s window
  apiStore = new RateLimitStore({ prefix: 'rl:api:', windowMs: 60000 });

  await Promise.all([
    generalStore.init(),
    authStore.init(),
    webhookStore.init(),
    apiStore.init(),
  ]);
}

// General limiter (all routes) — 60 req/min
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { status: 'error', message: 'Too many requests' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    store: generalStore
});

// Stricter limiter for authentication endpoints — 10 req/15min
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { status: 'error', message: 'Too many authentication attempts' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    store: authStore
});

// Evolution webhook limiter — 30 req/s per session
const evolutionWebhookLimiter = rateLimit({
    windowMs: 1000,
    max: 30,
    message: { status: 'error', message: 'Too many webhook requests' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    store: webhookStore,
    keyGenerator: (req) => req.headers['x-evolution-instance'] || req.ip
});

// API limiter (per user) — 200 req/min per user
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { status: 'error', message: 'API rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    store: apiStore,
    keyGenerator: (req) => req.currentUser?.email || req.ip
});

app.use(generalLimiter);

app.use(session({
    store: activeSessionStore,
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
// Exposed globally so EvolutionWebhookHandler can call it without circular require
const broadcastSessionUpdate = (id, status, detail, qrOrCode) => {
    const isPairingCode = status === 'GENERATING_CODE';
    const isQR = status === 'GENERATING_QR';

    // CRITICAL: We pass undefined instead of null to prevent clearing existing code/qr when status updates
    // EXCEPT when status is DISCONNECTED, in which case we clear them.
    Session.updateStatus(
        id,
        status,
        detail,
        isPairingCode ? qrOrCode : undefined,
        isQR ? qrOrCode : undefined
    );

    const updateData = {
        sessionId: id,
        status,
        detail,
        token: Session.findById(id)?.token
    };

    // Only include QR or pairingCode if they are provided, to avoid clearing them on the frontend during status transitions
    if (isQR) updateData.qr = qrOrCode;
    if (isPairingCode) updateData.pairingCode = qrOrCode;

    if (status === 'DISCONNECTED') {
        updateData.qr = null;
        updateData.pairingCode = null;
    }

    broadcastToClients({
        type: 'session-update',
        data: updateData
    });

};

global._broadcastSessionUpdate = broadcastSessionUpdate;

const createSessionWrapper = async (sessionId, email, phoneNumber = null) => {
    const session = SessionService.isProviderActive()
        ? await SessionService.createSessionProvider(sessionId, email, phoneNumber)
        : Session.create(sessionId, email);

    if (session.token) {
        sessionTokens.set(sessionId, session.token);
        // Also persist to Redis for multi-instance support
        whappiSessionStore.setToken(sessionId, session.token).catch(() => {});
    }
    return session;
};

const deleteSessionWrapper = async (sessionId) => {
    log(`Demande de suppression complète pour la session: ${sessionId}`, 'SYSTEM', { sessionId }, 'INFO');

    sessionTokens.delete(sessionId);
    // Also remove from Redis
    whappiSessionStore.deleteToken(sessionId).catch(() => {});
    if (SessionService.isProviderActive()) {
        await SessionService.deleteSessionProvider(sessionId);
    }
    Session.delete(sessionId);

    broadcastToClients({
        type: 'session-deleted',
        data: { sessionId }
    });
};

const getSessionsDetailsWrapper = async (email, isAdmin) => {
    // Reconcile local DB status with live provider state before returning
    if (SessionService.isProviderActive()) {
        await SessionService.reconcileSessionsStatus(email, isAdmin);
    }

    const sessions = Session.getAll(email, isAdmin);

    return sessions.map(s => ({
        ...s,
        status: s.status,
        sessionId: s.id,
        isConnected: s.status === 'CONNECTED',
        pairingCode: s.pairing_code,
        qr: s.qr_code
    }));
};

const triggerQRWrapper = async (sessionId) => {
    const session = Session.findById(sessionId);
    if (!session) {
        log(`TriggerQR: Session ${sessionId} non trouvée dans la DB`, 'SYSTEM', { sessionId }, 'WARN');
        return false;
    }

    if (SessionService.isProviderActive()) {
        const qr = await SessionService.getQrProvider(sessionId);
        if (!qr.ok) return false;
        broadcastSessionUpdate(
            sessionId,
            qr.qr?.pairingCode ? 'GENERATING_CODE' : 'GENERATING_QR',
            qr.qr?.pairingCode ? 'Pairing code refreshed' : 'QR refreshed',
            qr.qr?.pairingCode || qr.qr?.base64 || qr.qr?.code
        );
        return true;
    }

    return false;
};

// Session Proxy backed by local DB rows. In Evolution mode there is no local
// Baileys socket in-process; the transport lives in the provider.
const sessionsProxy = {
    get: (sessionId) => {
        const session = Session.findById(sessionId);
        if (!session) return null;
        return {
            sock: null,
            status: session.status,
            token: session.token,
            detail: session.detail
        };
    },
    has: (sessionId) => Session.findById(sessionId) !== null,
    keys: () => Session.getAll().map(s => s.id),
    forEach: (callback) => {
        const dbSessions = Session.getAll();
        dbSessions.forEach(s => {
            callback({
                sock: null,
                status: s.status,
                owner: s.owner_email || 'unknown',
                detail: s.detail || 'Provider-managed session',
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

// Mount routes with specific rate limiters
app.use('/webhooks', authLimiter, webhookRoutes);
app.use('/admin/users', authLimiter, userRoutes);
app.use('/api/v1/admin', authLimiter, adminRoutes);
app.use('/api/v1/payments', authLimiter, paymentRoutes);
app.use('/api/v1/subscriptions', authLimiter, subscriptionRoutes);
app.use('/api/v1/credits', authLimiter, creditRoutes);
app.use('/api/v1/notifications', authLimiter, notificationRoutes);
app.use('/api/v1/cal', authLimiter, calRoutes);
app.use('/api/v1/webhooks', evolutionWebhookLimiter, evolutionWebhookRouter);
app.use('/api/v1', publicRoutes);  // public, no auth
app.use('/api/v1', apiLimiter, apiRouter);

// Serve modern UI
const frontendPath = path.join(__dirname, 'frontend', 'out');

if (fs.existsSync(frontendPath)) {
    // 1. Serve _next/static explicitly with long-term caching
    app.use('/_next/static', express.static(path.join(frontendPath, '_next', 'static'), {
        maxAge: '1y',
        immutable: true,
        fallthrough: false // Fail if not found to avoid falling back to index.html for assets
    }));

    // 2. Serve other static files with no-cache for index.html
    app.use((req, res, next) => {
        if (req.path === '/' || req.path === '/index.html' || req.path.endsWith('.html') || req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        next();
    });

    app.use(express.static(frontendPath, {
        extensions: ['html'],
        index: 'index.html'
    }));

    // 3. Fallback to specific HTML files or index.html for SPA routing
    app.get('*', (req, res, next) => {
        // Skip for API routes
        if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
            return next();
        }

        let reqPath = req.path;
        if (reqPath.endsWith('/')) {
            reqPath = reqPath.slice(0, -1);
        }

        // Check if a direct .html file exists for the path
        const htmlPath = path.join(frontendPath, reqPath + '.html');
        if (fs.existsSync(htmlPath)) {
            return res.sendFile(htmlPath);
        }

        // Check if an index.html exists within a directory for the path
        const dirIndexPath = path.join(frontendPath, reqPath, 'index.html');
        if (fs.existsSync(dirIndexPath)) {
            return res.sendFile(dirIndexPath);
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

// Health Check Endpoint (for monitoring and load balancers)
app.get('/api/health', async (req, res) => {
    try {
        // Check database connectivity
        await pg.query('SELECT 1');
        
        // Get version from package.json
        const packageJson = require('./package.json');
        
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: packageJson.version || '1.0.0',
            checks: {
                database: 'ok',
                memory: {
                    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
                }
            }
        };
        
        res.status(200).json(healthStatus);
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

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
        const existingSessions = Session.getAll(null, true);
        log(`Trouvé ${existingSessions.length} session(s) existante(s)`, 'SYSTEM', { count: existingSessions.length }, 'INFO');

        for (const session of existingSessions) {
            if (session.token) {
                sessionTokens.set(session.id, session.token);
                // Warm Redis cache on startup
                if (whappiSessionStore.isConnected) {
                    whappiSessionStore.setToken(session.id, session.token).catch(() => {});
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

// Initialize Redis session store and token store (optional, non-blocking)
(async () => {
    if (process.env.REDIS_URL) {
        await redisService.connect();
        const result = await whappiSessionStore.connect(session);
        if (result.isConnected && result.store) {
            activeSessionStore = result.store;
            log('Session store upgraded to Redis', 'SYSTEM', { event: 'session-store-redis' }, 'INFO');
        }

        // Load tokens from Redis into local Map (for sessions created by other instances)
        if (result.isConnected) {
            const tokenKeys = await whappiSessionStore.listTokens();
            for (const sid of tokenKeys) {
                if (!sessionTokens.has(sid)) {
                    const token = await whappiSessionStore.getToken(sid);
                    if (token) sessionTokens.set(sid, token);
                }
            }
            if (tokenKeys.length > 0) {
                log(`Loaded ${tokenKeys.length} token(s) from Redis`, 'SYSTEM', { count: tokenKeys.length }, 'INFO');
            }

            // Also persist any tokens from local Map to Redis (for offline-first sessions)
            let persisted = 0;
            for (const [sid, token] of sessionTokens) {
                if (!tokenKeys.includes(sid)) {
                    await whappiSessionStore.setToken(sid, token);
                    persisted++;
                }
            }
            if (persisted > 0) {
                log(`Persisted ${persisted} local token(s) to Redis`, 'SYSTEM', { count: persisted }, 'INFO');
            }
        }

        // Initialize BullMQ queue for outbound messages
        const SessionService = require('./src/services/SessionService');
        queueService.init(() => SessionService.getProvider());

        // Initialize Redis-backed rate limit stores
        initRateLimitStores().catch(err => {
            log(`Rate limit store init error: ${err.message}`, 'SYSTEM', { event: 'rate-limit-init-error' }, 'WARN');
        });
    }
})();

if (require.main === module) {
    server.listen(PORT, () => {
        log(`Serveur en cours d'exécution sur le port ${PORT}`, 'SYSTEM', { port: PORT }, 'INFO');
        log(`Tableau de bord: http://localhost:${PORT}`, 'SYSTEM', { url: `http://localhost:${PORT}` }, 'INFO');
    });
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    log(`Signal ${signal} reçu. Arrêt en cours...`, 'SYSTEM', { signal }, 'INFO');

    // Close Redis connections
    if (redisService.isConnected) {
        await redisService.disconnect();
    }
    if (whappiSessionStore.isConnected) {
        await whappiSessionStore.disconnect();
    }
    await queueService.shutdown();

    // Flush pending activity logs before exit
    const ActivityLog = require('./src/models/ActivityLog');
    ActivityLog.flushAll();

    // Close rate limit stores
    for (const store of [generalStore, authStore, webhookStore, apiStore]) {
        if (store && store.close) store.close().catch(() => {});
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

module.exports = { app, server, wss, wsClients, broadcastToClients };
