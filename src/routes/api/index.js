/**
 * API Routes Index
 * Centralized router that imports and registers all modular route handlers
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const rateLimit = require('express-rate-limit');

// Import models
const User = require('../models/User');
const Session = require('../models/Session');
const AIModel = require('../models/AIModel');
const KeywordResponder = require('../models/KeywordResponder');
const ActivityLog = require('../models/ActivityLog');

// Import services
const CreditService = require('../services/CreditService');
const QueueService = require('../services/QueueService');
const { db } = require('../config/database');

// Import validation utilities
const { isValidId, sanitizeId, validateAIModel } = require('../utils/validation');

// Import modular route handlers
const initializeUserRoutes = require('./api/users');
const initializeSessionRoutes = require('./api/sessions');
const initializeWebhookRoutes = require('./api/webhooks');
const initializeAIRoutes = require('./api/ai');
const initializeGroupRoutes = require('./api/groups');
const initializeKnowledgeRoutes = require('./api/knowledge');
const initializeStatsRoutes = require('./api/stats');
const initializeAdminRoutes = require('./api/admin');
const initializeCalRoutes = require('./api/cal');
const initializeNotificationsRoutes = require('./api/notifications');
const initializeMessageRoutes = require('./api/messages');

const router = express.Router();

// Webhook URLs map (legacy support)
const webhookUrls = new Map();

// Multer setup for file uploads
const mediaDir = path.join(__dirname, '../../media');
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac',
    'video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/quicktime'
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, mediaDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${randomUUID()}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, Audio (MP3, MP4, OGG, WAV, WEBM, AAC), Video (MP4, MPEG, OGG, WEBM, MOV).'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024 }
});

/**
 * Initialize all API routes
 * @param {Map} sessions - In-memory session storage
 * @param {Map} sessionTokens - Session token storage
 * @param {Function} createSession - Session creation function
 * @param {Function} getSessionsDetails - Get sessions details function
 * @param {Function} deleteSession - Session deletion function
 * @param {Function} log - Logging function
 * @param {Object} userManager - User manager instance
 * @param {Object} activityLogger - Activity logger instance
 * @param {Function} triggerQR - QR code trigger function
 */
