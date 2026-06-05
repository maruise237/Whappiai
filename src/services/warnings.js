/**
 * Warning counters for WhatsApp group members.
 */

const { db } = require('../config/database');

function formatPhone(userId) {
    return String(userId || '').split('@')[0];
}

function getRisk(count) {
    if (count >= 3) return 'high';
    if (count >= 2) return 'medium';
    return 'low';
}

function composeWarningMessage({ template, senderJid, currentCount, maxWarnings, reason }) {
    const phone = formatPhone(senderJid);
    const count = Number(currentCount) || 0;
    const max = Math.max(1, Number(maxWarnings) || 1);
    const remaining = Math.max(0, max - count);
    const base = template || '@{{name}} votre message a ete supprime: {{reason}}. Avertissement {{count}}/{{max}}. Il reste {{remaining}} avertissement(s) avant exclusion.';

    let message = base
        .replace(/{{name}}/g, phone)
        .replace(/{{count}}/g, String(count))
        .replace(/{{max}}/g, String(max))
        .replace(/{{remaining}}/g, String(remaining))
        .replace(/{{reason}}/g, reason || 'Regle du groupe');

    if (!message.includes(`${count}/${max}`)) {
        message = `${message} Avertissement ${count}/${max}.`;
    }

    if (!/avant exclusion/i.test(message)) {
        message = `${message} Il reste ${remaining} avertissement(s) avant exclusion.`;
    }

    return message;
}

function composeExclusionMessage({ senderJid, currentCount, maxWarnings, reason }) {
    const phone = formatPhone(senderJid);
    const count = Number(currentCount) || 0;
    const max = Math.max(1, Number(maxWarnings) || 1);
    const motif = reason || 'Regle du groupe';

    return `@${phone} a ete exclu du groupe. Motif: ${motif}. Total: ${count}/${max} avertissements recus.`;
}

function listByGroup(sessionId, groupId) {
    const rows = db.prepare(`
        SELECT user_id, count, last_warning_at
        FROM user_warnings
        WHERE session_id = ? AND group_id = ? AND count > 0
        ORDER BY count DESC, last_warning_at DESC
    `).all(sessionId, groupId);

    return rows.map(row => ({
        userId: row.user_id,
        phone: formatPhone(row.user_id),
        count: row.count || 0,
        lastWarningAt: row.last_warning_at,
        risk: getRisk(row.count || 0)
    }));
}

function resetMember(sessionId, groupId, userId) {
    return db.prepare(`
        DELETE FROM user_warnings
        WHERE session_id = ? AND group_id = ? AND user_id = ?
    `).run(sessionId, groupId, userId);
}

module.exports = {
    listByGroup,
    resetMember,
    composeWarningMessage,
    composeExclusionMessage
};
