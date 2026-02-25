/**
 * Keyword Service
 * Handles keyword-based auto-responses matching and execution
 */

const { KeywordResponder } = require('../models');
const { log } = require('../utils/logger');
const QueueService = require('./QueueService');

class KeywordService {
    /**
     * Process an incoming message for keyword matches
     * @param {object} sock - Baileys socket
     * @param {string} sessionId - Session ID
     * @param {object} msg - Incoming message object
     * @returns {boolean} True if a keyword was matched and processed
     */
    static async processMessage(sock, sessionId, msg) {
        try {
            const remoteJid = msg.key.remoteJid;

            // Skip if fromMe
            if (msg.key.fromMe) return false;

            // Extract message text
            let messageContent = msg.message;
            if (messageContent?.ephemeralMessage) messageContent = messageContent.ephemeralMessage.message;
            if (messageContent?.viewOnceMessage) messageContent = messageContent.viewOnceMessage.message;
            if (messageContent?.viewOnceMessageV2) messageContent = messageContent.viewOnceMessageV2.message;

            const messageText = (messageContent?.conversation ||
                                messageContent?.extendedTextMessage?.text ||
                                messageContent?.imageMessage?.caption ||
                                messageContent?.videoMessage?.caption ||
                                "").toLowerCase().trim();

            if (!messageText) return false;

            // Get active rules for this session
            const rules = KeywordResponder.findActiveBySessionId(sessionId);
            if (!rules || rules.length === 0) return false;

            // Find matching rule
            const match = rules.find(rule => {
                const keyword = rule.keyword.toLowerCase().trim();
                if (rule.match_type === 'exact') {
                    return messageText === keyword;
                } else if (rule.match_type === 'contains') {
                    return messageText.includes(keyword);
                } else if (rule.match_type === 'regex') {
                    try {
                        const regex = new RegExp(rule.keyword, 'i');
                        return regex.test(messageText);
                    } catch (e) {
                        return false;
                    }
                }
                return false;
            });

            if (match) {
                log(`Mot-clé détecté: "${match.keyword}" (Session: ${sessionId}, De: ${remoteJid})`, sessionId, { event: 'keyword-match', keyword: match.keyword, type: match.match_type }, 'INFO');

                await this.sendResponse(sock, remoteJid, match, sessionId);
                return true;
            }

            return false;
        } catch (error) {
            log(`Erreur KeywordService: ${error.message}`, sessionId, { error: error.message }, 'ERROR');
            return false;
        }
    }

    /**
     * Send the auto-response based on rule configuration
     */
    static async sendResponse(sock, jid, rule, sessionId) {
        try {
            const content = rule.response_content;
            const type = rule.response_type;

            let message;
            if (type === 'text') {
                message = { text: content };
            } else if (type === 'image') {
                message = { image: { url: content } };
            } else if (type === 'document') {
                message = {
                    document: { url: content },
                    fileName: rule.file_name || 'Document.pdf',
                    mimetype: 'application/pdf'
                };
            } else if (type === 'audio') {
                message = { audio: { url: content }, ptt: true };
            } else if (type === 'video') {
                message = { video: { url: content } };
            }

            const result = await QueueService.enqueue(sessionId, sock, jid, message);

            if (result) {
                log(`Réponse automatique par mot-clé envoyée à ${jid}`, sessionId, { event: 'keyword-sent', ruleId: rule.id }, 'INFO');
            }
        } catch (error) {
            log(`Échec envoi réponse mot-clé: ${error.message}`, sessionId, { error: error.message }, 'ERROR');
        }
    }
}

module.exports = KeywordService;