function initializeApi(sessions, sessionTokens, createSession, getSessionsDetails, deleteSession, log, userManager, activityLogger, triggerQR) {
    
    // Admin role checker middleware
    const requireAdmin = (req, res, next) => {
        if (!req.currentUser || req.currentUser.role !== 'admin') {
            return res.status(403).json({ status: 'error', message: 'Admin access required' });
        }
        next();
    };

    // Auth middleware with multiple strategies
    const checkSessionOrTokenAuth = async (req, res, next) => {
        const MASTER_ADMIN_EMAIL = 'maruise237@gmail.com';
        const isAdminEmail = (email) => email && email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

        // 1. Try Clerk Auth
        if (req.auth && req.auth.userId) {
            try {
                let user = User.findById(req.auth.userId);
                if (!user && req.auth.sessionClaims?.email) {
                    user = User.findByEmail(req.auth.sessionClaims.email);
                }

                const emailFromClerk = req.auth.sessionClaims?.email;
                const emailFromDB = user?.email;
                const finalEmail = (emailFromClerk || emailFromDB || `clerk-${req.auth.userId}`).toLowerCase();

                let role = user?.role || req.auth.sessionClaims?.publicMetadata?.role || 'user';
                if (isAdminEmail(finalEmail)) {
                    role = 'admin';
                }

                req.currentUser = {
                    email: finalEmail,
                    role,
                    id: user?.id || req.auth.userId
                };

                if (!user) {
                    log(`Creating user ${finalEmail} from Clerk sync...`, 'AUTH');
                    user = await User.create({
                        id: req.auth.userId,
                        email: finalEmail,
                        name: req.auth.sessionClaims?.name || req.auth.sessionClaims?.full_name || finalEmail.split('@')[0],
                        imageUrl: req.auth.sessionClaims?.image_url,
                        role
                    });
                } else if (user.role !== role) {
                    log(`Updating role for ${finalEmail}: ${user.role} -> ${role}`, 'AUTH');
                    user = await User.create({ id: req.auth.userId, email: finalEmail, role });
                }

                if (req.session) {
                    req.session.adminAuthed = role === 'admin';
                    req.session.userEmail = finalEmail;
                    req.session.userRole = role;
                }

                return next();
            } catch (err) {
                log(`Clerk auth error: ${err.message}`, 'SYSTEM', null, 'ERROR');
            }
        }

        // 2. Try session-based auth
        if (req.session && req.session.adminAuthed) {
            const sessionEmail = (req.session.userEmail || '').toLowerCase();
            const sessionRole = isAdminEmail(sessionEmail) ? 'admin' : (req.session.userRole || 'user');
            const user = User.findByEmail(sessionEmail);

            req.currentUser = {
                email: sessionEmail,
                role: sessionRole,
                id: user?.id
            };
            return next();
        }

        // 3. Try Master Key
        const masterKey = req.headers['x-master-key'];
        if (masterKey && masterKey === process.env.MASTER_API_KEY) {
            req.currentUser = { email: 'master-api', role: 'admin', id: 'master-key-admin' };
            return next();
        }

        // 4. Try token-based auth
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.split(' ')[1] : req.query.token;
        const sessionId = req.params.sessionId ? decodeURIComponent(req.params.sessionId) : (req.body.sessionId || req.query.sessionId);

        if (token && sessionId) {
            const expectedToken = sessionTokens.get(sessionId);
            if (expectedToken && token === expectedToken) {
                let userId = null;
                let userRole = 'api';
                const session = sessions.get(sessionId) || Session.findById(sessionId);

                if (session && session.owner_email) {
                    const user = User.findByEmail(session.owner_email);
                    if (user) {
                        userId = user.id;
                        userRole = user.role;
                    }
                }

                req.currentUser = {
                    email: `api-${sessionId}`,
                    role: userRole,
                    id: userId
                };
                return next();
            }
        }

        return res.status(401).json({ status: 'error', message: 'Authentication required' });
    };

    // Ownership checker middleware
    const ensureOwnership = async (req, res, next) => {
        const sessionId = req.params.sessionId || req.query.sessionId || req.body.sessionId;

        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }

        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        if (!req.currentUser || !req.currentUser.email) {
            log('ensureOwnership: no currentUser email', 'SECURITY', null, 'ERROR');
            return res.status(401).json({ status: 'error', message: 'Authentication required' });
        }

        if (req.currentUser.role === 'admin') {
            return next();
        }

        if (req.currentUser.role === 'api') {
            if (req.currentUser.email && req.currentUser.email.endsWith(sessionId)) {
                return next();
            }
            return res.status(403).json({ status: 'error', message: 'Token does not match session' });
        }

        const sessionOwner = userManager ? userManager.getSessionOwner(sessionId) : { email: Session.findById(sessionId)?.owner_email };
        if (!sessionOwner || !sessionOwner.email) {
            return res.status(404).json({ status: 'error', message: 'Session not found or has no owner' });
        }

        const ownerEmail = (sessionOwner.email || '').toLowerCase().trim();
        const currentEmail = (req.currentUser.email || '').toLowerCase().trim();

        if (!ownerEmail || ownerEmail !== currentEmail) {
            log(`Blocked cross-session access: ${currentEmail} tried to access ${sessionId} (owned by ${ownerEmail})`, 'AUTH');
            return res.status(403).json({ status: 'error', message: 'Access denied: You do not own this session' });
        }

        next();
    };

    // Rate limiting
    const apiLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 100,
        message: { status: 'error', message: 'Too many requests, please try again later.' }
    });
    router.use(apiLimiter);

    // Dependencies object for route modules
    const dependencies = {
        sessions,
        sessionTokens,
        createSession,
        getSessionsDetails,
        deleteSession,
        log,
        userManager,
        activityLogger,
        triggerQR,
        checkSessionOrTokenAuth,
        ensureOwnership,
        requireAdmin,
        webhookUrls,
        upload,
        isValidId,
        sanitizeId,
        validateAIModel
    };

    // Register all route modules
    initializeUserRoutes(router, dependencies);
    initializeSessionRoutes(router, dependencies);
    initializeWebhookRoutes(router, dependencies);
    initializeAIRoutes(router, dependencies);
    initializeGroupRoutes(router, dependencies);
    initializeKnowledgeRoutes(router, dependencies);
    initializeStatsRoutes(router, dependencies);
    initializeAdminRoutes(router, dependencies);
    initializeCalRoutes(router, dependencies);
    initializeNotificationsRoutes(router, dependencies);
    initializeMessageRoutes(router, dependencies);

    return router;
}

function getWebhookUrl(sessionId) {
    return webhookUrls.get(sessionId) || process.env.WEBHOOK_URL || '';
}

module.exports = { initializeApi, getWebhookUrl };
