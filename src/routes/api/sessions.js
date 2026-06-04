/**
 * Session Management Routes
 * Handles session creation, listing, QR code, and basic operations
 */

const express = require('express');
const { isValidId, sanitizeId } = require('../../utils/validation');
const Session = require('../../models/Session');
const ActivityLog = require('../../models/ActivityLog');
const User = require('../../models/User');

const router = express.Router();

/**
 * Initialize session routes with dependencies
 */
function initializeSessionRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, ensureOwnership, log, sessionTokens, createSession, getSessionsDetails, triggerQR, userManager } = dependencies;

    // Create new session
    routerInstance.post('/sessions', checkSessionOrTokenAuth, async (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, body: req.body });

        const { sessionId, phoneNumber } = req.body;
        if (!sessionId) {
            log('API error', 'SYSTEM', { event: 'api-error', error: 'sessionId is required', endpoint: req.originalUrl });
            return res.status(400).json({ status: 'error', message: 'sessionId is required' });
        }

        const sanitizedSessionId = sanitizeId(sessionId);

        if (!isValidId(sanitizedSessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        try {
            const creatorEmail = req.currentUser ? req.currentUser.email : null;
            await createSession(sanitizedSessionId, creatorEmail, phoneNumber);
            const token = sessionTokens.get(sanitizedSessionId);

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
            res.status(201).json({ status: 'success', message: `Session ${sanitizedSessionId} created.`, token });
        } catch (error) {
            log('API error', 'SYSTEM', { event: 'api-error', error: error.message, endpoint: req.originalUrl });
            res.status(500).json({ status: 'error', message: `Failed to create session: ${error.message}` });
        }
    });

    // List sessions
    routerInstance.get('/sessions', checkSessionOrTokenAuth, (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl });

        const showAll = req.query.all === 'true' && req.currentUser.role === 'admin';
        res.status(200).json(getSessionsDetails(req.currentUser.email, showAll));
    });

    // Mark session as used
    routerInstance.post('/sessions/:sessionId/mark-used', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
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

    // Trigger QR code generation
    routerInstance.get('/sessions/:sessionId/qr', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
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

    // Delete session
    routerInstance.delete('/sessions/:sessionId', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId } = req.params;
        
        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        try {
            // Check ownership unless admin
            if (req.currentUser.role !== 'admin') {
                const sessionOwner = userManager ? userManager.getSessionOwner(sessionId) : { email: Session.findById(sessionId)?.owner_email };
                if (!sessionOwner || !sessionOwner.email) {
                    return res.status(404).json({ status: 'error', message: 'Session not found' });
                }

                const ownerEmail = (sessionOwner.email || '').toLowerCase().trim();
                const currentEmail = (req.currentUser.email || '').toLowerCase().trim();

                if (ownerEmail !== currentEmail) {
                    return res.status(403).json({ status: 'error', message: 'Access denied: You do not own this session' });
                }
            }

            const session = Session.findById(sessionId);
            if (!session) {
                return res.status(404).json({ status: 'error', message: 'Session not found' });
            }

            // Delete from database
            const db = require('../../config/database').db;
            db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

            // Clean up in-memory sessions
            const sessions = dependencies.sessions;
            if (sessions && sessions.delete) {
                sessions.delete(sessionId);
            }

            // Clean up tokens
            if (sessionTokens && sessionTokens.delete) {
                sessionTokens.delete(sessionId);
            }

            log(`Session ${sessionId} deleted by ${req.currentUser.email}`, 'SESSION');

            res.json({ status: 'success', message: 'Session deleted successfully' });
        } catch (err) {
            log(`Error deleting session ${sessionId}: ${err.message}`, 'SYSTEM', null, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });
}

module.exports = initializeSessionRoutes;
