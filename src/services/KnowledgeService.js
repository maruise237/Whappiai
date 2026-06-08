/**
 * Knowledge Service (RAG)
 * Handles document ingestion, chunking, and FTS5 search.
 */

const db = require('../db/query');
const { log } = require('../utils/logger');
const crypto = require('crypto');

class KnowledgeService {
    /**
     * Add a document to the knowledge base
     */
    static async addDocument(sessionId, name, type, content, source = null) {
        const id = crypto.randomUUID();

        try {
            await db.run('BEGIN', []);

            // Insert main record
            await db.run(`
                INSERT INTO knowledge_base (id, session_id, name, type, source)
                VALUES ($1, $2, $3, $4, $5)
            `, [id, sessionId, name, type, source]);

            // Chunking logic (Simple sentences/paragraphs for now)
            const chunks = this.chunkText(content);

            for (const chunk of chunks) {
                const result = await db.get(`
                    INSERT INTO knowledge_chunks (base_id, session_id, content)
                    VALUES ($1, $2, $3)
                    RETURNING id
                `, [id, sessionId, chunk]);

                await db.run(`
                    INSERT INTO knowledge_search (content, session_id, chunk_id)
                    VALUES ($1, $2, $3)
                `, [chunk, sessionId, result.id]);
            }

            await db.run('COMMIT', []);

            log(`Document ajouté à la base de connaissances: ${name}`, sessionId, { id, type, chunks: Math.ceil(content.length / 500) }, 'INFO');
            return id;
        } catch (err) {
            await db.run('ROLLBACK', []);
            log(`Erreur ajout document: ${err.message}`, sessionId, { name }, 'ERROR');
            throw err;
        }
    }

    /**
     * Simple text chunker
     */
    static chunkText(text, size = 1000, overlap = 200) {
        if (!text) return [];

        const chunks = [];
        let i = 0;

        while (i < text.length) {
            chunks.push(text.slice(i, i + size));
            i += (size - overlap);
        }

        return chunks;
    }

    /**
     * Search in knowledge base
     */
    static async search(sessionId, query, limit = 5) {
        if (!query || typeof query !== 'string' || query.trim().length < 3) return [];

        try {
            const sanitizedQuery = query.trim().replace(/[^a-zA-Z0-9\s]/g, ' ');
            if (!sanitizedQuery) return [];

            const results = await db.all(`
                SELECT content FROM knowledge_search
                WHERE knowledge_search MATCH $1 AND session_id = $2
                ORDER BY bm25(knowledge_search)
                LIMIT $3
            `, [sanitizedQuery, sessionId, limit]);

            return results.map(r => r.content);
        } catch (err) {
            log(`Erreur recherche RAG: ${err.message}`, sessionId, { query }, 'WARN');
            return [];
        }
    }

    /**
     * List documents for a session
     */
    static async listDocuments(sessionId) {
        return await db.all(`
            SELECT * FROM knowledge_base WHERE session_id = $1 ORDER BY created_at DESC
        `, [sessionId]);
    }

    /**
     * Delete a document
     */
    static async deleteDocument(id, sessionId) {
        try {
            await db.run('BEGIN', []);

            await db.run(`
                DELETE FROM knowledge_search
                WHERE chunk_id IN (SELECT id FROM knowledge_chunks WHERE base_id = $1)
            `, [id]);

            await db.run('DELETE FROM knowledge_base WHERE id = $1 AND session_id = $2', [id, sessionId]);

            await db.run('COMMIT', []);
            return true;
        } catch (err) {
            await db.run('ROLLBACK', []);
            log(`Erreur suppression document: ${err.message}`, sessionId, { id }, 'ERROR');
            return false;
        }
    }
}

module.exports = KnowledgeService;
