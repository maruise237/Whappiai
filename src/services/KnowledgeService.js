/**
 * Knowledge Service (RAG)
 * Handles document ingestion, chunking, and FTS5 search.
 */

const { db } = require('../config/database');
const { log } = require('../utils/logger');
const crypto = require('crypto');

class KnowledgeService {
    /**
     * Add a document to the knowledge base
     */
    static async addDocument(sessionId, name, type, content, source = null) {
        const id = crypto.randomUUID();

        try {
            db.transaction(() => {
                // Insert main record
                db.prepare(`
                    INSERT INTO knowledge_base (id, session_id, name, type, source)
                    VALUES (?, ?, ?, ?, ?)
                `).run(id, sessionId, name, type, source);

                // Chunking logic (Simple sentences/paragraphs for now)
                const chunks = this.chunkText(content);

                const insertChunk = db.prepare(`
                    INSERT INTO knowledge_chunks (base_id, session_id, content)
                    VALUES (?, ?, ?)
                `);

                const insertSearch = db.prepare(`
                    INSERT INTO knowledge_search (content, session_id, chunk_id)
                    VALUES (?, ?, ?)
                `);

                for (const chunk of chunks) {
                    const result = insertChunk.run(id, sessionId, chunk);
                    insertSearch.run(chunk, sessionId, result.lastInsertRowid);
                }
            })();

            log(`Document ajouté à la base de connaissances: ${name}`, sessionId, { id, type, chunks: Math.ceil(content.length / 500) }, 'INFO');
            return id;
        } catch (err) {
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
    static search(sessionId, query, limit = 5) {
        if (!query || typeof query !== 'string' || query.trim().length < 3) return [];

        try {
            // Sanitize query for FTS5
            const sanitizedQuery = query.trim().replace(/[^a-zA-Z0-9\s]/g, ' ');
            if (!sanitizedQuery) return [];

            // Use FTS5 BM25 ranking for relevance
            const results = db.prepare(`
                SELECT content FROM knowledge_search
                WHERE knowledge_search MATCH ? AND session_id = ?
                ORDER BY bm25(knowledge_search)
                LIMIT ?
            `).all(sanitizedQuery, sessionId, limit);

            return results.map(r => r.content);
        } catch (err) {
            log(`Erreur recherche RAG: ${err.message}`, sessionId, { query }, 'WARN');
            return [];
        }
    }

    /**
     * List documents for a session
     */
    static listDocuments(sessionId) {
        return db.prepare(`
            SELECT * FROM knowledge_base WHERE session_id = ? ORDER BY created_at DESC
        `).all(sessionId);
    }

    /**
     * Delete a document
     */
    static deleteDocument(id, sessionId) {
        try {
            db.transaction(() => {
                // FTS5 items must be deleted manually if not using contentless tables properly
                // Since we use a standard FTS5 table, we delete by chunk_id
                db.prepare(`
                    DELETE FROM knowledge_search
                    WHERE chunk_id IN (SELECT id FROM knowledge_chunks WHERE base_id = ?)
                `).run(id);

                db.prepare('DELETE FROM knowledge_base WHERE id = ? AND session_id = ?').run(id, sessionId);
            })();
            return true;
        } catch (err) {
            log(`Erreur suppression document: ${err.message}`, sessionId, { id }, 'ERROR');
            return false;
        }
    }
}

module.exports = KnowledgeService;
