const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');

const db = require('../db/query');
const response = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { requireClerkAuth, requireAdmin } = require('../middleware/auth');
const { ensureSupportSchema } = require('../services/supportSchema');
const {
    sanitizePlainText,
    validateSupportCategory,
    validateSupportStatus,
    validateSupportPriority,
    isValidId,
} = require('../utils/validation');
const { log } = require('../utils/logger');
const ActivityLog = require('../models/ActivityLog');

const router = express.Router();

const createThreadLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { status: 'error', message: 'Trop de nouvelles demandes support. Reessayez dans quelques minutes.' },
});

const addMessageLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { status: 'error', message: 'Trop de messages envoyes en peu de temps. Reessayez plus tard.' },
});

function normalizeSupportThread(row) {
    return {
        id: row.id,
        ticketCode: row.ticket_code,
        userId: row.user_id,
        userEmail: row.user_email,
        subject: row.subject,
        category: row.category,
        status: row.status,
        priority: row.priority,
        paymentOrderId: row.payment_order_id || null,
        paymentReference: row.payment_reference || null,
        lastMessagePreview: row.last_message_preview || '',
        adminUnreadCount: Number(row.admin_unread_count || 0),
        userUnreadCount: Number(row.user_unread_count || 0),
        lastReplyBy: row.last_reply_by || 'user',
        lastMessageAt: row.last_message_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        paymentStatus: row.payment_status || null,
        paymentAmount: row.payment_amount !== undefined && row.payment_amount !== null ? Number(row.payment_amount) : null,
        paymentCurrency: row.payment_currency || null,
        planName: row.plan_name || null,
    };
}

function normalizeSupportMessage(row) {
    return {
        id: row.id,
        threadId: row.thread_id,
        authorUserId: row.author_user_id || null,
        authorEmail: row.author_email || null,
        authorRole: row.author_role,
        message: row.message,
        createdAt: row.created_at,
    };
}

async function getThreadForActor(threadId, actor, adminOverride = false) {
    await ensureSupportSchema();

    let sql = `
        SELECT t.*, p.status AS payment_status, p.amount AS payment_amount, p.currency AS payment_currency, pl.name AS plan_name
        FROM support_threads t
        LEFT JOIN payment_transactions p ON p.id = t.payment_order_id
        LEFT JOIN pricing_plans pl ON pl.id = p.plan_id
        WHERE t.id = $1
    `;
    const params = [threadId];

    if (!adminOverride) {
        sql += ' AND t.user_id = $2';
        params.push(actor.id);
    }

    return db.get(sql, params);
}

