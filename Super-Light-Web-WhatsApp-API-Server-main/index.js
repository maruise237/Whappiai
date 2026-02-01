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
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import new modules
const { db } = require('./src/config/database');
const { User, Session, ActivityLog } = require('./src/models');
const { encrypt, decrypt, isValidKey } = require('./src/utils/crypto');
const response = require('./src/utils/response');
const whatsappService = require('./src/services/whatsapp');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const { errorHandler, notFoundHandler, asyncHandler } = require('./src/middleware/errorHandler');

// API v1 (includes legacy endpoints)
const { initializeApi } = require('./src/routes/api');

// Validate encryption key
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || !isValidKey(ENCRYPTION_KEY)) {
    console.error('FATAL: TOKEN_ENCRYPTION_KEY must be at least 64 hexadecimal characters!');
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
}

// Initialize Express
const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket clients map
const wsClients = new Map();

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-me';

if (isProduction && !process.env.SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is required in production mode!');
    process.exit(1);
}

const sessionStore = new session.MemoryStore();

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

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
    cookie: {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true', // Only use secure cookies if explicitly enabled or on HTTPS
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// WebSocket handler
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const wsToken = url.searchParams.get('token');

    let userInfo = null;
    // TODO: Validate wsToken against session

    wsClients.set(ws, userInfo);

    ws.on('close', () => {
        wsClients.delete(ws);
    });
});

// Broadcast to all WebSocket clients
function broadcastToClients(data) {
    const message = JSON.stringify(data);
    for (const [client] of wsClients) {
        if (client.readyState === 1) {
            client.send(message);
        }
    }
}

// Logger utility
const log = (message, context, details, level) => {
    // Determine level if not provided (heuristic)
    if (!level) {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('error') || lowerMsg.includes('fail')) level = 'ERROR';
        else if (lowerMsg.includes('warn')) level = 'WARN';
        else level = 'INFO';
    }

    const logObject = {
        type: 'log',
        timestamp: new Date().toISOString(),
        sessionId: context || 'SYSTEM',
        message: message,
        level: level,
        details: details || null
    };

    // Print to console
    console.log(`[${logObject.timestamp}] [${logObject.level}] [${logObject.sessionId}] ${message}`, details || '');

    // Broadcast to all connected dashboard clients
    broadcastToClients(logObject);
};

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
const broadcastSessionUpdate = (id, status, detail, qr) => {
    Session.updateStatus(id, status, detail);
    broadcastToClients({
        type: 'session-update',
        data: [{ 
            sessionId: id, 
            status, 
            detail, 
            qr,
            token: Session.findById(id)?.token
        }]
    });
};

const createSessionWrapper = async (sessionId, email) => {
    const session = Session.create(sessionId, email);
    await whatsappService.connect(sessionId, broadcastSessionUpdate, null);
    
    if (session.token) {
        sessionTokens.set(sessionId, session.token);
    }
    return session;
};

const deleteSessionWrapper = async (sessionId) => {
    whatsappService.deleteSessionData(sessionId);
    sessionTokens.delete(sessionId);
    Session.delete(sessionId);
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
            // Sync DB status if it's stale
            Session.updateStatus(s.id, 'DISCONNECTED', 'Connection lost');
        }
        
        return {
            ...s,
            status: currentStatus,
            sessionId: s.id,
            isConnected: isConnected
        };
    });
};

const triggerQRWrapper = async (sessionId) => {
    const session = Session.findById(sessionId);
    if (!session) return false;
    
    whatsappService.connect(sessionId, broadcastSessionUpdate, null);
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

// Mount new routes
app.use('/admin', authRoutes);
app.use('/admin/users', userRoutes);

// Compatibility route for legacy dashboard
app.get('/admin/activities', (req, res) => {
    res.redirect('/api/v1/activities');
});

app.use('/api/v1', apiRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Ensure default admin exists
User.ensureAdmin(process.env.ADMIN_DASHBOARD_PASSWORD);

// Initialize existing sessions on startup
(async () => {
    // Sync sessions from disk to DB
    Session.syncWithFilesystem();

    const existingSessions = Session.getAll();
    console.log(`[SYSTEM] Found ${existingSessions.length} existing session(s)`);

    for (const session of existingSessions) {
        // Populate sessionTokens
        if (session.token) {
            sessionTokens.set(session.id, session.token);
        }

        // Re-initialize any session that was previously connected, disconnected, or stuck in connecting/generating QR
        const statusesToReinit = ['CONNECTED', 'DISCONNECTED', 'CONNECTING', 'INITIALIZING', 'GENERATING_QR'];
        if (statusesToReinit.includes(session.status)) {
            console.log(`[SYSTEM] Re-initializing session: ${session.id} (last status: ${session.status})`);

            // Reset status to DISCONNECTED briefly to ensure a clean slate for Baileys
            Session.updateStatus(session.id, 'DISCONNECTED', 'Restarting...');

            whatsappService.connect(session.id, broadcastSessionUpdate, null);
        }
    }
})();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SYSTEM] Server is running on port ${PORT}`);
    console.log(`[SYSTEM] Admin dashboard: http://localhost:${PORT}/admin/dashboard.html`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[SYSTEM] Shutting down...');

    // Disconnect all WhatsApp sessions
    for (const [sessionId] of whatsappService.getActiveSessions()) {
        whatsappService.disconnect(sessionId);
    }

    server.close(() => {
        console.log('[SYSTEM] Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, wss };
