/**
 * Notifications & Media Routes
 * Handles notifications and media upload endpoints
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

/**
 * Initialize notifications and media routes with dependencies
 */
function initializeNotificationsRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, ensureOwnership, log } = dependencies;

    // Get notifications
    routerInstance.get('/notifications', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const NotificationService = require('../../services/NotificationService');
            const unreadOnly = req.query.unread === 'true';
            const notifications = NotificationService.getUserNotifications(req.currentUser.id, unreadOnly);
            res.json({ status: 'success', data: notifications });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Mark notification as read
    routerInstance.put('/notifications/:id/read', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const NotificationService = require('../../services/NotificationService');
            NotificationService.markAsRead(req.params.id, req.currentUser.id);
            res.json({ status: 'success', message: 'Marqué comme lu' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Mark all notifications as read
    routerInstance.put('/notifications/read-all', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const NotificationService = require('../../services/NotificationService');
            NotificationService.markAllAsRead(req.currentUser.id);
            res.json({ status: 'success', message: 'Tout a été marqué comme lu' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Legacy webhook endpoints (kept for backward compatibility)
    routerInstance.post('/webhook', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, body: req.body }, 'DEBUG');
        const { url, sessionId } = req.body;
        if (!url || !sessionId) {
            log('API error', 'SYSTEM', { event: 'api-error', error: 'URL and sessionId are required.', endpoint: req.originalUrl });
            return res.status(400).json({ status: 'error', message: 'URL and sessionId are required.' });
        }
        dependencies.webhookUrls.set(sessionId, url);
        log('Webhook URL updated', url, { event: 'webhook-updated', sessionId, url });
        res.status(200).json({ status: 'success', message: `Webhook URL for session ${sessionId} updated to ${url}` });
    });

    routerInstance.get('/webhook', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'sessionId is required.' });
        }
        const url = dependencies.webhookUrls.get(sessionId) || null;
        res.status(200).json({ status: 'success', sessionId, url });
    });

    routerInstance.delete('/webhook', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ status: 'error', message: 'sessionId is required.' });
        }
        dependencies.webhookUrls.delete(sessionId);
        log('Webhook URL deleted', '', { event: 'webhook-deleted', sessionId });
        res.status(200).json({ status: 'success', message: `Webhook for session ${sessionId} deleted.` });
    });

    // Media upload endpoint
    routerInstance.post('/media', checkSessionOrTokenAuth, dependencies.upload.single('file'), (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, body: req.body }, 'DEBUG');
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
}

module.exports = initializeNotificationsRoutes;
