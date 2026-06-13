/**
 * Public API Routes
 * Endpoints that don't require authentication
 */

const express = require('express');
const router = express.Router();
const db = require('../db/query');
const { log } = require('../utils/logger');

function maintenanceEnabledValue(value) {
    return value === true || value === 1 || value === '1';
}

async function ensureMaintenanceSettingsRow() {
    await db.run(`
        INSERT INTO maintenance_settings (id, enabled, title, message, icon)
        VALUES (1, 0, 'Maintenance en cours', 'Nous effectuons des ameliorations techniques. Revenez dans quelques instants.', 'Wrench')
        ON CONFLICT (id) DO NOTHING
    `);
}

/**
 * Auto-check and apply scheduled maintenance window.
 * Called on every /maintenance/status request so activation/deactivation
 * is instant without waiting for the scheduler tick.
 */
async function applySchedule(settings) {
    if (!settings) return;

    const now = new Date().toISOString();
    const isEnabled = maintenanceEnabledValue(settings.enabled);

    if (!isEnabled && settings.scheduled_start_at && settings.scheduled_start_at <= now) {
        if (settings.scheduled_end_at && settings.scheduled_end_at <= now) {
            await db.run(`
                UPDATE maintenance_settings SET
                    scheduled_start_at = NULL,
                    scheduled_end_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `);
            log('Maintenance schedule expired (API trigger), cleared', 'SYSTEM');
            return;
        }

        await db.run(`
            UPDATE maintenance_settings SET
                enabled = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `);
        log('Maintenance auto-activated from schedule (API trigger)', 'SYSTEM');
        return;
    }

    if (isEnabled && settings.scheduled_end_at && settings.scheduled_end_at <= now) {
        await db.run(`
            UPDATE maintenance_settings SET
                enabled = 0,
                scheduled_start_at = NULL,
                scheduled_end_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `);
        log('Maintenance auto-deactivated: end time reached (API trigger)', 'SYSTEM');
    }
}

/**
 * GET /api/v1/maintenance/status
 * Public maintenance status used by the frontend overlay.
 */
router.get('/maintenance/status', async (req, res) => {
    try {
        await ensureMaintenanceSettingsRow();

        let settings = await db.get(
            'SELECT enabled, title, message, icon, scheduled_start_at, scheduled_end_at FROM maintenance_settings WHERE id = 1'
        );

        await applySchedule(settings);

        settings = await db.get(
            'SELECT enabled, title, message, icon, scheduled_start_at, scheduled_end_at FROM maintenance_settings WHERE id = 1'
        );

        if (!settings) {
            return res.json({ status: 'success', data: { active: false } });
        }

        return res.json({
            status: 'success',
            data: {
                active: maintenanceEnabledValue(settings.enabled),
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
