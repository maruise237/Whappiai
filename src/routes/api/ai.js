/**
 * AI Configuration & Testing Routes
 * Handles AI settings, testing, templates, and generation
 */

const Session = require('../../models/Session');
const CreditService = require('../../services/CreditService');

/**
 * Initialize AI routes with dependencies
 */
function initializeAIRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, ensureOwnership, log } = dependencies;

    // Get AI configuration for session
    routerInstance.get('/sessions/:sessionId/ai', checkSessionOrTokenAuth, ensureOwnership, (req, res) => {
        const { sessionId } = req.params;
        const session = Session.findById(sessionId);
        if (!session) return res.status(404).json({ status: 'error', message: 'Session not found' });

        res.json({
            status: 'success',
            data: {
                enabled: !!session.ai_enabled,
                endpoint: session.ai_endpoint,
                api_endpoint: session.ai_endpoint,
                key: session.ai_key,
                api_key: session.ai_key,
                model: session.ai_model,
                prompt: session.ai_prompt,
                mode: session.ai_mode || 'bot',
                temperature: session.ai_temperature ?? 0.7,
                max_tokens: session.ai_max_tokens ?? 1000,
                deactivate_on_typing: !!session.ai_deactivate_on_typing,
                deactivate_on_read: !!session.ai_deactivate_on_read,
                trigger_keywords: session.ai_trigger_keywords || '',
                reply_delay: session.ai_reply_delay || 0,
                read_on_reply: !!session.ai_read_on_reply,
                reject_calls: !!session.ai_reject_calls,
                constraints: session.ai_constraints || '',
                session_window: session.ai_session_window ?? 5,
                respond_to_tags: !!session.ai_respond_to_tags,
                stats: {
                    received: session.ai_messages_received || 0,
                    sent: session.ai_messages_sent || 0,
                    lastError: session.ai_last_error,
                    lastMessageAt: session.ai_last_message_at
                }
            }
        });
    });

    // Update AI configuration
    routerInstance.post('/sessions/:sessionId/ai', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        try {
            if (!isValidId(sessionId)) {
                return res.status(400).json({ status: 'error', message: 'Invalid session ID format' });
            }

            const session = Session.findById(sessionId);
            if (!session) {
                return res.status(404).json({ status: 'error', message: 'Session not found' });
            }

            const aiConfig = { ...req.body };
            if (req.currentUser.role !== 'admin') {
                delete aiConfig.endpoint;
                delete aiConfig.key;
                delete aiConfig.ai_endpoint;
                delete aiConfig.ai_key;
            }

            const updated = Session.updateAIConfig(sessionId, aiConfig);
            res.json({ status: 'success', data: updated });
        } catch (err) {
            log(`Échec de la mise à jour de la configuration IA pour ${sessionId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Test AI connection
    routerInstance.post('/sessions/:sessionId/ai/test', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId } = req.params;
        const aiService = require('../services/ai');
        try {
            let config = { ...req.body };

            if (req.currentUser.role !== 'admin') {
                delete config.endpoint;
                delete config.key;
                delete config.ai_endpoint;
                delete config.ai_key;
            }

            if (!config || Object.keys(config).length === 0 || (!config.ai_endpoint && !config.endpoint)) {
                const session = Session.findById(sessionId);
                if (session) {
                    config = {
                        ...config,
                        ai_endpoint: session.ai_endpoint,
                        ai_key: session.ai_key,
                        ai_model: config.model || config.ai_model || session.ai_model,
                        ai_prompt: config.prompt || config.ai_prompt || session.ai_prompt,
                        ai_temperature: config.temperature || config.ai_temperature || session.ai_temperature,
                        ai_max_tokens: config.max_tokens || config.ai_max_tokens || session.ai_max_tokens
                    };
                }
            }

            const callConfig = {
                id: sessionId,
                ai_endpoint: config.ai_endpoint || config.endpoint,
                ai_key: config.ai_key || config.key,
                ai_model: config.ai_model || config.model,
                ai_prompt: config.ai_prompt || config.prompt,
                ai_temperature: config.ai_temperature || config.temperature,
                ai_max_tokens: config.ai_max_tokens || config.max_tokens
            };

            const result = await aiService.callAI(callConfig, "Hello, this is a connection test.");
            if (result) {
                res.json({ status: 'success', message: 'Connection successful', preview: result });
            } else {
                res.status(400).json({ status: 'error', message: 'AI failed to respond' });
            }
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Generate onboarding messages
    routerInstance.post('/ai/generate-onboarding', checkSessionOrTokenAuth, async (req, res) => {
        try {
            const OnboardingService = require('../../services/OnboardingService');
            const config = await OnboardingService.generateConfiguration(req.body);
            res.json({ status: 'success', data: config });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });

    // Get AI personality templates
    routerInstance.get('/ai/templates', checkSessionOrTokenAuth, (req, res) => {
        const templates = require('../../utils/ai-templates');
        res.json({ status: 'success', data: templates });
    });

    // AI Group Message Generation
    routerInstance.post('/sessions/:sessionId/groups/:groupId/ai-generate', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { sessionId, groupId } = req.params;
        try {
            if (req.currentUser.role !== 'admin') {
                if (!req.currentUser.id) {
                    return res.status(400).json({ status: 'error', message: 'User account required for credit deduction.' });
                }

                const hasCredit = CreditService.deduct(req.currentUser.id, 1, `Génération IA pour groupe ${groupId}`);
                if (!hasCredit) {
                    return res.status(402).json({ status: 'error', message: 'Crédits insuffisants.' });
                }
            }

            const aiService = require('../services/ai');
            const rawMessage = await aiService.generateGroupMessage(sessionId, groupId, req.body);
            const message = aiService.formatForWhatsApp(rawMessage);
            res.json({ status: 'success', data: { message } });
        } catch (err) {
            log(`Erreur génération IA groupe ${groupId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
            res.status(500).json({ status: 'error', message: err.message });
        }
    });
}

module.exports = initializeAIRoutes;
