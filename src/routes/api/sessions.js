/**
 * Session Management Routes
 * Handles session creation, listing, QR code, and basic operations.
 *
 * When WHATSAPP_PROVIDER=evolution (default), the create/qr/delete endpoints
 * delegate to Evolution API via SessionService. The legacy Baileys path is
 * still available when WHATSAPP_PROVIDER=baileys.
 */

const express = require('express');
const { isValidId, sanitizeId } = require('../../utils/validation');
const Session = require('../../models/Session');
const ActivityLog = require('../../models/ActivityLog');
const User = require('../../models/User');
const SessionService = require('../../services/SessionService');

const router = express.Router();

/**
 * Initialize session routes with dependencies
 */
function initializeSessionRoutes(routerInstance, dependencies) {
    const {
        checkSessionOrTokenAuth,
        ensureOwnership,
        log,
        sessionTokens,
        createSession,
        getSessionsDetails,
        triggerQR,
        userManager
    } = dependencies;

    // ------------------------------------------------------------------
    // POST /sessions  — create a new session
    // ------------------------------------------------------------------
    routerInstance.post('/sessions', checkSessionOrTokenAuth, async (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, body: req.body }, 'DEBUG');

        const { sessionId, phoneNumber } = req.body;
        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'sessionId is required' });
        }
        const sanitizedSessionId = sanitizeId(sessionId);
        if (!isValidId(sanitizedSessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }

        try {
            const creatorEmail = req.currentUser ? req.currentUser.email : null;
            let token = null;
            if (SessionService.isProviderActive()) {
                const session = await SessionService.createSessionProvider(
                    sanitizedSessionId,
                    creatorEmail,
                    phoneNumber || null
                );
                token = session ? session.token : null;
            } else {
                // Legacy Baileys path
                const result = await createSession(sanitizedSessionId, creatorEmail, phoneNumber);
                token = sessionTokens.get(sanitizedSessionId);
            }

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
                createdBy: req.currentUser ? req.currentUser.email : 'api-key',
                provider: process.env.WHATSAPP_PROVIDER || 'evolution'
            });
            res.status(201).json({
                status: 'success',
                message: `Session ${sanitizedSessionId} created.`,
                token,
                provider: process.env.WHATSAPP_PROVIDER || 'evolution'
            });
        } catch (error) {
            log('API error', 'SYSTEM', { event: 'api-error', error: error.message, endpoint: req.originalUrl });
            res.status(500).json({ status: 'error', message: `Failed to create session: ${error.message}` });
        }
    });

    // ------------------------------------------------------------------
    // GET /sessions  — list
    // ------------------------------------------------------------------
    routerInstance.get('/sessions', checkSessionOrTokenAuth, (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl }, 'DEBUG');
        const showAll = req.query.all === 'true' && req.currentUser.role === 'admin';
        res.status(200).json(getSessionsDetails(req.currentUser.email, showAll));
    });

    // ------------------------------------------------------------------
    // POST /sessions/:id/mark-used
    // ------------------------------------------------------------------
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

    // ------------------------------------------------------------------
    // GET /sessions/:id/qr  — refresh the QR / pairing code via provider
    // ------------------------------------------------------------------
    routerInstance.get('/sessions/:sessionId/qr', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }
        try {
            if (SessionService.isProviderActive()) {
                const r = await SessionService.getQrProvider(sessionId);
                if (!r.ok) {
                    return res.status(502).json({ status: 'error', message: r.error || 'Provider error' });
                }
                return res.json({ status: 'success', ...r.qr });
            }
            // Legacy Baileys fallback
            if (triggerQR) {
                const ok = await triggerQR(sessionId);
                if (ok) return res.json({ status: 'success', message: 'QR generation triggered' });
                return res.status(404).json({ status: 'error', message: 'Session not found' });
            }
            return res.status(501).json({ status: 'error', message: 'QR trigger not implemented' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // ------------------------------------------------------------------
    // POST /sessions/:id/pairing-code  — request a pairing code by phone
    // ------------------------------------------------------------------
    routerInstance.post('/sessions/:sessionId/pairing-code', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        const { phoneNumber } = req.body || {};
        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }
        if (!phoneNumber || !/^\d{6,}$/.test(String(phoneNumber).replace(/\D+/g, ''))) {
            return res.status(400).json({ status: 'error', message: 'phoneNumber is required (digits only)' });
        }
        if (!SessionService.isProviderActive()) {
            return res.status(501).json({ status: 'error', message: 'Pairing code requires WHATSAPP_PROVIDER=evolution' });
        }
        try {
            // Recreate the instance with a phone number so Evolution issues a
            // pairing code. We do this in two steps to keep the existing
            // session id and metadata.
            const provider = SessionService.getProvider();
            await provider.deleteInstance(sessionId);
            const created = await provider.createInstance(sessionId, { phoneNumber });
            if (!created.ok) {
                return res.status(502).json({ status: 'error', message: created.error || 'Provider error' });
            }
            const r = await provider.getQr(sessionId);
            const pairing = r && r.qr ? r.qr.pairingCode : null;
            Session.updateStatus(sessionId, 'CONNECTING', 'Pairing code issued', pairing || undefined, (r && r.qr && (r.qr.base64 || r.qr.code)) || undefined);
            return res.json({ status: 'success', pairingCode: pairing });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // ------------------------------------------------------------------
    // GET /sessions/:id/status  — connection status from the provider
    // ------------------------------------------------------------------
    routerInstance.get('/sessions/:sessionId/status', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }
        if (!SessionService.isProviderActive()) {
            return res.json({ status: 'success', state: 'legacy' });
        }
        const r = await SessionService.getStatusProvider(sessionId);
        if (!r.ok) {
            return res.status(502).json({ status: 'error', message: r.error || 'Provider error' });
        }
        return res.json({ status: 'success', state: r.state, phoneNumber: r.phoneNumber || null });
    });

    // ------------------------------------------------------------------
    // DELETE /sessions/:id
    // ------------------------------------------------------------------
    routerInstance.delete('/sessions/:sessionId', checkSessionOrTokenAuth, async (req, res) => {
        const { sessionId } = req.params;
        if (!isValidId(sessionId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
        }
        try {
            if (req.currentUser.role !== 'admin') {
                const sessionOwner = userManager
                    ? userManager.getSessionOwner(sessionId)
                    : { email: Session.findById(sessionId)?.owner_email };
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

            // Tell the provider to drop the instance (Evolution).
            if (SessionService.isProviderActive()) {
                try {
                    await SessionService.deleteSessionProvider(sessionId);
                } catch (e) {
                    log(`Provider delete failed for ${sessionId}: ${e.message}`, 'SESSION', null, 'WARN');
                }
            }

            const db = require('../../config/database').db;
            db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

            const sessions = dependencies.sessions;
            if (sessions && sessions.delete) {
                sessions.delete(sessionId);
            }
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