async function updateUnreadCounters(threadId, authorRole) {
    if (authorRole === 'admin') {
        await db.run(`
            UPDATE support_threads
            SET user_unread_count = user_unread_count + 1,
                admin_unread_count = 0,
                last_reply_by = 'admin',
                updated_at = CURRENT_TIMESTAMP,
                last_message_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [threadId]);
        return;
    }

    await db.run(`
        UPDATE support_threads
        SET admin_unread_count = admin_unread_count + 1,
            user_unread_count = 0,
            last_reply_by = 'user',
            updated_at = CURRENT_TIMESTAMP,
            last_message_at = CURRENT_TIMESTAMP
        WHERE id = $1
    `, [threadId]);
}

function buildTicketCode() {
    return `SUP-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

router.get('/threads', requireClerkAuth, asyncHandler(async (req, res) => {
    await ensureSupportSchema();

    const rows = await db.all(`
        SELECT t.*, p.status AS payment_status, p.amount AS payment_amount, p.currency AS payment_currency, pl.name AS plan_name
        FROM support_threads t
        LEFT JOIN payment_transactions p ON p.id = t.payment_order_id
        LEFT JOIN pricing_plans pl ON pl.id = p.plan_id
        WHERE t.user_id = $1
        ORDER BY t.last_message_at DESC
    `, [req.currentUser.id]);

    return response.success(res, rows.map(normalizeSupportThread));
}));

router.post('/threads', requireClerkAuth, createThreadLimiter, asyncHandler(async (req, res) => {
    await ensureSupportSchema();

    const subject = sanitizePlainText(req.body?.subject, { maxLength: 140, multiline: false });
    const message = sanitizePlainText(req.body?.message, { maxLength: 4000, multiline: true });
    const category = String(req.body?.category || 'general').toLowerCase();
    const paymentOrderId = sanitizePlainText(req.body?.paymentOrderId, { maxLength: 80, multiline: false }) || null;
    const paymentReference = sanitizePlainText(req.body?.paymentReference, { maxLength: 120, multiline: false }) || null;

    if (subject.length < 4) {
        return response.error(res, 'Sujet trop court', 422);
    }
    if (message.length < 10) {
        return response.error(res, 'Message trop court', 422);
    }
    if (!validateSupportCategory(category)) {
        return response.error(res, 'Categorie support invalide', 422);
    }

    if (paymentOrderId && !isValidId(paymentOrderId.replace(/[^a-zA-Z0-9_-]/g, ''))) {
        // Accept UUID-like IDs while rejecting arbitrary payloads.
        const normalized = paymentOrderId.replace(/[^a-zA-Z0-9-]/g, '');
        if (!/^[a-zA-Z0-9-]{8,80}$/.test(normalized)) {
            return response.error(res, 'Reference paiement invalide', 422);
        }
    }

    const threadId = crypto.randomUUID();
    const messageId = crypto.randomUUID();
    const ticketCode = buildTicketCode();

    await db.run(`
        INSERT INTO support_threads (
            id, ticket_code, user_id, user_email, subject, category, status, priority,
            payment_order_id, payment_reference, last_message_preview, admin_unread_count,
            user_unread_count, last_reply_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'open', 'normal', $7, $8, $9, 1, 0, 'user')
    `, [
        threadId,
        ticketCode,
        req.currentUser.id,
        req.currentUser.email,
        subject,
        category,
        paymentOrderId,
        paymentReference,
        message.slice(0, 180),
    ]);

    await db.run(`
        INSERT INTO support_messages (
            id, thread_id, author_user_id, author_email, author_role, message
        )
        VALUES ($1, $2, $3, $4, 'user', $5)
    `, [
        messageId,
        threadId,
        req.currentUser.id,
        req.currentUser.email,
        message,
    ]);

    await ActivityLog.log({
        userEmail: req.currentUser.email,
        action: 'SUPPORT_THREAD_CREATED',
        resource: 'support',
        resourceId: threadId,
        details: { category, ticketCode, paymentOrderId, paymentReference },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    const created = await getThreadForActor(threadId, req.currentUser);
    return response.success(res, normalizeSupportThread(created), 201);
}));

router.get('/threads/:threadId', requireClerkAuth, asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const isAdmin = req.currentUser.role === 'admin';
    const thread = await getThreadForActor(threadId, req.currentUser, isAdmin);

    if (!thread) {
        return response.notFound(res, 'Conversation support introuvable');
    }

    const messages = await db.all(`
        SELECT * FROM support_messages
        WHERE thread_id = $1
        ORDER BY created_at ASC
    `, [threadId]);

    if (isAdmin) {
        await db.run(`
            UPDATE support_threads
            SET admin_unread_count = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [threadId]);
    } else {
        await db.run(`
            UPDATE support_threads
            SET user_unread_count = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [threadId]);
    }

    return response.success(res, {
        thread: normalizeSupportThread(thread),
        messages: messages.map(normalizeSupportMessage),
    });
}));

router.post('/threads/:threadId/messages', requireClerkAuth, addMessageLimiter, asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const message = sanitizePlainText(req.body?.message, { maxLength: 4000, multiline: true });

    if (message.length < 2) {
        return response.error(res, 'Message trop court', 422);
    }

    const isAdmin = req.currentUser.role === 'admin';
    const thread = await getThreadForActor(threadId, req.currentUser, isAdmin);
    if (!thread) {
        return response.notFound(res, 'Conversation support introuvable');
    }

    const statusOverride = req.body?.status ? String(req.body.status).toLowerCase() : null;
    if (statusOverride && (!isAdmin || !validateSupportStatus(statusOverride))) {
        return response.error(res, 'Statut support invalide', 422);
    }

    const priorityOverride = req.body?.priority ? String(req.body.priority).toLowerCase() : null;
    if (priorityOverride && (!isAdmin || !validateSupportPriority(priorityOverride))) {
        return response.error(res, 'Priorite support invalide', 422);
    }

    const messageId = crypto.randomUUID();
    const authorRole = isAdmin ? 'admin' : 'user';

    await db.run(`
        INSERT INTO support_messages (
            id, thread_id, author_user_id, author_email, author_role, message
        )
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        messageId,
        threadId,
        req.currentUser.id,
        req.currentUser.email,
        authorRole,
        message,
    ]);

    await db.run(`
        UPDATE support_threads
        SET last_message_preview = $1,
            updated_at = CURRENT_TIMESTAMP,
            ${statusOverride ? 'status = $2,' : ''}
            ${priorityOverride ? `priority = $${statusOverride ? '3' : '2'},` : ''}
            last_message_at = CURRENT_TIMESTAMP
        WHERE id = $${1 + (statusOverride ? 2 : 1) + (priorityOverride ? 1 : 0)}
    `, [
        message.slice(0, 180),
        ...(statusOverride ? [statusOverride] : []),
        ...(priorityOverride ? [priorityOverride] : []),
        threadId,
    ]);

    await updateUnreadCounters(threadId, authorRole);

    await ActivityLog.log({
        userEmail: req.currentUser.email,
        action: authorRole === 'admin' ? 'SUPPORT_REPLY_SENT' : 'SUPPORT_MESSAGE_SENT',
        resource: 'support',
        resourceId: threadId,
        details: { authorRole, statusOverride, priorityOverride },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    const created = await db.get('SELECT * FROM support_messages WHERE id = $1', [messageId]);
    return response.success(res, normalizeSupportMessage(created), 201);
}));

router.put('/threads/:threadId/status', requireAdmin, asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const status = String(req.body?.status || '').toLowerCase();
    const priority = req.body?.priority ? String(req.body.priority).toLowerCase() : null;

    if (!validateSupportStatus(status)) {
        return response.error(res, 'Statut support invalide', 422);
    }
    if (priority && !validateSupportPriority(priority)) {
        return response.error(res, 'Priorite support invalide', 422);
    }

    const existing = await getThreadForActor(threadId, req.currentUser, true);
    if (!existing) {
        return response.notFound(res, 'Conversation support introuvable');
    }

    await db.run(`
        UPDATE support_threads
        SET status = $1,
            priority = COALESCE($2, priority),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
    `, [status, priority, threadId]);

    await ActivityLog.log({
        userEmail: req.currentUser.email,
        action: 'SUPPORT_THREAD_UPDATED',
        resource: 'support',
        resourceId: threadId,
        details: { status, priority },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    const updated = await getThreadForActor(threadId, req.currentUser, true);
    return response.success(res, normalizeSupportThread(updated));
}));

router.get('/admin/threads', requireAdmin, asyncHandler(async (req, res) => {
    await ensureSupportSchema();

    const status = req.query?.status ? String(req.query.status).toLowerCase() : null;
    const category = req.query?.category ? String(req.query.category).toLowerCase() : null;
    const search = sanitizePlainText(req.query?.q, { maxLength: 100, multiline: false });

    const conditions = [];
    const params = [];

    if (status && validateSupportStatus(status)) {
        params.push(status);
        conditions.push(`t.status = $${params.length}`);
    }
    if (category && validateSupportCategory(category)) {
        params.push(category);
        conditions.push(`t.category = $${params.length}`);
    }
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        conditions.push(`(LOWER(t.subject) LIKE $${params.length} OR LOWER(t.user_email) LIKE $${params.length} OR LOWER(COALESCE(t.last_message_preview, '')) LIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db.all(`
        SELECT t.*, p.status AS payment_status, p.amount AS payment_amount, p.currency AS payment_currency, pl.name AS plan_name
        FROM support_threads t
        LEFT JOIN payment_transactions p ON p.id = t.payment_order_id
        LEFT JOIN pricing_plans pl ON pl.id = p.plan_id
        ${whereClause}
        ORDER BY
            CASE t.priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                ELSE 4
            END,
            t.last_message_at DESC
        LIMIT 200
    `, params);

    return response.success(res, rows.map(normalizeSupportThread));
}));

router.get('/admin/transactions', requireAdmin, asyncHandler(async (req, res) => {
    await ensureSupportSchema();

    const status = req.query?.status ? String(req.query.status).toLowerCase() : null;
    const search = sanitizePlainText(req.query?.q, { maxLength: 100, multiline: false });
    const conditions = [];
    const params = [];

    if (status) {
        params.push(status);
        conditions.push(`LOWER(t.status) = $${params.length}`);
    }
    if (search) {
        params.push(`%${search.toLowerCase()}%`);
        conditions.push(`(
            LOWER(COALESCE(u.email, '')) LIKE $${params.length}
            OR LOWER(COALESCE(t.id, '')) LIKE $${params.length}
            OR LOWER(COALESCE(t.provider_token, '')) LIKE $${params.length}
            OR LOWER(COALESCE(pl.name, '')) LIKE $${params.length}
        )`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await db.all(`
        SELECT
            t.id,
            t.provider,
            t.provider_token,
            t.user_id,
            COALESCE(
                u.email,
                (
                    SELECT st3.user_email
                    FROM support_threads st3
                    WHERE st3.payment_order_id = t.id
                       OR (st3.payment_reference IS NOT NULL AND st3.payment_reference = t.provider_token)
                    ORDER BY st3.last_message_at DESC
                    LIMIT 1
                )
            ) AS user_email,
            t.plan_id,
            pl.code AS plan_code,
            pl.name AS plan_name,
            t.amount,
            t.currency,
            t.status,
            t.checkout_url,
            t.created_at,
            t.updated_at,
            (
                SELECT COUNT(*)
                FROM support_threads st2
                WHERE st2.payment_order_id = t.id
                   OR (st2.payment_reference IS NOT NULL AND st2.payment_reference = t.provider_token)
            ) AS related_threads
        FROM payment_transactions t
        LEFT JOIN users u ON u.id = t.user_id
        LEFT JOIN pricing_plans pl ON pl.id = t.plan_id
        ${whereClause}
        ORDER BY t.updated_at DESC
        LIMIT 200
    `, params);

    return response.success(res, rows.map(row => ({
        id: row.id,
        provider: row.provider,
        reference: row.provider_token || null,
        userId: row.user_id || null,
        userEmail: row.user_email || null,
        planId: row.plan_id || null,
        planCode: row.plan_code || null,
        planName: row.plan_name || null,
        amount: row.amount !== null && row.amount !== undefined ? Number(row.amount) : 0,
        currency: row.currency || 'XOF',
        status: row.status || 'unknown',
        checkoutUrl: row.checkout_url || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        relatedThreads: Number(row.related_threads || 0),
    })));
}));

router.use((err, req, res, next) => {
    if (err) {
        log(`Support route error: ${err.message}`, 'SUPPORT', { path: req.originalUrl }, 'ERROR');
    }
    next(err);
});

module.exports = router;
