/**
 * Warning counters for WhatsApp group members.
 */

const db = require('../db/query');

function formatPhone(userId) {
    return String(userId || '').split('@')[0];
}

function getRisk(count) {
    if (count >= 3) return 'high';
    if (count >= 2) return 'medium';
    return 'low';
}

function composeWarningMessage({ template, senderJid, currentCount, maxWarnings, reason, autoKickEnabled = false }) {
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

    // Si l'exclusion auto est desactivee, retirer toute mention de "avant exclusion" du message
    if (!autoKickEnabled) {
        message = message.replace(/\.?\s*Il reste \d+ avertissement\(s\)? avant exclusion\.?\s*/gi, '').trim();
        // Nettoyer les doubles points
        message = message.replace(/\.\./g, '.').replace(/\s*\.\s*$/, '.');
    } else {
        // Corriger le pluriel : "1 avertissements" -> "1 avertissement", "3 avertissement" -> "3 avertissements"
        // Doit aussi capturer le (s) residuel des templates
        message = message.replace(
            new RegExp(`Il reste ${remaining} avertissement\\(?\\)?s?\\(?s?\\)?`, 'i'),
            `Il reste ${remaining} avertissement${remaining > 1 ? 's' : ''}`
        );
    }

    if (!message.includes(`${count}/${max}`)) {
        message = `${message} Avertissement ${count}/${max}.`;
    }

    if (autoKickEnabled && !/avant exclusion/i.test(message)) {
        message = `${message} Il reste ${remaining} avertissement${remaining > 1 ? 's' : ''} avant exclusion.`;
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

async function listByGroup(sessionId, groupId) {
    const rows = await db.all(`
        SELECT user_id, count, last_warning_at
        FROM user_warnings
        WHERE session_id = $1 AND group_id = $2 AND count > 0
        ORDER BY count DESC, last_warning_at DESC
    `, [sessionId, groupId]);

    return rows.map(row => ({
        userId: row.user_id,
        phone: formatPhone(row.user_id),
        count: row.count || 0,
        lastWarningAt: row.last_warning_at,
        risk: getRisk(row.count || 0)
    }));
}

async function resetMember(sessionId, groupId, userId) {
    const result = await db.run(`
        DELETE FROM user_warnings
        WHERE session_id = $1 AND group_id = $2 AND user_id = $3
    `, [sessionId, groupId, userId]);
    return result;
}

module.exports = {
    listByGroup,
    resetMember,
    composeWarningMessage,
    composeExclusionMessage
};
