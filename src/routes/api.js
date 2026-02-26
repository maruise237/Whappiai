const express = require('express');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const { normalizeJid } = require('../utils/phone');
const KnowledgeService = require('../services/KnowledgeService');
const WebhookService = require('../services/WebhookService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const { ClerkExpressWithAuth } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const Session = require('../models/Session');
const AIModel = require('../models/AIModel');
const KeywordResponder = require('../models/KeywordResponder');
const ActivityLog = require('../models/ActivityLog');
const CreditService = require('../services/CreditService');
const QueueService = require('../services/QueueService');
const { db } = require('../config/database');
// Security: csurf removed (deprecated) - use modern CSRF protection if needed

const router = express.Router();

const webhookUrls = new Map();

const getWebhookUrl = (sessionId) => webhookUrls.get(sessionId) || process.env.WEBHOOK_URL || '';

// Multer setup for file uploads with security validation
const mediaDir = path.join(__dirname, '../../media');

// Ensure media directory exists
if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
}

// Allowed MIME types for file uploads
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

// File filter validates BEFORE saving to disk (security improvement)
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
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

function initializeApi(sessions, sessionTokens, createSession, getSessionsDetails, deleteSession, log, userManager, activityLogger, triggerQR) {
    const { isValidId, sanitizeId, validateAIModel } = require('../utils/validation');

    // Middleware to ensure current user owns the session
    const ensureOwnership = async (req, res, next) => {
        const sessionId = req.params.sessionId || req.query.sessionId || req.body.sessionId;

        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'Session ID is required' });
        }

        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        // Must be authenticated
        if (!req.currentUser || !req.currentUser.email) {
            log('ensureOwnership: no currentUser email', 'SECURITY', null, 'ERROR');
            return res.status(401).json({ status: 'error', message: 'Authentication required' });
        }

        // Admin bypass
        if (req.currentUser.role === 'admin') {
            return next();
        }

        // Token-based auth (api role) bypass if token matches session
        if (req.currentUser.role === 'api') {
            if (req.currentUser.email && req.currentUser.email.endsWith(sessionId)) {
                return next();
            }
            return res.status(403).json({ status: 'error', message: 'Token does not match session' });
        }

        // User ownership check — normalize emails to prevent casing mismatches
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


    // Clerk Auth Middleware (now global in index.js)
    // router.use(ClerkExpressWithAuth());

    // Middleware to check AI access (session-based OR token-based OR master key)
    const checkSessionOrTokenAuth = async (req, res, next) => {
        // DEFINITIVE ADMIN EMAIL
        const MASTER_ADMIN_EMAIL = 'maruise237@gmail.com';

        // Helper to check if email is admin
        const isAdminEmail = (email) => {
            return email && email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
        };

        // 1. Try Clerk Auth (Next.js frontend)
        if (req.auth && req.auth.userId) {
            try {
                // Get user from local DB to get their role
                let user = User.findById(req.auth.userId);

                // Fallback to find by email if ID sync is pending
                if (!user && req.auth.sessionClaims?.email) {
                    user = User.findByEmail(req.auth.sessionClaims.email);
                }

                const emailFromClerk = req.auth.sessionClaims?.email;
                const emailFromDB = user?.email;
                const finalEmail = (emailFromClerk || emailFromDB || `clerk-${req.auth.userId}`).toLowerCase();

                // DEFINITIVE ROLE PROMOTION: If email matches MASTER_ADMIN_EMAIL, they are ALWAYS admin
                let role = user?.role || req.auth.sessionClaims?.publicMetadata?.role || 'user';
                if (isAdminEmail(finalEmail)) {
                    role = 'admin';
                }

                req.currentUser = {
                    email: finalEmail,
                    role: role,
                    id: user?.id || req.auth.userId
                };

                log(`Authenticated user: ${finalEmail} (role: ${role})`, 'AUTH', { email: finalEmail, role }, 'INFO');

                // Auto-create or update user from Clerk
                // This ensures that anyone authenticated via Clerk has a local record
                // We sync on every request if needed, or at least ensure it exists
                if (!user) {
                    log(`Creating user ${finalEmail} from Clerk sync...`, 'AUTH');
                    user = await User.create({
                        id: req.auth.userId,
                        email: finalEmail,
                        name: req.auth.sessionClaims?.name || req.auth.sessionClaims?.full_name || finalEmail.split('@')[0],
                        imageUrl: req.auth.sessionClaims?.image_url,
                        role: role
                    });
                } else if (user.role !== role) {
                    log(`Updating role for ${finalEmail}: ${user.role} -> ${role}`, 'AUTH');
                    user = await User.create({
                        id: req.auth.userId,
                        email: finalEmail,
                        role: role
                    });
                }

                // Update legacy session for compatibility
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

        // 2. Try session-based auth (legacy dashboard fallback)
        if (req.session && req.session.adminAuthed) {
            const sessionEmail = (req.session.userEmail || '').toLowerCase();
            const sessionRole = isAdminEmail(sessionEmail) ? 'admin' : (req.session.userRole || 'user');

            // Try to resolve user ID from DB
            const user = User.findByEmail(sessionEmail);

            req.currentUser = {
                email: sessionEmail,
                role: sessionRole,
                id: user?.id
            };
            return next();
        }

        // 3. Try Master Key (Higher priority than token for administrative API calls)
        const masterKey = req.headers['x-master-key'];
        if (masterKey && masterKey === process.env.MASTER_API_KEY) {
            req.currentUser = { email: 'master-api', role: 'admin', id: 'master-key-admin' };
            return next();
        }

        // 4. Try token-based auth (Per-session API access)
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.split(' ')[1] : req.query.token;

        // Use a more generic way to get sessionId from different possible locations
        const sessionId = req.params.sessionId ? decodeURIComponent(req.params.sessionId) :
            (req.body.sessionId || req.query.sessionId);

        if (token && sessionId) {
            const expectedToken = sessionTokens.get(sessionId);
            if (expectedToken && token === expectedToken) {
                // Resolve session owner
                let userId = null;
                let userRole = 'api';

                // We need to find the session owner
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

        // 5. Check if it's a specific action that should be allowed for all users (like pairing code)
        // Note: createSession already handles its own session validation
        const isCreateSession = req.originalUrl.includes('/sessions') && req.method === 'POST';
        if (isCreateSession) {
            return next();
        }

        log(`Accès refusé: Authentification échouée pour ${req.originalUrl}`, 'SYSTEM', {
            event: 'auth-failed',
            endpoint: req.originalUrl,
            sessionId
        }, 'WARN');

        return res.status(401).json({ status: 'error', message: 'Authentication required' });
    };

    // Middleware for admin-only routes
    const requireAdmin = (req, res, next) => {
        if (!req.currentUser || req.currentUser.role !== 'admin') {
            log(`Accès admin refusé pour ${req.currentUser?.email || 'inconnu'} sur ${req.originalUrl}`, 'SYSTEM', null, 'WARN');
            return res.status(403).json({ status: 'error', message: 'Admin access required' });
        }
        next();
    };

    // More lenient rate limiter for authenticated dashboard requests
    const apiLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 100, // Increased from 30 to 100 requests per minute
        message: { status: 'error', message: 'Too many requests, please try again later.' },
        skip: (req) => {
            // Skip rate limiting for authenticated admin users
            return req.session && req.session.adminAuthed;
        },
        // Trust proxy headers for proper IP detection
        trustProxy: true,
        standardHeaders: true,
        legacyHeaders: false
    });

    router.use(apiLimiter);

    // Auth info endpoint
    router.get('/me', checkSessionOrTokenAuth, (req, res) => {
        res.json({ status: 'success', data: req.currentUser });
    });

    // User Sync Endpoint - Explicitly creates/syncs user from Clerk
    router.post('/users/sync', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const { email, id, role } = req.currentUser;
            const name = req.body.name || req.auth.sessionClaims?.name || email.split('@')[0];
            const imageUrl = req.body.imageUrl || req.auth.sessionClaims?.image_url;

            log(`Syncing user ${email} (ID: ${id})`, 'AUTH');

            // Check if user already exists before creating
            const existingUser = User.findById(id) || User.findByEmail(email);
            const isNewUser = !existingUser;

            const user = await User.create({
                id,
                email: email.toLowerCase().trim(),
                name,
                role,
                imageUrl
            });

            // Give welcome credits to new users (idempotent - safe to call each time)
            if (isNewUser && role !== 'admin') {
                try {
                    const granted = CreditService.giveWelcomeCredits(id);
                    if (granted) {
                        log(`Welcome credits granted to new user ${email}`, 'CREDITS');
                    }
                } catch (creditErr) {
                    // Non-blocking — user sync still succeeds even if credit grant fails
                    log(`Welcome credits failed for ${email}: ${creditErr.message}`, 'CREDITS', null, 'WARN');
                }
            }

            res.json({ status: 'success', data: user, isNew: isNewUser });
        } catch (err) {
            log(`Sync failed: ${err.message}`, 'AUTH', null, 'ERROR');
            res.status(500).json({ status: 'error', message: 'Failed to sync user' });
        }
    });


    // WS token endpoint (generates a temporary token for WebSocket auth)
    router.get('/ws-token', checkSessionOrTokenAuth, (req, res) => {
        // With Clerk, the frontend can just send the session token (JWT) 
        // as the WebSocket token. We'll return it back or just return success.
        // The backend WebSocket handler now validates Clerk tokens directly.
        res.json({ status: 'success', data: { message: 'Use your Clerk session token for WS' } });
    });

    // Unprotected routes (actually protected by master key or session now)
    router.post('/sessions', checkSessionOrTokenAuth, async (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, body: req.body });

        const { sessionId, phoneNumber } = req.body;
        if (!sessionId) {
            log('API error', 'SYSTEM', { event: 'api-error', error: 'sessionId is required', endpoint: req.originalUrl });
            return res.status(400).json({ status: 'error', message: 'sessionId is required' });
        }

        // Sanitize and validate session ID
        const sanitizedSessionId = sanitizeId(sessionId);

        if (!isValidId(sanitizedSessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        try {
            // Pass the creator email and optional phoneNumber to createSession
            const creatorEmail = req.currentUser ? req.currentUser.email : null;
            await createSession(sanitizedSessionId, creatorEmail, phoneNumber);
            const token = sessionTokens.get(sanitizedSessionId);

            // Log activity
            if (req.currentUser && ActivityLog) {
                await ActivityLog.logSessionCreate(
                    req.currentUser.email,
                    sanitizedSessionId,
                    req.ip,
                    req.headers['user-agent']
                );
            }

            log('Session created', sanitizedSessionId, {
                event: 'session-created',
                sessionId: sanitizedSessionId,
                createdBy: req.currentUser ? req.currentUser.email : 'api-key'
            });
            res.status(201).json({ status: 'success', message: `Session ${sanitizedSessionId} created.`, token: token });
        } catch (error) {
            log('API error', 'SYSTEM', { event: 'api-error', error: error.message, endpoint: req.originalUrl });
            res.status(500).json({ status: 'error', message: `Failed to create session: ${error.message}` });
        }
    });

    router.get('/sessions', checkSessionOrTokenAuth, (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl });

        // IMPORTANT: By default, everyone (including admin) only sees their own sessions
        // If an admin wants to see ALL sessions, they could potentially use a query param
        const showAll = req.query.all === 'true' && req.currentUser.role === 'admin';

        res.status(200).json(getSessionsDetails(req.currentUser.email, showAll));
    });

    router.post('/sessions/:sessionId/mark-used', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.params;
        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        const session = Session.findById(sessionId);
        if (session) {
            session.markUsed();
            res.json({ status: 'success', message: 'Session marked as used' });
        } else {
            res.status(404).json({ status: 'error', message: 'Session not found' });
        }
    });

    router.get('/sessions/:sessionId/qr', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.params;
        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        if (triggerQR) {
            triggerQR(sessionId).then(success => {
                if (success) {
                    res.json({ status: 'success', message: 'QR generation triggered' });
                } else {
                    res.status(404).json({ status: 'error', message: 'Session not found' });
                }
            }).catch(err => {
                res.status(500).json({ status: 'error', message: err.message });
            });
        } else {
            res.status(501).json({ status: 'error', message: 'QR trigger not implemented' });
        }
    });

    // --- Webhooks ---

    router.get('/sessions/:sessionId/webhooks', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const list = WebhookService.list(req.params.sessionId);
            res.json({ status: 'success', data: list });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.post('/sessions/:sessionId/inbox/:jid/resume', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const aiService = require('../services/ai');
            aiService.resumeForConversation(req.params.sessionId, req.params.jid);
            aiService.resetOwnerActivity(req.params.sessionId, req.params.jid);

            res.json({ status: 'success', message: 'IA réactivée pour cette conversation' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.post('/sessions/:sessionId/webhooks', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { url, events, secret } = req.body;
        if (!url) return res.status(400).json({ status: 'error', message: 'URL requise' });

        try {
            const id = WebhookService.add(req.params.sessionId, url, events || [], secret);
            res.json({ status: 'success', data: { id } });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.delete('/sessions/:sessionId/webhooks/:webhookId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const success = WebhookService.delete(req.params.webhookId, req.params.sessionId);
            res.json({ status: success ? 'success' : 'error', message: success ? 'Webhook supprimé' : 'Échec' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // --- Inbox & Memory ---

    router.get('/sessions/:sessionId/inbox', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            log(`[API] Récupération de l'inbox pour la session: ${req.params.sessionId}`, 'SYSTEM');
            const conversations = db.prepare(`
                SELECT remote_jid, MAX(created_at) as last_message_at,
                (SELECT content FROM conversation_memory WHERE remote_jid = m.remote_jid AND session_id = m.session_id ORDER BY created_at DESC LIMIT 1) as last_message
                FROM conversation_memory m
                WHERE session_id = ?
                GROUP BY remote_jid
                ORDER BY last_message_at DESC
            `).all(req.params.sessionId);
            log(`[API] Inbox récupérée: ${conversations.length} conversations`, 'SYSTEM');
            res.json({ status: 'success', data: conversations });
        } catch (error) {
            log(`[API] Erreur récupération inbox: ${error.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.get('/sessions/:sessionId/inbox/:jid', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const history = db.prepare(`
                SELECT id, role, content, created_at
                FROM conversation_memory
                WHERE session_id = ? AND remote_jid = ?
                ORDER BY created_at ASC
            `).all(req.params.sessionId, req.params.jid);
            res.json({ status: 'success', data: history });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.delete('/sessions/:sessionId/inbox/:jid', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const result = db.prepare(`
                DELETE FROM conversation_memory
                WHERE session_id = ? AND remote_jid = ?
            `).run(req.params.sessionId, req.params.jid);
            res.json({ status: 'success', data: { changes: result.changes } });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.delete('/sessions/:sessionId/inbox/:jid/:id', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const result = db.prepare(`
                DELETE FROM conversation_memory
                WHERE id = ? AND session_id = ? AND remote_jid = ?
            `).run(req.params.id, req.params.sessionId, req.params.jid);
            res.json({ status: 'success', data: { changes: result.changes } });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // AI Configuration Endpoints
    router.get('/sessions/:sessionId/ai', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.params;
        const session = Session.findById(sessionId);
        if (!session) return res.status(404).json({ status: 'error', message: 'Session not found' });

        // Return only AI related fields
        // Map ai_key to key and ai_endpoint to endpoint for frontend compatibility
        res.json({
            status: 'success',
            data: {
                enabled: !!session.ai_enabled,
                endpoint: session.ai_endpoint,
                api_endpoint: session.ai_endpoint,
                key: session.ai_key,
                api_key: session.ai_key,
                model: session.ai_model,
                prompt: session.ai_prompt,
                mode: session.ai_mode || 'bot',
                temperature: session.ai_temperature ?? 0.7,
                max_tokens: session.ai_max_tokens ?? 1000,
                deactivate_on_typing: !!session.ai_deactivate_on_typing,
                deactivate_on_read: !!session.ai_deactivate_on_read,
                trigger_keywords: session.ai_trigger_keywords || '',
                reply_delay: session.ai_reply_delay || 0,
                read_on_reply: !!session.ai_read_on_reply,
                reject_calls: !!session.ai_reject_calls,
                constraints: session.ai_constraints || '',
                session_window: session.ai_session_window ?? 5,
                respond_to_tags: !!session.ai_respond_to_tags,
                stats: {
                    received: session.ai_messages_received || 0,
                    sent: session.ai_messages_sent || 0,
                    lastError: session.ai_last_error,
                    lastMessageAt: session.ai_last_message_at
                }
            }
        });
    });

    router.post('/sessions/:sessionId/ai', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        try {
            // Validate sessionId first to ensure it's safe and exists
            if (!isValidId(sessionId)) {
                return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
            }

            // Check if session exists in DB
            const session = Session.findById(sessionId);
            if (!session) {
                return res.status(404).json({ status: 'error', message: 'Session not found' });
            }

            // Security: Only admins can set custom endpoints and keys
            const aiConfig = { ...req.body };
            if (req.currentUser.role !== 'admin') {
                delete aiConfig.endpoint;
                delete aiConfig.key;
                delete aiConfig.ai_endpoint;
                delete aiConfig.ai_key;

                // If the model is not a global model (UUID), and the user is not admin,
                // we should probably force them to use a global model or at least 
                // prevent them from using custom models if they don't have an endpoint/key.
                // But the frontend already limits the selection to global models for non-admins.
            }

            const updated = Session.updateAIConfig(sessionId, aiConfig);
            res.json({ status: 'success', data: updated });
        } catch (err) {
            log(`Échec de la mise à jour de la configuration IA pour ${sessionId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/ai/test', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        const aiService = require('../services/ai');
        try {
            // Get session config from DB if body is empty
            let config = { ...req.body };

            // Security: Non-admins cannot provide custom credentials for testing
            if (req.currentUser.role !== 'admin') {
                delete config.endpoint;
                delete config.key;
                delete config.ai_endpoint;
                delete config.ai_key;
            }

            if (!config || Object.keys(config).length === 0 || (!config.ai_endpoint && !config.endpoint)) {
                const session = Session.findById(sessionId);
                if (session) {
                    config = {
                        ...config, // Keep other fields like model, prompt if provided
                        ai_endpoint: session.ai_endpoint,
                        ai_key: session.ai_key,
                        ai_model: config.model || config.ai_model || session.ai_model,
                        ai_prompt: config.prompt || config.ai_prompt || session.ai_prompt,
                        ai_temperature: config.temperature || config.ai_temperature || session.ai_temperature,
                        ai_max_tokens: config.max_tokens || config.ai_max_tokens || session.ai_max_tokens
                    };
                }
            }

            // Normalize config for callAI
            const callConfig = {
                id: sessionId,
                ai_endpoint: config.ai_endpoint || config.endpoint,
                ai_key: config.ai_key || config.key,
                ai_model: config.ai_model || config.model,
                ai_prompt: config.ai_prompt || config.prompt,
                ai_temperature: config.ai_temperature || config.temperature,
                ai_max_tokens: config.ai_max_tokens || config.max_tokens
            };

            const result = await aiService.callAI(callConfig, "Hello, this is a connection test.");
            if (result) {
                res.json({ status: 'success', message: 'Connection successful', preview: result });
            } else {
                res.status(400).json({ status: 'error', message: 'AI failed to respond' });
            }
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Group Moderation Endpoints
    router.get('/sessions/:sessionId/moderation/groups', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        const sessionData = sessions.get(sessionId);

        if (!sessionData || !sessionData.sock || sessionData.status !== 'CONNECTED') {
            return res.status(400).json({
                status: 'error',
                message: `La session "${sessionId}" n'est pas connectée. Veuillez coupler votre compte WhatsApp.`
            });
        }

        try {
            const moderationService = require('../services/moderation');
            const groups = await moderationService.getAdminGroups(sessionData.sock, sessionId);
            res.json({ status: 'success', data: groups });
        } catch (err) {
            log(`Erreur lors de la récupération des groupes pour ${sessionId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.get('/sessions/:sessionId/moderation/groups/:groupId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const settings = db.prepare('SELECT * FROM group_settings WHERE group_id = ? AND session_id = ?').get(groupId, sessionId);
            res.json({
                status: 'success',
                data: settings || {
                    group_id: groupId,
                    session_id: sessionId,
                    is_active: 0,
                    anti_link: 0,
                    bad_words: '',
                    warning_template: 'Attention @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.',
                    max_warnings: 5,
                    welcome_enabled: 0,
                    ai_assistant_enabled: 0
                }
            });
        } catch (err) {
            log(`Erreur lors de la récupération des réglages pour ${groupId}: ${err.message}`, sessionId, { groupId, error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/moderation/groups/:groupId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const moderationService = require('../services/moderation');
            moderationService.updateGroupSettings(sessionId, groupId, req.body);
            res.json({ status: 'success', message: 'Settings updated' });
        } catch (err) {
            log(`Échec de la mise à jour de la modération pour ${groupId}: ${err.message}`, sessionId, { groupId, error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.get('/stats', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const userEmail = req.currentUser.role === 'admin' ? null : req.currentUser.email;
            const summary = ActivityLog.getSummary(userEmail, 7);
            const user = User.findById(req.currentUser.id);

            // Count user sessions
            let sessionCount = 0;
            if (req.currentUser.role === 'admin') {
                sessionCount = Session.countActive();
            } else {
                sessionCount = Session.getSessionIdsByOwner(req.currentUser.email).length;
            }

            res.json({
                status: 'success',
                data: {
                    totalActivities: summary.totalActivities,
                    successRate: summary.successRate,
                    credits: user?.message_limit || 0,
                    activeSessions: sessionCount,
                    messagesSent: summary.byAction?.send_message || 0
                }
            });
        } catch (err) {
            log(`[API] Erreur stats: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Group Profiles & Links
    router.get('/sessions/:sessionId/groups/:groupId/profile', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../services/groups');
            const profile = groupService.getProfile(sessionId, groupId);
            res.json({ status: 'success', data: profile });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/groups/:groupId/profile', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../services/groups');
            groupService.updateProfile(sessionId, groupId, req.body);
            res.json({ status: 'success', message: 'Profile updated' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.get('/sessions/:sessionId/groups/:groupId/links', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../services/groups');
            const links = groupService.getProductLinks(sessionId, groupId);
            res.json({ status: 'success', data: links });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/groups/:groupId/links', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../services/groups');
            groupService.updateProductLinks(sessionId, groupId, req.body.links || []);
            res.json({ status: 'success', message: 'Links updated' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // AI Group Message Generation
    router.post('/sessions/:sessionId/groups/:groupId/ai-generate', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            // Credit Check & Deduction
            if (req.currentUser.role !== 'admin') {
                if (!req.currentUser.id) {
                    return res.status(400).json({ status: 'error', message: 'User account required for credit deduction.' });
                }

                const hasCredit = CreditService.deduct(req.currentUser.id, 1, `Génération IA pour groupe ${groupId}`);
                if (!hasCredit) {
                    return res.status(402).json({ status: 'error', message: 'Crédits insuffisants.' });
                }
            }

            const aiService = require('../services/ai');
            const rawMessage = await aiService.generateGroupMessage(sessionId, groupId, req.body);
            // Format for WhatsApp before returning so user sees the final version
            const message = aiService.formatForWhatsApp(rawMessage);
            res.json({ status: 'success', data: { message } });
        } catch (err) {
            log(`Erreur génération IA groupe ${groupId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Group Engagement Endpoints
    router.get('/sessions/:sessionId/moderation/groups/:groupId/engagement', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const engagementService = require('../services/engagement');
            const tasks = engagementService.getTasks(sessionId, groupId);
            res.json({ status: 'success', data: tasks });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/moderation/groups/:groupId/engagement', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const engagementService = require('../services/engagement');
            const taskId = engagementService.addTask({
                ...req.body,
                session_id: sessionId,
                group_id: groupId
            });
            res.status(201).json({ status: 'success', data: { id: taskId } });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.delete('/moderation/engagement/:taskId', checkSessionOrTokenAuth, async (req, res) => {
        const { taskId } = req.params;
        try {
            const engagementService = require('../services/engagement');
            engagementService.deleteTask(taskId);
            res.json({ status: 'success', message: 'Tâche supprimée' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // REST API for updating pending engagement tasks (Pessimistic locking via status check)
    router.put('/moderation/engagement/:taskId', checkSessionOrTokenAuth, async (req, res) => {
        const { taskId } = req.params;
        try {
            const engagementService = require('../services/engagement');
            const updated = engagementService.updateTask(taskId, req.body);
            res.json({ status: 'success', data: updated });
        } catch (err) {
            res.status(400).json({ status: 'error', message: err.message });
        }
    });

    // Filterable task history endpoint
    router.get('/sessions/:sessionId/moderation/groups/:groupId/engagement/history', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const engagementService = require('../services/engagement');
            const history = engagementService.getHistory({
                session_id: sessionId,
                group_id: groupId,
                ...req.query
            });
            res.json({ status: 'success', data: history });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // AI Personality Templates Endpoint
    router.get('/ai/templates', checkSessionOrTokenAuth, (req, res) => {
        const templates = require('../utils/ai-templates');
        res.json({ status: 'success', data: templates });
    });

    // --- Knowledge Base (RAG) ---

    // --- Keyword Responders ---
    router.get('/sessions/:sessionId/keywords', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const rules = KeywordResponder.findBySessionId(req.params.sessionId);
            res.json({ status: 'success', data: rules });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.post('/sessions/:sessionId/keywords', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const rule = KeywordResponder.create({
                ...req.body,
                session_id: req.params.sessionId
            });
            res.status(201).json({ status: 'success', data: rule });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.put('/sessions/:sessionId/keywords/:id', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const rule = KeywordResponder.update(req.params.id, req.body);
            res.json({ status: 'success', data: rule });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.delete('/sessions/:sessionId/keywords/:id', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            KeywordResponder.delete(req.params.id);
            res.json({ status: 'success', message: 'Règle supprimée' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.get('/sessions/:sessionId/knowledge', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const docs = KnowledgeService.listDocuments(req.params.sessionId);
            res.json({ status: 'success', data: docs });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.post('/sessions/:sessionId/knowledge', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { name, type, content, source } = req.body;
        if (!name || !content) {
            return res.status(400).json({ status: 'error', message: 'Nom et contenu requis' });
        }

        try {
            const id = await KnowledgeService.addDocument(req.params.sessionId, name, type || 'text', content, source);
            res.json({ status: 'success', data: { id } });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    router.delete('/sessions/:sessionId/knowledge/:docId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const success = KnowledgeService.deleteDocument(req.params.docId, req.params.sessionId);
            res.json({ status: success ? 'success' : 'error', message: success ? 'Document supprimé' : 'Échec de la suppression' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Notifications Endpoints
    router.get('/notifications', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const NotificationService = require('../services/NotificationService');
            const unreadOnly = req.query.unread === 'true';
            const notifications = NotificationService.getUserNotifications(req.currentUser.id, unreadOnly);
            res.json({ status: 'success', data: notifications });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.put('/notifications/:id/read', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const NotificationService = require('../services/NotificationService');
            NotificationService.markAsRead(req.params.id, req.currentUser.id);
            res.json({ status: 'success', message: 'Marqué comme lu' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.put('/notifications/read-all', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const NotificationService = require('../services/NotificationService');
            NotificationService.markAllAsRead(req.currentUser.id);
            res.json({ status: 'success', message: 'Tout a été marqué comme lu' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Activity Log Endpoints
    router.get('/activities', checkSessionOrTokenAuth, async (req, res) => {
        try {
            if (!ActivityLog) {
                log(`[API] Activity log model non trouvé`, 'SYSTEM', null, 'ERROR');
                return res.status(501).json({ status: 'error', message: 'Activity log system not available' });
            }

            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;

            log(`[API] Récupération des activités pour ${req.currentUser.email} (role: ${req.currentUser.role})`, 'SYSTEM');

            let logs;
            if (req.currentUser.role === 'admin') {
                logs = ActivityLog.getLogs(limit, offset);
            } else {
                logs = ActivityLog.getUserLogs(req.currentUser.email, limit, offset);
            }

            res.json({ status: 'success', data: logs });
        } catch (err) {
            log(`[API] Erreur activités: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.get('/analytics', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const userEmail = req.currentUser.role === 'admin' ? null : req.currentUser.email;

            const data = ActivityLog.getAnalytics(userEmail, days);
            res.json({ status: 'success', data });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.get('/activities/summary', checkSessionOrTokenAuth, async (req, res) => {
        try {
            if (!ActivityLog) {
                log(`[API] Activity log model non trouvé (summary)`, 'SYSTEM', null, 'ERROR');
                return res.status(501).json({ status: 'error', message: 'Activity log system not available' });
            }

            const days = parseInt(req.query.days) || 7;
            log(`[API] Résumé activités pour ${req.currentUser.email} (${days} jours)`, 'SYSTEM');

            // If admin, show global summary, else show user-specific summary
            const userEmail = req.currentUser.role === 'admin' ? null : req.currentUser.email;
            const summary = ActivityLog.getSummary(userEmail, days);

            res.json({ status: 'success', data: summary });
        } catch (err) {
            log(`[API] Erreur résumé activités: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Admin AI Model Management Endpoints
    router.get('/admin/ai-models', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            log(`Fetching AI models for admin: ${req.currentUser.email}`, 'SYSTEM');
            const models = AIModel.getAll();
            res.json({ status: 'success', data: models });
        } catch (err) {
            log(`Error fetching AI models: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/admin/ai-models', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            const validation = validateAIModel({ ...req.body, isNew: true });
            if (!validation.isValid) {
                return res.status(422).json({
                    status: 'error',
                    message: 'Validation failed',
                    details: { errors: validation.errors }
                });
            }

            const model = AIModel.create(req.body);
            ActivityLog.logAIModel(req.currentUser.email, 'CREATE', model.id, { name: model.name });
            res.status(201).json({ status: 'success', data: model });
        } catch (err) {
            res.status(400).json({ status: 'error', message: err.message });
        }
    });

    router.put('/admin/ai-models/:id', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            const existing = AIModel.findById(req.params.id);
            if (!existing) return res.status(404).json({ status: 'error', message: 'Model not found' });

            // Validate update - combine existing with updates for validation
            const updatedData = { ...existing, ...req.body };
            // Support aliases for validation
            const apiKey = req.body.api_key || req.body.key;

            // If api_key is empty in the request, it means we want to keep the existing one
            if (apiKey === "" || apiKey === undefined) {
                updatedData.api_key = existing.api_key;
            } else {
                updatedData.api_key = apiKey;
            }

            const validation = validateAIModel(updatedData);
            if (!validation.isValid) {
                return res.status(422).json({
                    status: 'error',
                    message: 'Validation failed',
                    details: { errors: validation.errors }
                });
            }

            const modelUpdate = { ...req.body };
            // Ensure api_key is correctly set from alias if provided
            if (req.body.api_key !== undefined) modelUpdate.api_key = req.body.api_key;
            else if (req.body.key !== undefined) modelUpdate.api_key = req.body.key;

            if (modelUpdate.api_key === "" || modelUpdate.api_key === undefined) {
                delete modelUpdate.api_key;
            }

            const model = AIModel.update(req.params.id, modelUpdate);
            ActivityLog.logAIModel(req.currentUser.email, 'UPDATE', req.params.id, { name: model.name });
            res.json({ status: 'success', data: model });
        } catch (err) {
            res.status(400).json({ status: 'error', message: err.message });
        }
    });

    router.delete('/admin/ai-models/:id', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        try {
            const model = AIModel.findById(req.params.id);
            const success = AIModel.delete(req.params.id);
            if (!success) return res.status(404).json({ status: 'error', message: 'Model not found' });
            ActivityLog.logAIModel(req.currentUser.email, 'DELETE', req.params.id, { name: model?.name });
            res.json({ status: 'success', message: 'Model deleted' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // User-facing AI Model List (Only active models)
    router.get('/ai-models', checkSessionOrTokenAuth, (req, res) => {
        try {
            const models = AIModel.getAll(true);
            // Don't send sensitive info to regular users
            const safeModels = models.map(m => {
                const { api_key, provider, endpoint, ...safe } = m;
                return safe;
            });
            res.json({ status: 'success', data: safeModels });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });


    // Debug endpoint to check session status
    router.get('/debug/sessions', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        const debugInfo = {};
        sessions.forEach((session, sessionId) => {
            debugInfo[sessionId] = {
                status: session.status,
                hasSock: !!session.sock,
                sockConnected: session.sock ? 'yes' : 'no',
                owner: session.owner,
                detail: session.detail
            };
        });
        res.json(debugInfo);
    });

    router.delete('/sessions/:sessionId', checkSessionOrTokenAuth, async (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, params: req.params });
        const { sessionId } = req.params;

        try {
            // Check ownership if user is authenticated
            if (req.currentUser) {
                log(`Delete session attempt: ${sessionId} by ${req.currentUser.email} (role: ${req.currentUser.role})`, 'AUTH');

                // Admin can delete everything
                if (req.currentUser.role === 'admin') {
                    log(`Admin ${req.currentUser.email} allowed to delete session ${sessionId}`, 'AUTH');
                } else if (req.currentUser.role === 'api') {
                    // Token-based auth for this specific session is allowed
                    if (!req.currentUser.email.endsWith(sessionId)) {
                        return res.status(403).json({
                            status: 'error',
                            message: 'Token does not match session'
                        });
                    }
                } else {
                    const sessionOwner = userManager ? userManager.getSessionOwner(sessionId) : { email: Session.findById(sessionId)?.owner_email };
                    if (sessionOwner && sessionOwner.email && sessionOwner.email !== req.currentUser.email) {
                        log(`Denied delete session ${sessionId}: Owner is ${sessionOwner.email}, requester is ${req.currentUser.email}`, 'AUTH');
                        return res.status(403).json({
                            status: 'error',
                            message: 'You can only delete your own sessions'
                        });
                    }
                }
            }

            await deleteSession(sessionId);

            // Log activity
            if (req.currentUser && ActivityLog) {
                await ActivityLog.logSessionDelete(
                    req.currentUser.email,
                    sessionId,
                    req.ip,
                    req.headers['user-agent']
                );
            }

            log('Session deleted', sessionId, { event: 'session-deleted', sessionId });
            res.status(200).json({ status: 'success', message: `Session ${sessionId} deleted.` });
        } catch (error) {
            log('API error', 'SYSTEM', { event: 'api-error', error: error.message, endpoint: req.originalUrl });
            res.status(500).json({ status: 'error', message: `Failed to delete session: ${error.message}` });
        }
    });

    async function sendMessage(sock, to, message, sessionId, req) {
        try {
            // Robust JID handling: only normalize if it's a user JID, otherwise use as is
            const jid = to.endsWith('@g.us') ? to : jidNormalizedUser(to);

            if (!jid) {
                throw new Error(`Invalid JID: ${to}`);
            }

            log(`[API] Tentative d'envoi de message vers ${jid}`, 'SYSTEM', { to: jid }, 'DEBUG');

            // Log message structure for debugging
            log(`[API] Structure du message: ${JSON.stringify(message)}`, 'SYSTEM', { message }, 'DEBUG');

            const result = await QueueService.enqueue(sessionId, sock, jid, message, {
                priority: 'high' // Manual messages get high priority
            });

            if (!result) {
                throw new Error('Baileys a retourné un résultat vide');
            }

            // Log to activity log
            if (ActivityLog) {
                const userEmail = req.currentUser ? req.currentUser.email : (req.session?.userEmail || 'api-key');

                await ActivityLog.logMessageSend(
                    userEmail,
                    sessionId,
                    jid,
                    Object.keys(message)[0] || 'unknown',
                    req.ip,
                    req.headers['user-agent']
                );
            }

            log(`[API] Message envoyé avec succès à ${jid}, ID: ${result.key.id}`, 'SYSTEM', { to: jid, messageId: result.key.id }, 'INFO');
            return {
                status: 'success',
                message: `Message envoyé à ${to}`,
                messageId: result.key.id,
                result: result
            };
        } catch (error) {
            log(`[API] Échec de l'envoi du message à ${to}: ${error.message}`, 'SYSTEM', { to, error: error.message }, 'ERROR');
            // Check for specific Baileys error types if possible
            const errorDetail = error.stack || error.message;
            return {
                status: 'error',
                message: `Failed to send message to ${to}. Reason: ${error.message}`,
                detail: errorDetail
            };
        }
    }

    // Webhook setup endpoint
    router.post('/webhook', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, body: req.body });
        const { url, sessionId } = req.body;
        if (!url || !sessionId) {
            log('API error', 'SYSTEM', { event: 'api-error', error: 'URL and sessionId are required.', endpoint: req.originalUrl });
            return res.status(400).json({ status: 'error', message: 'URL and sessionId are required.' });
        }
        webhookUrls.set(sessionId, url);
        log('Webhook URL updated', url, { event: 'webhook-updated', sessionId, url });
        res.status(200).json({ status: 'success', message: `Webhook URL for session ${sessionId} updated to ${url}` });
    });

    // Add GET and DELETE endpoints for webhook management
    router.get('/webhook', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'sessionId is required.' });
        }
        const url = webhookUrls.get(sessionId) || null;
        res.status(200).json({ status: 'success', sessionId, url });
    });

    router.delete('/webhook', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'sessionId is required.' });
        }
        webhookUrls.delete(sessionId);
        log('Webhook URL deleted', '', { event: 'webhook-deleted', sessionId });
        res.status(200).json({ status: 'success', message: `Webhook for session ${sessionId} deleted.` });
    });

    // Hardened media upload endpoint (validation handled by multer fileFilter)
    router.post('/media', checkSessionOrTokenAuth, upload.single('file'), (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, body: req.body });
        if (!req.file) {
            log('API error', 'SYSTEM', { event: 'api-error', error: 'No file uploaded or invalid file type.', endpoint: req.originalUrl });
            return res.status(400).json({ status: 'error', message: 'No file uploaded or invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, MP3, MP4, OGG, WAV, WEBM, MOV. Max size: 25MB.' });
        }
        const mediaId = req.file.filename;
        log('File uploaded', mediaId, { event: 'file-uploaded', mediaId });
        res.status(201).json({
            status: 'success',
            message: 'File uploaded successfully.',
            mediaId: mediaId,
            url: `/media/${mediaId}`
        });
    });

    // Get credit history
    router.get('/credits', checkSessionOrTokenAuth, (req, res) => {
        try {
            const user = User.findById(req.currentUser.id);
            if (!user) {
                return res.status(404).json({ status: 'error', message: 'Utilisateur non trouvé' });
            }

            const history = User.getCreditHistory(req.currentUser.id);
            res.json({
                status: 'success',
                data: {
                    balance: user.message_limit,
                    used: user.message_used,
                    plan: user.plan_id,
                    history: history
                }
            });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Main message sending endpoint
    router.post('/messages', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, query: req.query });
        const { sessionId } = req.query;
        if (!sessionId) {
            log('API error', 'SYSTEM', { event: 'api-error', error: 'sessionId query parameter is required', endpoint: req.originalUrl });
            return res.status(400).json({ status: 'error', message: 'sessionId query parameter is required' });
        }
        const session = sessions.get(sessionId);
        log(`[API] Requête de message pour la session ${sessionId}`, sessionId, {
            exists: !!session,
            status: session?.status,
            hasSock: !!session?.sock,
            sockConnected: session?.sock?.user ? 'yes' : 'no'
        }, 'DEBUG');

        if (!session || !session.sock || session.status !== 'CONNECTED') {
            log('API error', 'SYSTEM', {
                event: 'api-error',
                error: `Session ${sessionId} not found or not connected.`,
                sessionExists: !!session,
                sessionStatus: session?.status,
                hasSock: !!session?.sock,
                endpoint: req.originalUrl
            });
            return res.status(404).json({
                status: 'error',
                message: `Session ${sessionId} not found or not connected.`,
                detail: !session ? 'Session does not exist' : (!session.sock ? 'Socket connection missing' : `Session status is ${session.status}`)
            });
        }
        const messages = Array.isArray(req.body) ? req.body : [req.body];
        const results = [];
        const phoneNumbers = []; // Track all phone numbers for logging
        const messageContents = []; // Track message contents with formatting

        for (const msg of messages) {
            const { recipient_type, to, type, text } = msg;
            const msgImage = msg.image;
            const msgDocument = msg.document;
            const msgAudio = msg.audio;
            const msgVideo = msg.video;

            // Input validation
            if (!to || !type) {
                results.push({ status: 'error', message: 'Recipient (to) and type are required' });
                continue;
            }

            // Credit Check & Deduction
            let creditDeducted = false;
            const isAdmin = req.currentUser.role === 'admin';

            if (isAdmin) {
                // Admin bypass - no deduction, just log
            } else {
                if (!req.currentUser.id) {
                    results.push({ status: 'error', message: 'User account required for credit deduction.' });
                    continue;
                }

                try {
                    const hasCredit = CreditService.deduct(req.currentUser.id, 1, `Envoi message vers ${to}`);

                    if (!hasCredit) {
                        results.push({ status: 'error', message: 'Crédits insuffisants. Veuillez recharger votre compte.' });
                        continue;
                    }
                    creditDeducted = true;
                } catch (err) {
                    results.push({ status: 'error', message: `Credit error: ${err.message}` });
                    continue;
                }
            }

            try {
                let result;
                if (type === 'text') {
                    // ... existing logic ...
                    result = await sendMessage(session.sock, to, { text: text }, sessionId, req);
                } else if (type === 'image') {
                    result = await sendMessage(session.sock, to, { image: { url: msgImage.url }, caption: msgImage.caption }, sessionId, req);
                } else if (type === 'document') {
                    result = await sendMessage(session.sock, to, { document: { url: msgDocument.url }, fileName: msgDocument.fileName, mimetype: msgDocument.mimetype }, sessionId, req);
                } else if (type === 'audio') {
                    result = await sendMessage(session.sock, to, { audio: { url: msgAudio.url }, mimetype: msgAudio.mimetype, ptt: msgAudio.ptt }, sessionId, req);
                } else if (type === 'video') {
                    result = await sendMessage(session.sock, to, { video: { url: msgVideo.url }, caption: msgVideo.caption }, sessionId, req);
                } else {
                    result = { status: 'error', message: `Unsupported message type: ${type}` };
                }

                if (result.status === 'error' && creditDeducted) {
                    CreditService.add(req.currentUser.id, 1, 'credit', `Remboursement: échec envoi vers ${to}`);
                }

                results.push(result);
            } catch (error) {
                if (creditDeducted) {
                    CreditService.add(req.currentUser.id, 1, 'credit', `Remboursement: erreur système vers ${to}`);
                }
                results.push({ status: 'error', message: error.message });
            }
        }

        res.json({ status: 'success', results });
    });

    return router;
}

module.exports = { initializeApi, getWebhookUrl };
