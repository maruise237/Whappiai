/**
 * AI Service
 * Handles interaction with agnostic AI APIs (OpenAI, Groq, Ollama, etc.)
 * Supports Bot, Human Suggestion, and Hybrid modes.
 */

const { User, Session, ActivityLog, AIModel } = require('../models');
const { log } = require('../utils/logger');
const { db } = require('../config/database');

class AIService {
    /**
     * Store message in conversational memory
     * @param {string} userId 
     * @param {string} remoteJid 
     * @param {string} role - 'user' or 'assistant'
     * @param {string} content 
     */
    static async storeMemory(userId, remoteJid, role, content) {
        try {
            db.prepare(`
                INSERT INTO conversation_memory (session_id, remote_jid, role, content)
                VALUES (?, ?, ?, ?)
            `).run(userId, remoteJid, role, content);
            
            // Maintenance: keep only last 20 messages per conversation to optimize storage
            db.prepare(`
                DELETE FROM conversation_memory 
                WHERE id IN (
                    SELECT id FROM conversation_memory 
                    WHERE session_id = ? AND remote_jid = ? 
                    ORDER BY created_at DESC 
                    LIMIT -1 OFFSET 20
                )
            `).run(userId, remoteJid);
        } catch (err) {
            log(`Erreur stockage mémoire conversationnelle: ${err.message}`, userId, { remoteJid, role }, 'ERROR');
        }
    }

    /**
     * Get conversation context from memory
     * @param {string} userId 
     * @param {string} remoteJid 
     * @param {number} limit 
     * @returns {Array} List of messages
     */
    static getMemory(userId, remoteJid, limit = 10) {
        try {
            return db.prepare(`
                SELECT role, content FROM conversation_memory 
                WHERE session_id = ? AND remote_jid = ? 
                ORDER BY created_at ASC 
                LIMIT ?
            `).all(userId, remoteJid, limit);
        } catch (err) {
            log(`Erreur récupération mémoire conversationnelle: ${err.message}`, userId, { remoteJid }, 'ERROR');
            return [];
        }
    }

    /**
     * Handles an incoming message and generates an AI response if enabled
     * @param {object} sock - Baileys socket
     * @param {string} sessionId - Session ID (now userId)
     * @param {object} msg - Incoming message object
     * @param {boolean} isGroupMode - Whether it's called in group assistant mode
     */
    static async handleIncomingMessage(sock, sessionId, msg, isGroupMode = false) {
        try {
            // Get session config from DB
            const session = Session.findById(sessionId);
            if (!session) {
                log(`Session non trouvée dans la base de données`, sessionId, { event: 'ai-error', reason: 'session-not-found' }, 'ERROR');
                return;
            }

            // Check if AI is enabled (For personal bot mode)
            if (!isGroupMode && parseInt(session.ai_enabled) !== 1) {
                log(`IA désactivée pour cette session`, sessionId, { event: 'ai-disabled' }, 'INFO');
                return;
            }

            // Increment received counter
            Session.updateAIStats(sessionId, 'received');

            const remoteJid = msg.key.remoteJid;
            
            // Handle group vs private messages
            if (remoteJid.endsWith('@g.us')) {
                if (!isGroupMode) {
                    log(`Message de groupe ignoré par l'auto-répondeur IA personnel`, sessionId, { remoteJid }, 'DEBUG');
                    return;
                }
            } else if (isGroupMode) {
                // If in group mode but received a private message, skip (should not happen if called correctly)
                return;
            }

            // Extract the actual message content
            let messageContent = msg.message;
            if (messageContent?.ephemeralMessage) messageContent = messageContent.ephemeralMessage.message;
            if (messageContent?.viewOnceMessage) messageContent = messageContent.viewOnceMessage.message;
            if (messageContent?.viewOnceMessageV2) messageContent = messageContent.viewOnceMessageV2.message;

            // Better message text extraction for Baileys
            const messageText = messageContent?.conversation || 
                                messageContent?.extendedTextMessage?.text || 
                                messageContent?.imageMessage?.caption ||
                                messageContent?.videoMessage?.caption ||
                                messageContent?.templateButtonReplyMessage?.selectedId ||
                                messageContent?.buttonsResponseMessage?.selectedButtonId ||
                                messageContent?.listResponseMessage?.singleSelectReply?.selectedRowId;

            if (!messageText) {
                log(`No text content found in message from ${remoteJid}`, sessionId, { event: 'ai-skip', reason: 'no-text' }, 'INFO');
                return;
            }

            // Store user message in memory
            await this.storeMemory(sessionId, remoteJid, 'user', messageText);

            log(`Processing AI message from ${remoteJid}: "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`, sessionId, {
                event: 'ai-processing',
                remoteJid,
                text: messageText
            }, 'INFO');

            // Prepare AI call with memory
            const history = this.getMemory(sessionId, remoteJid);
            
            let systemPrompt = null;
            if (isGroupMode) {
                const groupService = require('./groups');
                const profile = groupService.getProfile(sessionId, remoteJid);
                systemPrompt = `Tu es l'assistant IA officiel de ce groupe WhatsApp. Ton but est d'aider les membres, de répondre à leurs questions et d'animer la conversation de manière professionnelle et amicale.
                
                Informations sur le groupe :
                - Mission : ${profile?.mission || 'Non spécifiée'}
                - Objectifs : ${profile?.objectives || 'Non spécifiés'}
                - Règles : ${profile?.rules || 'Non spécifiées'}
                - Thématique : ${profile?.theme || 'Générale'}
                
                Consignes :
                - Sois concis.
                - Utilise des emojis.
                - Respecte les règles du groupe.
                - Si tu ne connais pas la réponse, redirige vers un administrateur.`;
            }
            
            const response = await this.callAI(session, messageText, systemPrompt, history);
            
            if (!response) {
                log(`No response from AI for session ${sessionId}`, sessionId, {
                    event: 'ai-error',
                    reason: 'empty-response'
                }, 'ERROR');
                Session.updateAIStats(sessionId, 'error', 'Empty AI response or API error');
                return;
            }

            // Store assistant response in memory
            await this.storeMemory(sessionId, remoteJid, 'assistant', response);

            log(`AI Response for ${remoteJid}: "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`, sessionId, {
                event: 'ai-response',
                remoteJid,
                response
            }, 'INFO');

            // Default to 'bot' mode as per specs
            await this.sendAutoResponse(sock, remoteJid, response, sessionId);

        } catch (error) {
            log(`Erreur AIService pour l'utilisateur ${sessionId}: ${error.message}`, sessionId, { event: 'ai-service-error', error: error.message }, 'ERROR');
            if (Session.findById(sessionId)) Session.updateAIStats(sessionId, 'error', error.message);
        }
    }

