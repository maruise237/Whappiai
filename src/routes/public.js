/**
 * Public API Routes
 * Endpoints that don't require authentication
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

/**
 * GET /api/v1/maintenance/status
 * Public maintenance status — used by frontend to show maintenance overlay
 */
router.get('/maintenance/status', (req, res) => {
    try {
        const settings = db.prepare(
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
