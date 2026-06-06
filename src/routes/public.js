/**
 * Public API Routes
 * Endpoints that don't require authentication
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

/**
 * Auto-check and apply scheduled maintenance window.
 * Called on every /maintenance/status request so activation/deactivation
 * is instant (no need to wait for the 30s cron tick).
 */
function applySchedule(settings) {
    if (!settings) return;

    const now = new Date().toISOString();

    // Scheduled start reached but not yet active → activate
    if (!settings.enabled && settings.scheduled_start_at && settings.scheduled_start_at <= now) {
        if (settings.scheduled_end_at && settings.scheduled_end_at <= now) {
            // Window already fully passed — clear schedule
            db.prepare(`
                UPDATE maintenance_settings SET
                    scheduled_start_at = NULL,
                    scheduled_end_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `).run();
            require('../utils/logger').log('Maintenance schedule expired (API trigger), cleared', 'SYSTEM');
            return;
        }
        // Activate
        db.prepare(`
            UPDATE maintenance_settings SET
                enabled = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run();
        require('../utils/logger').log('Maintenance auto-activated from schedule (API trigger)', 'SYSTEM');
        return;
    }

    // Scheduled end reached while active → deactivate
    if (settings.enabled && settings.scheduled_end_at && settings.scheduled_end_at <= now) {
        db.prepare(`
            UPDATE maintenance_settings SET
                enabled = 0,
                scheduled_start_at = NULL,
                scheduled_end_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run();
        require('../utils/logger').log('Maintenance auto-deactivated: end time reached (API trigger)', 'SYSTEM');
    }
}

/**
 * GET /api/v1/maintenance/status
 * Public maintenance status — used by frontend to show maintenance overlay
 * Also auto-applies scheduled windows on each call.
 */
router.get('/maintenance/status', (req, res) => {
    try {
        let settings = db.prepare(
            'SELECT enabled, title, message, icon, scheduled_start_at, scheduled_end_at FROM maintenance_settings WHERE id = 1'
        ).get();

        // Apply schedule if needed (re-read after to get updated state)
        applySchedule(settings);
        settings = db.prepare(
            'SELECT enabled, title, message, icon, scheduled_start_at, scheduled_end_at FROM maintenance_settings WHERE id = 1'
        ).get();

        if (!settings) {
            return res.json({ status: 'success', data: { active: false } });
        }

        return res.json({
            status: 'success',
            data: {
                active: settings.enabled === 1,
                title: settings.title,
                message: settings.message,
                icon: settings.icon,
                scheduled_start_at: settings.scheduled_start_at,
                scheduled_end_at: settings.scheduled_end_at
            }
        });
    } catch (err) {
        return res.json({ status: 'success', data: { active: false } });
    }
});

module.exports = router;