    /**
     * Calls the configured AI endpoint
     */
    static async callAI(user, userMessage, systemPrompt = null, history = []) {
        let { ai_endpoint, ai_key, ai_model, ai_prompt, ai_temperature, ai_max_tokens } = user;
        
        // If no model is set, try to get the global default model
        if (!ai_model) {
            const defaultModel = AIModel.getDefault();
            if (defaultModel) {
                ai_endpoint = defaultModel.endpoint;
                ai_key = defaultModel.api_key;
                ai_model = defaultModel.model_name;
                ai_temperature = ai_temperature ?? defaultModel.temperature;
                ai_max_tokens = ai_max_tokens ?? defaultModel.max_tokens;
            }
        }
        // If ai_model looks like a model ID (UUID), use the global model configuration
        else if (ai_model && ai_model.length > 30) {
            const globalModel = AIModel.findById(ai_model);
            if (globalModel && globalModel.is_active) {
                log(`Utilisation du modèle global: ${globalModel.name}`, user.id, { modelId: ai_model }, 'DEBUG');
                ai_endpoint = globalModel.endpoint;
                ai_key = globalModel.api_key;
                ai_model = globalModel.model_name;
                ai_temperature = ai_temperature ?? globalModel.temperature;
                ai_max_tokens = ai_max_tokens ?? globalModel.max_tokens;
            }
        }

        // Default to DeepSeek if not configured, as per specs "DeepSeek (Gratuit)"
        let finalEndpoint = ai_endpoint || 'https://api.deepseek.com/v1/chat/completions';
        let finalKey = ai_key || process.env.DEEPSEEK_API_KEY;
        let finalModel = ai_model || 'deepseek-chat';
        let finalTemperature = ai_temperature ?? 0.7;
        let finalMaxTokens = ai_max_tokens ?? 1000;

        if (!finalKey) {
            log('ATTENTION: Clé API IA manquante', user.id, { event: 'ai-config-missing-key' }, 'WARN');
            return "Désolé, mon service d'IA n'est pas encore configuré correctement.";
        }

        // Auto-fix common endpoint issues (e.g. missing /v1/chat/completions)
        if (finalEndpoint.includes('deepseek.com')) {
            if (!finalEndpoint.endsWith('/chat/completions')) {
                finalEndpoint = finalEndpoint.endsWith('/v1') ? `${finalEndpoint}/chat/completions` : `${finalEndpoint}/v1/chat/completions`;
            }
        } else if (finalEndpoint.includes('openai.com') && !finalEndpoint.endsWith('/chat/completions')) {
            finalEndpoint = finalEndpoint.endsWith('/v1') ? `${finalEndpoint}/chat/completions` : `${finalEndpoint}/v1/chat/completions`;
        }

        // HEURISTIC: If finalModel looks like an API key (starts with sk-) and finalKey looks like a URL or is empty
        // let's try to swap them internally to help the user
        if (finalModel && finalModel.startsWith('sk-') && (!finalKey || finalKey.includes('http'))) {
            log('Détection: Le modèle ressemble à une clé. Échange interne pour cet appel.', user.id, { event: 'ai-key-swap' }, 'DEBUG');
            const temp = finalKey;
            finalKey = finalModel;
            finalModel = temp && !temp.includes('http') ? temp : 'deepseek-chat';
        }

        try {
            log(`Appel API IA: ${finalEndpoint} (Modèle: ${finalModel})`, user.id, { event: 'ai-api-calling', endpoint: finalEndpoint, model: finalModel }, 'DEBUG');
            
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30s timeout

            // Prepare messages array
            const messages = [
                { role: 'system', content: systemPrompt || ai_prompt || 'You are a helpful assistant.' }
            ];

            // Add history if present
            if (history && history.length > 0) {
                // Remove system prompts from history to avoid confusion
                const cleanHistory = history.filter(h => h.role !== 'system');
                messages.push(...cleanHistory);
                
                // Check if last message is already the current user message to avoid duplication
                const lastHistoryMsg = cleanHistory.length > 0 ? cleanHistory[cleanHistory.length - 1] : null;
                if (!lastHistoryMsg || !(lastHistoryMsg.role === 'user' && lastHistoryMsg.content === userMessage)) {
                    messages.push({ role: 'user', content: userMessage });
                }
            } else {
                messages.push({ role: 'user', content: userMessage });
            }

            const response = await fetch(finalEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${finalKey || ''}`
                },
                body: JSON.stringify({
                    model: finalModel,
                    messages: messages,
                    temperature: finalTemperature,
                    max_tokens: finalMaxTokens
                }),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                const errorMsg = `Erreur API IA (${response.status}): ${errorText.substring(0, 100)}`;
                log(errorMsg, user.id, { event: 'ai-api-error', status: response.status, body: errorText }, 'ERROR');
                return null;
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || null;
            
            if (!aiResponse) {
                log('Réponse IA vide reçue de l\'API', user.id, { event: 'ai-empty-response', data }, 'WARN');
            }
            
            return aiResponse;
        } catch (error) {
            let errorMsg = error.message;
            if (error.name === 'AbortError') {
                errorMsg = 'Timeout de l\'appel API IA (30s)';
            } else if (error.cause) {
                errorMsg += ` (Cause: ${error.cause.message || error.cause})`;
            }
            log(`Erreur lors de l'appel à l'IA: ${errorMsg}`, user.id, { event: 'ai-api-fetch-error', error: errorMsg }, 'ERROR');
            return null;
        }
    }

    /**
     * Generate a group message based on profile and objective
     */
    static async generateGroupMessage(userId, groupId, options) {
        const { objective, additionalInfo, includeLinks } = options;
        
        try {
            // userId here is actually the sessionId passed from api.js
            const session = Session.findById(userId);
            if (!session) throw new Error('Session not found');

            const groupService = require('./groups');
            const profile = groupService.getProfile(userId, groupId);
            const links = includeLinks ? groupService.getProductLinks(userId, groupId) : [];

            const systemPrompt = `Tu es un expert en animation de groupes WhatsApp. Ton but est de rédiger un message engageant, pertinent et percutant.
            
            Informations sur le groupe :
            - Mission : ${profile?.mission || 'Non spécifiée'}
            - Objectifs : ${profile?.objectives || 'Non spécifiés'}
            - Règles : ${profile?.rules || 'Non spécifiées'}
            - Thématique : ${profile?.theme || 'Générale'}
            
            ${links.length > 0 ? `Liens et produits disponibles :\n${links.map(l => `- ${l.title}: ${l.description} (${l.url}) - CTA: ${l.cta}`).join('\n')}` : ''}
            
            Consignes :
            - Utilise un ton adapté au groupe.
            - Sois concis et utilise des emojis pour structurer le message.
            - Inclus les liens de manière naturelle si nécessaire.
            - N'utilise pas de placeholders comme [Lien], remplace-les par les vraies informations fournies.
            - Si des liens sont fournis ci-dessus, tu DOIS impérativement en inclure au moins un de manière pertinente dans le message.`;

            const userPrompt = `Rédige un message pour le groupe avec l'objectif suivant : ${objective}.
            ${additionalInfo ? `Informations complémentaires à inclure : ${additionalInfo}` : ''}`;

            // Get conversation memory for the group to maintain context
            const history = this.getMemory(userId, groupId, 5);
            log(`Génération de message de groupe pour ${groupId} avec ${history.length} messages de contexte`, userId, { event: 'ai-group-gen-context', historyCount: history.length }, 'DEBUG');

            return await this.callAI(session, userPrompt, systemPrompt, history);
        } catch (err) {
            log(`Erreur lors de la génération du message de groupe: ${err.message}`, userId, { event: 'ai-group-gen-error', error: err.message }, 'ERROR');
            throw err;
        }
    }

    /**
     * Formats text for WhatsApp (converts Markdown to WhatsApp syntax)
     * @param {string} text - The raw AI response
     * @returns {string} Formatted text
     */
    static formatForWhatsApp(text) {
        if (!text) return '';

        let formatted = text;

        // 1. Protect Code Blocks (```code```)
        const codeBlocks = [];
        formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
            codeBlocks.push(code);
            return `«CB${codeBlocks.length - 1}»`;
        });

        // 2. Protect Inline Code (`code`)
        const inlineCodes = [];
        formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
            inlineCodes.push(code);
            return `«IC${inlineCodes.length - 1}»`;
        });

        // 3. Handle Headers (e.g., ### Header -> *HEADER*)
        formatted = formatted.replace(/^(#{1,6})\s*(.*)$/gm, (match, hashes, content) => {
            return `§B§${content.toUpperCase()}§B§`;
        });

        // 4. Bold: **text** or __text__ -> §B§text§B§
        formatted = formatted.replace(/(\*\*|__)(.*?)\1/g, '§B§$2§B§');

        // 5. Italics: *text* or _text_ -> _text_
        // Match single * or _ that are NOT part of our placeholders
        formatted = formatted.replace(/(^|[^\*])\*([^\*§«»]+)\*([^\*]|$)/g, '$1_$2_$3');
        formatted = formatted.replace(/(^|[^_])_([^_§«»]+)_([^_]|$)/g, '$1_$2_$3');

        // 6. Strikethrough: ~~text~~ -> ~text~
        formatted = formatted.replace(/~~(.*?)~~/g, '~$1~');

        // 7. Convert bold placeholders to *
        formatted = formatted.replace(/§B§/g, '*');

        // 8. Re-insert protected code at the very end
        inlineCodes.forEach((code, i) => {
            formatted = formatted.replace(`«IC${i}»`, `\`\`\`${code}\`\`\``);
        });
        codeBlocks.forEach((code, i) => {
            formatted = formatted.replace(`«CB${i}»`, `\`\`\`${code}\`\`\``);
        });

