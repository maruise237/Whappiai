/**
 * Group Management & Moderation Routes
 * Handles group profiles, links, moderation settings, and engagement tasks
 */

const { db } = require('../../config/database');
const CreditService = require('../../services/CreditService');
const AccountAccessService = require('../../services/AccountAccessService');

/**
 * Initialize group and moderation routes with dependencies
 */
function initializeGroupRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, ensureOwnership, log, sessions } = dependencies;

    // Get admin groups for moderation
    routerInstance.get('/sessions/:sessionId/moderation/groups', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        const sessionData = sessions.get(sessionId);

        if (!sessionData || !sessionData.sock || sessionData.status !== 'CONNECTED') {
            return res.status(400).json({
                status: 'error',
                message: `La session "${sessionId}" n'est pas connectée. Veuillez coupler votre compte WhatsApp.`
            });
        }

        try {
            const moderationService = require('../../services/moderation');
            const groups = await moderationService.getAdminGroups(sessionData.sock, sessionId);
            res.json({ status: 'success', data: groups });
        } catch (err) {
            log(`Erreur lors de la récupération des groupes pour ${sessionId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get group settings
    routerInstance.get('/sessions/:sessionId/moderation/groups/:groupId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const settings = db.prepare('SELECT * FROM group_settings WHERE group_id = ? AND session_id = ?').get(groupId, sessionId);
            res.json({
                status: 'success',
                data: settings || {
                    group_id: groupId,
                    session_id: sessionId,
                    is_active: 0,
                    anti_link: 0,
                    bad_words: '',
                    warning_template: '@{{name}} votre message a ete supprime: {{reason}}. Avertissement {{count}}/{{max}}. Il reste {{remaining}} avertissement(s) avant exclusion.',
                    warnings_enabled: 0,
                    auto_kick_enabled: 0,
                    max_warnings: 3,
                    welcome_enabled: 0,
                    welcome_digest_enabled: 0,
                    welcome_digest_time: '18:00',
                    ai_assistant_enabled: 0
                }
            });
        } catch (err) {
            log(`Erreur lors de la récupération des réglages pour ${groupId}: ${err.message}`, sessionId, { groupId, error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Update group settings
    routerInstance.post('/sessions/:sessionId/moderation/groups/:groupId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const moderationService = require('../../services/moderation');
            moderationService.updateGroupSettings(sessionId, groupId, req.body);
            res.json({ status: 'success', message: 'Settings updated' });
        } catch (err) {
            log(`Échec de la mise à jour de la modération pour ${groupId}: ${err.message}`, sessionId, { groupId, error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get warned members for a group
    routerInstance.get('/sessions/:sessionId/moderation/groups/:groupId/warnings', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const warningService = require('../../services/warnings');
            const warnedMembers = warningService.listByGroup(sessionId, groupId);
            res.json({ status: 'success', data: warnedMembers });
        } catch (err) {
            log(`Erreur lors de la recuperation des membres avertis pour ${groupId}: ${err.message}`, sessionId, { groupId, error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Reset warnings for one member
    routerInstance.delete('/sessions/:sessionId/moderation/groups/:groupId/warnings/:userId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId, userId } = req.params;
        try {
            const warningService = require('../../services/warnings');
            const decodedUserId = decodeURIComponent(userId);
            const result = warningService.resetMember(sessionId, groupId, decodedUserId);
            res.json({ status: 'success', data: { reset: true, changes: result.changes || 0 } });
        } catch (err) {
            log(`Erreur remise a zero avertissements pour ${groupId}: ${err.message}`, sessionId, { groupId, userId, error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get group profile
    routerInstance.get('/sessions/:sessionId/groups/:groupId/profile', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../../services/groups');
            const profile = groupService.getProfile(sessionId, groupId);
            res.json({ status: 'success', data: profile });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Update group profile
    routerInstance.post('/sessions/:sessionId/groups/:groupId/profile', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../../services/groups');
            groupService.updateProfile(sessionId, groupId, req.body);
            res.json({ status: 'success', message: 'Profile updated' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get group product links
    routerInstance.get('/sessions/:sessionId/groups/:groupId/links', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../../services/groups');
            const links = groupService.getProductLinks(sessionId, groupId);
            res.json({ status: 'success', data: links });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Update group product links
    routerInstance.post('/sessions/:sessionId/groups/:groupId/links', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const groupService = require('../../services/groups');
            groupService.updateProductLinks(sessionId, groupId, req.body.links || []);
            res.json({ status: 'success', message: 'Links updated' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get engagement tasks
    routerInstance.get('/sessions/:sessionId/moderation/groups/:groupId/engagement', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const engagementService = require('../../services/engagement');
            const tasks = engagementService.getTasks(sessionId, groupId);
            res.json({ status: 'success', data: tasks });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Create engagement task
    routerInstance.post('/sessions/:sessionId/moderation/groups/:groupId/engagement', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            if (!req.currentUser?.id) {
                return res.status(401).json({ status: 'error', message: 'Compte utilisateur requis pour programmer un message.' });
            }

            const access = AccountAccessService.canCreateScheduledTask(req.currentUser.id);
            if (!access.allowed) {
                return res.status(403).json({
                    status: 'error',
                    message: access.message,
                    code: access.code,
                    limit: access.limit,
                    current: access.current
                });
            }

            const engagementService = require('../../services/engagement');
            const taskId = engagementService.addTask({
                ...req.body,
                session_id: sessionId,
                group_id: groupId
            });
            res.status(201).json({ status: 'success', data: { id: taskId } });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Delete engagement task
    routerInstance.delete('/moderation/engagement/:taskId', checkSessionOrTokenAuth, async (req, res) => {
        const { taskId } = req.params;
        try {
            const engagementService = require('../../services/engagement');
            engagementService.deleteTask(taskId);
            res.json({ status: 'success', message: 'Tâche supprimée' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Update engagement task
    routerInstance.put('/moderation/engagement/:taskId', checkSessionOrTokenAuth, async (req, res) => {
        const { taskId } = req.params;
        try {
            const engagementService = require('../../services/engagement');
            const updated = engagementService.updateTask(taskId, req.body);
            res.json({ status: 'success', data: updated });
        } catch (err) {
            res.status(400).json({ status: 'error', message: err.message });
        }
    });

    // Get engagement history
    routerInstance.get('/sessions/:sessionId/moderation/groups/:groupId/engagement/history', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            const engagementService = require('../../services/engagement');
            const history = engagementService.getHistory({
                session_id: sessionId,
                group_id: groupId,
                ...req.query
            });
            res.json({ status: 'success', data: history });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });
}

module.exports = initializeGroupRoutes;
