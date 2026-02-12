const express = require('express');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const { normalizeJid } = require('../utils/phone');
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
const ActivityLog = require('../models/ActivityLog');
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

    // Clerk Auth Middleware (now global in index.js)
    // router.use(ClerkExpressWithAuth());

    // Middleware to check campaign or AI access (session-based OR token-based OR master key)
    const checkSessionOrTokenAuth = async (req, res, next) => {
        // DEFINITIVE ADMIN EMAIL
        const MASTER_ADMIN_EMAIL = 'maruise237@gmail.com';

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
                if (finalEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
                    role = 'admin';
                }

                req.currentUser = {
                    email: finalEmail,
                    role: role,
                    id: user?.id || req.auth.userId
                };
                
                log(`Authenticated user: ${finalEmail} (role: ${role})`, 'AUTH', { email: finalEmail, role }, 'INFO');

                // Ensure user exists and has correct role in local DB
                if (!user || user.role !== role) {
                    log(`Syncing local user role for ${finalEmail} to ${role}`, 'AUTH');
                    User.create({
                        id: req.auth.userId,
                        email: finalEmail,
                        name: req.auth.sessionClaims?.name || finalEmail.split('@')[0],
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
            const sessionRole = sessionEmail === MASTER_ADMIN_EMAIL.toLowerCase() ? 'admin' : (req.session.userRole || 'user');
            
            req.currentUser = {
                email: sessionEmail,
                role: sessionRole
            };
            return next();
        }

        // 3. Try Master Key (Higher priority than token for administrative API calls)
        const masterKey = req.headers['x-master-key'];
        if (masterKey && masterKey === process.env.MASTER_API_KEY) {
            req.currentUser = { email: 'master-api', role: 'admin' };
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
                // For token-based auth, we don't have a currentUser object in the same way,
                // but we set a specific role 'api' to distinguish it from UI users
                req.currentUser = { email: `api-${sessionId}`, role: 'api' };
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
            if (req.currentUser && activityLogger) {
                await activityLogger.logSessionCreate(
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

    router.get('/sessions/:sessionId/qr', checkSessionOrTokenAuth, (req, res) => {
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

    // Campaign Management Endpoints
    const CampaignManager = require('../services/campaigns');
    const CampaignSender = require('../services/campaign-sender');
    const RecipientListManager = require('../services/recipient-lists');

    // Initialize campaign manager and sender
    const campaignManager = new CampaignManager(process.env.TOKEN_ENCRYPTION_KEY || 'default-key');
    const campaignSender = new CampaignSender(campaignManager, sessions, activityLogger);
    const recipientListManager = new RecipientListManager(process.env.TOKEN_ENCRYPTION_KEY || 'default-key');

    // Campaign routes
    router.get('/campaigns', checkSessionOrTokenAuth, (req, res) => {
        const campaigns = campaignManager.getAllCampaigns(
            req.currentUser ? req.currentUser.email : null,
            req.currentUser ? req.currentUser.role === 'admin' : true
        );
        res.json(campaigns);
    });

    router.get('/campaigns/overdue', checkSessionOrTokenAuth, requireAdmin, (req, res) => {
        const campaigns = campaignManager.getAllCampaigns(null, true);
        const now = new Date();
        const overdue = campaigns.filter(c => 
            c.status === 'scheduled' && 
            c.scheduledAt && 
            new Date(c.scheduledAt) <= now
        );
        res.json(overdue);
    });

    // AI Configuration Endpoints
    router.get('/sessions/:sessionId/ai', checkSessionOrTokenAuth, (req, res) => {
        const { sessionId } = req.params;
        const session = Session.findById(sessionId);
        if (!session) return res.status(404).json({ status: 'error', message: 'Session not found' });
        
        // Return only AI related fields
        res.json({
            status: 'success',
            data: {
                enabled: !!session.ai_enabled,
                endpoint: session.ai_endpoint,
                key: session.ai_key,
                model: session.ai_model,
                prompt: session.ai_prompt,
                mode: session.ai_mode || 'bot',
                temperature: session.ai_temperature ?? 0.7,
                max_tokens: session.ai_max_tokens ?? 1000,
                deactivate_on_typing: !!session.ai_deactivate_on_typing,
                deactivate_on_read: !!session.ai_deactivate_on_read,
                trigger_keywords: session.ai_trigger_keywords || '',
                stats: {
                    received: session.ai_messages_received || 0,
                    sent: session.ai_messages_sent || 0,
                    lastError: session.ai_last_error,
                    lastMessageAt: session.ai_last_message_at
                }
            }
        });
    });

    router.post('/sessions/:sessionId/ai', checkSessionOrTokenAuth, async (req, res) => {
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

    router.post('/sessions/:sessionId/ai/test', checkSessionOrTokenAuth, async (req, res) => {
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
    router.get('/sessions/:sessionId/moderation/groups', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId } = req.params;
        const sessionData = sessions.get(sessionId);
        
        if (!sessionData || !sessionData.sock) {
             return res.status(400).json({ status: 'error', message: 'Session not connected' });
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

    router.post('/sessions/:sessionId/moderation/groups/:groupId', checkSessionOrTokenAuth, async (req, res) => {
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

    // Group Profiles & Links
    router.get('/sessions/:sessionId/groups/:groupId/profile', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../services/groups');
            const profile = groupService.getProfile(sessionId, groupId);
            res.json({ status: 'success', data: profile });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/groups/:groupId/profile', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../services/groups');
            groupService.updateProfile(sessionId, groupId, req.body);
            res.json({ status: 'success', message: 'Profile updated' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.get('/sessions/:sessionId/groups/:groupId/links', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../services/groups');
            const links = groupService.getProductLinks(sessionId, groupId);
            res.json({ status: 'success', data: links });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/groups/:groupId/links', checkSessionOrTokenAuth, async (req, res) => {
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
    router.post('/sessions/:sessionId/groups/:groupId/ai-generate', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const aiService = require('../services/ai');
            const rawMessage = await aiService.generateGroupMessage(sessionId, groupId, req.body);
            // Format for WhatsApp before returning so user sees the final version
            const message = aiService.formatForWhatsApp(rawMessage);
            res.json({ status: 'success', data: { message } });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Group Animator Endpoints
    router.get('/sessions/:sessionId/moderation/groups/:groupId/animator', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const animatorService = require('../services/animator');
            const tasks = animatorService.getTasks(sessionId, groupId);
            res.json({ status: 'success', data: tasks });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.post('/sessions/:sessionId/moderation/groups/:groupId/animator', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const animatorService = require('../services/animator');
            const taskId = animatorService.addTask({
                ...req.body,
                session_id: sessionId,
                group_id: groupId
            });
            res.status(201).json({ status: 'success', data: { id: taskId } });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.delete('/moderation/animator/:taskId', checkSessionOrTokenAuth, async (req, res) => {
        const { taskId } = req.params;
        try {
            const animatorService = require('../services/animator');
            animatorService.deleteTask(taskId);
            res.json({ status: 'success', message: 'Tâche supprimée' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // REST API for updating pending animator tasks (Pessimistic locking via status check)
    router.put('/moderation/animator/:taskId', checkSessionOrTokenAuth, async (req, res) => {
        const { taskId } = req.params;
        try {
            const animatorService = require('../services/animator');
            const updated = animatorService.updateTask(taskId, req.body);
            res.json({ status: 'success', data: updated });
        } catch (err) {
            res.status(400).json({ status: 'error', message: err.message });
        }
    });

    // Filterable task history endpoint
    router.get('/sessions/:sessionId/moderation/groups/:groupId/animator/history', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const animatorService = require('../services/animator');
            const history = animatorService.getHistory(sessionId, groupId);
            res.json({ status: 'success', data: history });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Activity Log Endpoints
    router.get('/activities', checkSessionOrTokenAuth, async (req, res) => {
        try {
            if (!activityLogger) return res.status(501).json({ status: 'error', message: 'Activity logger not initialized' });
            
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            
            let logs;
            if (req.currentUser.role === 'admin') {
                logs = await activityLogger.getLogs(limit, offset);
            } else {
                logs = await activityLogger.getUserLogs(req.currentUser.email, limit, offset);
            }
            
            res.json({ status: 'success', data: logs });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    router.get('/activities/summary', checkSessionOrTokenAuth, async (req, res) => {
        try {
            if (!activityLogger) return res.status(501).json({ status: 'error', message: 'Activity logger not initialized' });
            
            // If admin, show global summary, else show user-specific summary
            const userEmail = req.currentUser.role === 'admin' ? null : req.currentUser.email;
            const summary = await activityLogger.getSummary(userEmail);
            
            res.json({ status: 'success', data: summary });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    const checkAndStartScheduledCampaigns = async () => {
        const campaigns = campaignManager.getAllCampaigns(null, true);
        const now = new Date();
        
        for (const campaign of campaigns) {
            if (campaign.status === 'scheduled' && campaign.scheduledAt) {
                const scheduledDate = new Date(campaign.scheduledAt);
                if (scheduledDate <= now) {
                    log(`Starting scheduled campaign: ${campaign.name}`, 'SYSTEM', { campaignId: campaign.id });
                    try {
                        await campaignSender.startCampaign(campaign.id);
                    } catch (error) {
                        log(`Failed to start scheduled campaign: ${campaign.name}`, 'SYSTEM', { campaignId: campaign.id, error: error.message }, 'ERROR');
                    }
                }
            }
        }
    };

    // Scheduled task to check campaigns every minute
    setInterval(checkAndStartScheduledCampaigns, 60 * 1000);

    router.get('/campaigns/csv-template', checkSessionOrTokenAuth, (req, res) => {
        const template = 'number,name,var1,var2\n+1234567890,John Doe,value1,value2';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="campaign_template.csv"');
        res.send(template);
    });

    router.get('/campaigns/check-scheduled', checkSessionOrTokenAuth, async (req, res) => {
        try {
            await checkAndStartScheduledCampaigns();
            res.json({ status: 'success', message: 'Checked and started scheduled campaigns' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });


    router.get('/campaigns/:id', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        const campaign = campaignManager.loadCampaign(req.params.id);
        if (!campaign) {
            return res.status(404).json({ status: 'error', message: 'Campaign not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && campaign.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        res.json(campaign);
    });

    router.post('/campaigns', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const campaignData = {
                ...req.body,
                createdBy: req.currentUser.email
            };

            const campaign = campaignManager.createCampaign(campaignData);
            res.status(201).json(campaign);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    router.put('/campaigns/:id', checkSessionOrTokenAuth, async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        try {
            const campaign = campaignManager.loadCampaign(req.params.id);
            if (!campaign) {
                return res.status(404).json({ status: 'error', message: 'Campaign not found' });
            }

            // Check access
            if (req.currentUser.role !== 'admin' && campaign.createdBy !== req.currentUser.email) {
                return res.status(403).json({ status: 'error', message: 'Access denied' });
            }

            const updated = campaignManager.updateCampaign(req.params.id, req.body);
            res.json(updated);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    router.delete('/campaigns/:id', checkSessionOrTokenAuth, async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        const campaign = campaignManager.loadCampaign(req.params.id);
        if (!campaign) {
            return res.status(404).json({ status: 'error', message: 'Campaign not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && campaign.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        const success = campaignManager.deleteCampaign(req.params.id);
        if (success) {
            res.json({ status: 'success', message: 'Campaign deleted' });
        } else {
            res.status(500).json({ status: 'error', message: 'Failed to delete campaign' });
        }
    });

    router.post('/campaigns/:id/clone', checkSessionOrTokenAuth, async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        try {
            const cloned = campaignManager.cloneCampaign(req.params.id, req.currentUser.email, req.body.name);
            res.status(201).json(cloned);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    router.post('/campaigns/:id/send', checkSessionOrTokenAuth, async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        const campaign = campaignManager.loadCampaign(req.params.id);
        if (!campaign) {
            return res.status(404).json({ status: 'error', message: 'Campaign not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && campaign.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        try {
            campaignSender.startCampaign(req.params.id);
            res.json({ status: 'success', message: 'Campaign started' });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    router.post('/campaigns/:id/pause', checkSessionOrTokenAuth, async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        const campaign = campaignManager.loadCampaign(req.params.id);
        if (!campaign) {
            return res.status(404).json({ status: 'error', message: 'Campaign not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && campaign.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        try {
            campaignSender.pauseCampaign(req.params.id);
            res.json({ status: 'success', message: 'Campaign paused' });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    router.post('/campaigns/:id/resume', checkSessionOrTokenAuth, async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        const campaign = campaignManager.loadCampaign(req.params.id);
        if (!campaign) {
            return res.status(404).json({ status: 'error', message: 'Campaign not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && campaign.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        try {
            campaignSender.resumeCampaign(req.params.id);
            res.json({ status: 'success', message: 'Campaign resumed' });
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    router.post('/campaigns/:id/retry', checkSessionOrTokenAuth, async (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        try {
            const result = await campaignSender.retryFailed(req.params.id, req.currentUser.email);
            res.json(result);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    router.get('/campaigns/:id/status', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        const status = campaignSender.getCampaignStatus(req.params.id);
        if (!status) {
            return res.status(404).json({ status: 'error', message: 'Campaign not found' });
        }
        res.json(status);
    });

    router.get('/campaigns/:id/export', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid campaign ID format' });
        }
        const campaign = campaignManager.loadCampaign(req.params.id);
        if (!campaign) {
            return res.status(404).json({ status: 'error', message: 'Campaign not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && campaign.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        const csv = campaignManager.exportResults(req.params.id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${campaign.name}_results.csv"`);
        res.send(csv);
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
            const validation = validateAIModel(req.body);
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
            // If api_key is empty in the request, it means we want to keep the existing one
            if (req.body.api_key === "" || req.body.api_key === undefined) {
                updatedData.api_key = existing.api_key;
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

    router.post('/campaigns/preview-csv', checkSessionOrTokenAuth, upload.single('file'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }

        try {
            const csvContent = fs.readFileSync(req.file.path, 'utf-8');
            const result = campaignManager.parseCSV(csvContent);

            // Clean up uploaded file
            fs.unlinkSync(req.file.path);

            res.json(result);
        } catch (error) {
            // Clean up uploaded file
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(400).json({ status: 'error', message: error.message });
        }
    });



    // Export the function for use by the main scheduler
    router.checkAndStartScheduledCampaigns = checkAndStartScheduledCampaigns;

    // Recipient List Management Endpoints (Session-based auth, not token-based)

    // Get all recipient lists
    router.get('/recipient-lists', checkSessionOrTokenAuth, (req, res) => {
        const lists = recipientListManager.getAllLists(
            req.currentUser.email,
            req.currentUser.role === 'admin'
        );
        res.json(lists);
    });

    // Get specific recipient list
    router.get('/recipient-lists/:id', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        const list = recipientListManager.loadList(req.params.id);
        if (!list) {
            return res.status(404).json({ status: 'error', message: 'Recipient list not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && list.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        res.json(list);
    });

    // Create new recipient list
    router.post('/recipient-lists', checkSessionOrTokenAuth, (req, res) => {
        try {
            const listData = {
                ...req.body,
                createdBy: req.currentUser.email
            };

            const list = recipientListManager.createList(listData);
            res.status(201).json(list);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    // Update recipient list
    router.put('/recipient-lists/:id', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        try {
            const list = recipientListManager.loadList(req.params.id);
            if (!list) {
                return res.status(404).json({ status: 'error', message: 'Recipient list not found' });
            }

            // Check access
            if (req.currentUser.role !== 'admin' && list.createdBy !== req.currentUser.email) {
                return res.status(403).json({ status: 'error', message: 'Access denied' });
            }

            const updated = recipientListManager.updateList(req.params.id, req.body);
            res.json(updated);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    // Delete recipient list
    router.delete('/recipient-lists/:id', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        const list = recipientListManager.loadList(req.params.id);
        if (!list) {
            return res.status(404).json({ status: 'error', message: 'Recipient list not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && list.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        const success = recipientListManager.deleteList(req.params.id);
        if (success) {
            res.json({ status: 'success', message: 'Recipient list deleted' });
        } else {
            res.status(500).json({ status: 'error', message: 'Failed to delete recipient list' });
        }
    });

    // Clone recipient list
    router.post('/recipient-lists/:id/clone', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        try {
            const cloned = recipientListManager.cloneList(req.params.id, req.currentUser.email, req.body.name);
            res.status(201).json(cloned);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    // Add recipient to list
    router.post('/recipient-lists/:id/recipients', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        try {
            const list = recipientListManager.loadList(req.params.id);
            if (!list) {
                return res.status(404).json({ status: 'error', message: 'Recipient list not found' });
            }

            // Check access
            if (req.currentUser.role !== 'admin' && list.createdBy !== req.currentUser.email) {
                return res.status(403).json({ status: 'error', message: 'Access denied' });
            }

            const updated = recipientListManager.addRecipient(req.params.id, req.body);
            res.status(201).json(updated);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    // Update recipient in list
    router.put('/recipient-lists/:id/recipients/:number', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        // Basic number format check (allow +, digits, and reasonable length)
        if (!/^\+?\d{5,15}$/.test(req.params.number)) {
            return res.status(400).json({ status: 'error', message: 'Invalid recipient number format' });
        }
        try {
            const list = recipientListManager.loadList(req.params.id);
            if (!list) {
                return res.status(404).json({ status: 'error', message: 'Recipient list not found' });
            }

            // Check access
            if (req.currentUser.role !== 'admin' && list.createdBy !== req.currentUser.email) {
                return res.status(403).json({ status: 'error', message: 'Access denied' });
            }

            const updated = recipientListManager.updateRecipient(req.params.id, req.params.number, req.body);
            res.json(updated);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    // Remove recipient from list
    router.delete('/recipient-lists/:id/recipients/:number', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        if (!/^\+?\d{5,15}$/.test(req.params.number)) {
            return res.status(400).json({ status: 'error', message: 'Invalid recipient number format' });
        }
        try {
            const list = recipientListManager.loadList(req.params.id);
            if (!list) {
                return res.status(404).json({ status: 'error', message: 'Recipient list not found' });
            }

            // Check access
            if (req.currentUser.role !== 'admin' && list.createdBy !== req.currentUser.email) {
                return res.status(403).json({ status: 'error', message: 'Access denied' });
            }

            const updated = recipientListManager.removeRecipient(req.params.id, req.params.number);
            res.json(updated);
        } catch (error) {
            res.status(400).json({ status: 'error', message: error.message });
        }
    });

    // Search recipients across all lists
    router.get('/recipient-lists/search/:query', checkSessionOrTokenAuth, (req, res) => {
        const results = recipientListManager.searchRecipients(
            req.params.query,
            req.currentUser.email,
            req.currentUser.role === 'admin'
        );
        res.json(results);
    });

    // Get recipient lists statistics
    router.get('/recipient-lists-stats', checkSessionOrTokenAuth, (req, res) => {
        const stats = recipientListManager.getStatistics(
            req.currentUser.email,
            req.currentUser.role === 'admin'
        );
        res.json(stats);
    });

    // Mark recipient list as used
    router.post('/recipient-lists/:id/mark-used', checkSessionOrTokenAuth, (req, res) => {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ status: 'error', message: 'Invalid list ID format' });
        }
        const list = recipientListManager.loadList(req.params.id);
        if (!list) {
            return res.status(404).json({ status: 'error', message: 'Recipient list not found' });
        }

        // Check access
        if (req.currentUser.role !== 'admin' && list.createdBy !== req.currentUser.email) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        recipientListManager.markAsUsed(req.params.id);
        res.json({ status: 'success', message: 'List marked as used' });
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
                } else if (userManager) {
                    const sessionOwner = userManager.getSessionOwner(sessionId);
                    if (sessionOwner && sessionOwner.email !== req.currentUser.email) {
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
            if (req.currentUser && activityLogger) {
                await activityLogger.logSessionDelete(
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

            const result = await sock.sendMessage(jid, message);
            
            if (!result) {
                throw new Error('Baileys a retourné un résultat vide');
            }

            // Log to activity log
            if (activityLogger) {
                const userEmail = req.currentUser ? req.currentUser.email : (req.session?.userEmail || 'api-key');
                
                await activityLogger.logMessageSend(
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
    router.post('/webhook', checkSessionOrTokenAuth, (req, res) => {
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
    router.get('/webhook', checkSessionOrTokenAuth, (req, res) => {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'sessionId is required.' });
        }
        const url = webhookUrls.get(sessionId) || null;
        res.status(200).json({ status: 'success', sessionId, url });
    });

    router.delete('/webhook', checkSessionOrTokenAuth, (req, res) => {
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

    // Main message sending endpoint
    router.post('/messages', checkSessionOrTokenAuth, async (req, res) => {
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

            try {
                let result;
                if (type === 'text') {
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
                results.push(result);
            } catch (error) {
                results.push({ status: 'error', message: error.message });
            }
        }

        res.json({ status: 'success', results });
    });

    return router;
}

module.exports = { initializeApi, getWebhookUrl };