        // 9. Clean up multiple empty lines (max 2)
        formatted = formatted.replace(/\n{3,}/g, '\n\n');

        // 10. List markers: convert Markdown lists to WhatsApp bullet points
        // Convert "* item" or "- item" to "• item"
        formatted = formatted.replace(/^[\s]*[\*\-][\s]+(.*)$/gm, '• $1');

        return formatted.trim();
    }

    /**
     * Sends the response with human-like simulation
     */
    static async sendAutoResponse(sock, jid, text, sessionId) {
        try {
            // Format the text for WhatsApp before sending
            const formattedText = this.formatForWhatsApp(text);
            
            log(`Envoi de la réponse automatique à ${jid} (Session: ${sessionId})`, sessionId, { event: 'ai-sending', jid }, 'INFO');
            
            // Simulate "composing"
            try {
                await sock.presenceSubscribe(jid);
                await sock.sendPresenceUpdate('composing', jid);
            } catch (pError) {
                log(`Échec de la mise à jour de présence pour ${jid}: ${pError.message}`, sessionId, { event: 'ai-presence-error', error: pError.message }, 'WARN');
            }
            
            // Wait based on text length (simulating typing speed)
            const typingDelay = Math.min(Math.max(formattedText.length * 50, 1000), 7000);
            await new Promise(resolve => setTimeout(resolve, typingDelay));

            try {
                await sock.sendPresenceUpdate('paused', jid);
            } catch (pError) {}

            const result = await sock.sendMessage(jid, { text: formattedText });
            
            if (result) {
                log(`Message envoyé avec succès à ${jid}`, sessionId, { event: 'ai-sent', jid }, 'INFO');
                Session.updateAIStats(sessionId, 'sent');

                // Log to activity log if available
                const session = Session.findById(sessionId);
                if (ActivityLog && session) {
                    await ActivityLog.logMessageSend(
                        session.owner_email || 'ai-assistant',
                        sessionId,
                        jid,
                        'text',
                        '127.0.0.1', // Local AI action
                        'AI Assistant'
                    );
                }
            } else {
                log(`sock.sendMessage a retourné null pour ${jid}`, sessionId, { event: 'ai-send-failed', jid }, 'WARN');
                Session.updateAIStats(sessionId, 'error', 'Message sending failed (null result)');
            }
        } catch (error) {
            log(`Échec de l'envoi du message à ${jid}: ${error.message}`, sessionId, { event: 'ai-send-error', error: error.message }, 'ERROR');
            Session.updateAIStats(sessionId, 'error', `Send error: ${error.message}`);
        }
    }
}

module.exports = AIService;
