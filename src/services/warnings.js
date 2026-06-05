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

module.exports = {
    listByGroup
};
