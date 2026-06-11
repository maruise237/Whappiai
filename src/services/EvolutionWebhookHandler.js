/**
 * Evolution Webhook Handler
 * Receives Evolution API events and forwards them to Whappi internal flows.
 *
 * - CONNECTION_UPDATE / QRCODE_UPDATED → update local session status
 * - MESSAGES_UPSERT                    → log + future dispatch
 * - SEND_MESSAGE                        → log + credit deduction
 *
 * The route is mounted by the API index. It must NOT require auth (Evolution
 * does not have a Whappi token) but it must validate a shared secret via header
 * if EVOLUTION_WEBHOOK_SECRET is set.
 */

const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const CreditService = require('./CreditService');
const ActivityLog = require('../models/ActivityLog');
const SessionService = require('./SessionService');
const wappy = require('./WappyEventBroadcaster');
const { log } = require('../utils/logger');

const router = express.Router();

function safeEquals(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

/**
 * Map an Evolution state string to Whappi's local status.
 */
function mapState(state) {
    if (!state) return 'UNKNOWN';
    const s = String(state).toLowerCase();
    if (s === 'open' || s === 'connected') return 'CONNECTED';
    if (s === 'close' || s === 'closed' || s === 'disconnected') return 'DISCONNECTED';
    if (s === 'connecting') return 'CONNECTING';
    if (s === 'refused') return 'REFUSED';
    return state.toUpperCase();
}

/**
 * Process SEND_MESSAGE webhook: log activity + deduct credits for the session owner.
 */
async function handleSendMessage(instanceName, data) {
    if (!instanceName) return;

    const sessionId = stripPrefix(instanceName, process.env.EVOLUTION_INSTANCE_PREFIX || '');
    const session = await Session.findById(sessionId);
    if (!session || !session.owner_email) {
        log('SEND_MESSAGE: no session owner found for ' + instanceName, 'WEBHOOK', { instanceName }, 'WARN');
        return;
    }

    // Log activity
    const jid = (data && data.key && data.key.remoteJid) || (data && data.to) || 'unknown';
    if (ActivityLog) {
        await ActivityLog.logMessageSend(
            session.owner_email,
            sessionId,
            jid,
            'text',
            null,
            'evolution-webhook'
        ).catch(() => {});
    }

    // Deduct credits
    try {
        const user = await User.findByEmail(session.owner_email);
        if (user && user.role !== 'admin') {
            await CreditService.deduct(user.id, 1, 'Envoi via Evolution API vers ' + jid);
        }
    } catch (err) {
        log('SEND_MESSAGE: credit deduction failed: ' + err.message, 'WEBHOOK', { instanceName, error: err.message }, 'ERROR');
    }
}

router.post('/webhooks/evolution', express.json({ limit: '5mb' }), async (req, res) => {
    log('Evolution webhook received', 'WEBHOOK', null, 'DEBUG');

    const event = req.body || {};
    const eventType = event.event || event.type || 'unknown';
    const instance = event.instance || (event.data && event.data.instance) || null;
    const instanceName = instance && instance.instanceName ? instance.instanceName : (typeof instance === 'string' ? instance : null);
    const data = event.data || {};

    log('Evolution webhook: ' + eventType + ' (' + (instanceName || 'n/a') + ')', 'WEBHOOK', { event: eventType, instanceName }, 'DEBUG');

    try {
        switch (eventType) {
            case 'CONNECTION_UPDATE':
            case 'connection.update': {
                if (!instanceName) break;
                const localId = SessionService.getProvider()._instanceName
                    ? stripPrefix(instanceName, process.env.EVOLUTION_INSTANCE_PREFIX || '')
                    : instanceName;
                const state = data.state || (data.connectionStatus);
                const mapped = mapState(state);
                const detail = data.statusReason || null;
                const qrOrCode = data.base64 || data.code || null;
                Session.updateStatus(localId, mapped, detail, null, qrOrCode);
                if (global._broadcastSessionUpdate) {
                    global._broadcastSessionUpdate(localId, mapped, detail, qrOrCode);
                }
                if (mapped === 'CONNECTED') {
                    wappy.sessionConnected(localId);
                } else if (mapped === 'DISCONNECTED') {
                    wappy.sessionDisconnected(localId);
                }
                break;
            }
            case 'QRCODE_UPDATED':
            case 'qrcode.updated': {
                if (!instanceName) break;
                const localId = stripPrefix(instanceName, process.env.EVOLUTION_INSTANCE_PREFIX || '');
                const qrOrCode = data.base64 || data.code || null;
                Session.updateStatus(localId, 'CONNECTING', 'QR updated', null, qrOrCode);
                if (global._broadcastSessionUpdate) {
                    global._broadcastSessionUpdate(localId, 'CONNECTING', 'QR updated', qrOrCode);
                }
                break;
            }
            case 'MESSAGES_UPSERT':
            case 'messages.upsert': {
                const messages = Array.isArray(data.messages) ? data.messages : (data.key ? [data] : []);
                for (const msg of messages) {
                    if (!msg.key || msg.key.fromMe || !instanceName) continue;
                    const groupJid = msg.key.remoteJid || '';
                    if (!groupJid.endsWith('@g.us')) continue;
                    const localId = stripPrefix(instanceName, process.env.EVOLUTION_INSTANCE_PREFIX || '');
                    const moderation = require('./moderation');
                    moderation.handleIncomingMessageProvider(localId, msg).catch(err => {
                        log('Moderation error for ' + localId + '/' + groupJid + ': ' + err.message, 'WEBHOOK', null, 'ERROR');
                    });
                }
                break;
            }
            case 'SEND_MESSAGE':
            case 'send.message': {
                log('Evolution send_message ack', 'WEBHOOK');
                await handleSendMessage(instanceName, data);
                break;
            }
            case 'GROUPS_UPSERT':
            case 'groups.upsert': {
                if (!instanceName) break;
                const localId = stripPrefix(instanceName, process.env.EVOLUTION_INSTANCE_PREFIX || '');
                const groupJid = data.groupJid || '';
                if (!groupJid.endsWith('@g.us')) break;
                const participants = Array.isArray(data.participants) ? data.participants : [];
                const action = data.action || '';
                if (action !== 'add' || participants.length === 0) break;
                const moderation = require('./moderation');
                moderation.handleParticipantUpdateProvider(localId, {
                    groupJid,
                    participants,
                    action
                }).catch(err => {
                    log('Welcome error for ' + localId + '/' + groupJid + ': ' + err.message, 'WEBHOOK', null, 'ERROR');
                });
                break;
            }
            default:
                break;
        }
    } catch (e) {
        log('Evolution webhook handler error: ' + e.message, 'WEBHOOK', null, 'ERROR');
        return res.status(500).json({ status: 'error', message: e.message });
    }

    res.json({ status: 'success' });
});

function stripPrefix(name, prefix) {
    if (prefix && name.startsWith(prefix + '-')) return name.slice(prefix.length + 1);
    return name;
}

module.exports = router;
