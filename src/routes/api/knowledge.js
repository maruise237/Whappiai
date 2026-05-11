/**
 * Knowledge Base & Keyword Responder Routes
 * Handles RAG knowledge base and keyword-based auto-responses
 */

const KnowledgeService = require('../../services/KnowledgeService');
const KeywordResponder = require('../../models/KeywordResponder');

/**
 * Initialize knowledge and keyword routes with dependencies
 */
function initializeKnowledgeRoutes(routerInstance, dependencies) {
    const { checkSessionOrTokenAuth, ensureOwnership } = dependencies;

    // === Keyword Responders ===
    
    // List keyword rules
    routerInstance.get('/sessions/:sessionId/keywords', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const rules = KeywordResponder.findBySessionId(req.params.sessionId);
            res.json({ status: 'success', data: rules });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Create keyword rule
    routerInstance.post('/sessions/:sessionId/keywords', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const rule = KeywordResponder.create({
                ...req.body,
                session_id: req.params.sessionId
            });
            res.status(201).json({ status: 'success', data: rule });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Update keyword rule
    routerInstance.put('/sessions/:sessionId/keywords/:id', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const rule = KeywordResponder.update(req.params.id, req.body);
            res.json({ status: 'success', data: rule });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Delete keyword rule
    routerInstance.delete('/sessions/:sessionId/keywords/:id', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            KeywordResponder.delete(req.params.id);
            res.json({ status: 'success', message: 'Règle supprimée' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // === Knowledge Base (RAG) ===

    // List knowledge documents
    routerInstance.get('/sessions/:sessionId/knowledge', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const docs = KnowledgeService.listDocuments(req.params.sessionId);
            res.json({ status: 'success', data: docs });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Add knowledge document
    routerInstance.post('/sessions/:sessionId/knowledge', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        const { name, type, content, source } = req.body;
        if (!name || !content) {
            return res.status(400).json({ status: 'error', message: 'Nom et contenu requis' });
        }

        try {
            const id = await KnowledgeService.addDocument(req.params.sessionId, name, type || 'text', content, source);
            res.json({ status: 'success', data: { id } });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });

    // Delete knowledge document
    routerInstance.delete('/sessions/:sessionId/knowledge/:docId', checkSessionOrTokenAuth, ensureOwnership, async (req, res) => {
        try {
            const success = KnowledgeService.deleteDocument(req.params.docId, req.params.sessionId);
            res.json({ status: success ? 'success' : 'error', message: success ? 'Document supprimé' : 'Échec de la suppression' });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    });
}

module.exports = initializeKnowledgeRoutes;
