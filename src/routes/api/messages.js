/**
 * Messages Routes
 * Handles message sending endpoints with credit management
 */

const CreditService = require('../../services/CreditService');
const { enqueue } = require('../../services/QueueService');
const ActivityLog = require('../../models/ActivityLog');
const SessionService = require('../../services/SessionService');
const { normalizeJid } = require('../../utils/phone');

/**
 * Initialize message routes with dependencies
 */
function initializeMessageRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, ensureOwnership, log, sessions } = dependencies;

    // Helper function to send a message
    async function sendMessage(sock, to, message, sessionId, req) {
        try {
            const jid = normalizeJid(to);

            if (!jid) {
                throw new Error(`Invalid JID: ${to}`);
            }

            log(`[API] Tentative d'envoi de message vers ${jid}`, 'SYSTEM', { to: jid }, 'DEBUG');
            log(`[API] Structure du message: ${JSON.stringify(message)}`, 'SYSTEM', { message }, 'DEBUG');

            let result;
            if (SessionService.isProviderActive()) {
                // Evolution adapter: for now we support text sends directly.
                if (!message || typeof message.text !== 'string') {
                    throw new Error('Only text messages are supported in Evolution mode for this route version');
                }
                const providerResult = await SessionService.sendTextMessageProvider(sessionId, jid, message.text);
                if (!providerResult.ok) {
                    throw new Error(providerResult.error || 'Provider send failed');
                }
                result = { key: { id: providerResult.messageId || `evo-${Date.now()}` } };
            } else {
                result = await enqueue(sessionId, sock, jid, message, {
                    priority: 'high'
                });
            }

            if (!result) {
                throw new Error('Message provider returned an empty result');
            }

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
            const errorDetail = error.stack || error.message;
            return {
                status: 'error',
                message: `Failed to send message to ${to}. Reason: ${error.message}`,
                detail: errorDetail
            };
        }
    }

    // Main message sending endpoint
    routerInstance.post('/messages', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        log('API request', 'SYSTEM', { event: 'api-request', method: req.method, endpoint: req.originalUrl, query: req.query }, 'DEBUG');
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

        if (SessionService.isProviderActive()) {
            // In Evolution mode we trust the provider-managed lifecycle. The local
            // session row can be CONNECTING while messages are already accepted.
            if (!session) {
                return res.status(404).json({
                    status: 'error',
                    message: `Session ${sessionId} not found.`,
                    detail: 'Session does not exist'
                });
            }
        } else if (!session || !session.sock || session.status !== 'CONNECTED') {
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

        for (const msg of messages) {
            const { to, type, text } = msg;
            const msgImage = msg.image;
            const msgDocument = msg.document;
            const msgAudio = msg.audio;
            const msgVideo = msg.video;

            if (!to || !type) {
                results.push({ status: 'error', message: 'Recipient (to) and type are required' });
                continue;
            }

            let creditDeducted = false;
            const isAdmin = req.currentUser.role === 'admin';

            if (!isAdmin) {
                if (!req.currentUser.id) {
                    results.push({ status: 'error', message: 'User account required for credit deduction.' });
                    continue;
                }

                try {
                    const hasCredit = await CreditService.deduct(req.currentUser.id, 1, `Envoi message vers ${to}`);

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
                    await CreditService.add(req.currentUser.id, 1, 'credit', `Remboursement: échec envoi vers ${to}`);
                }

                results.push(result);
            } catch (error) {
                if (creditDeducted) {
                    await CreditService.add(req.currentUser.id, 1, 'credit', `Remboursement: erreur système vers ${to}`);
                }
                results.push({ status: 'error', message: error.message });
            }
        }

        res.json({ status: 'success', results });
    });
}

module.exports = initializeMessageRoutes;
