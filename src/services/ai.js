/**
 * AI Service
 * Handles interaction with agnostic AI APIs (OpenAI, Groq, Ollama, etc.)
 * Supports Bot, Human Suggestion, and Hybrid modes.
 */

const { User, Session, ActivityLog, AIModel } = require('../models');
const CreditService = require('./CreditService');
const KnowledgeService = require('./KnowledgeService');
const WebhookService = require('./WebhookService');
const QueueService = require('./QueueService');
const { log } = require('../utils/logger');
const { db } = require('../config/database');

// Memory-only flags to temporarily pause AI for specific conversations
const pausedConversations = new Map();
const botReadHistory = new Set(); // Track messages read by the bot itself
const lastOwnerActivity = new Map(); // Track last activity from the owner per JID
const pendingRetries = new Map(); // Track messages ignored by random protection for later retry

class AIService {
    /**
     * Record owner activity to prevent AI from interfering in a live conversation
     * @param {string} sessionId 
     * @param {string} remoteJid 
     */
    static recordOwnerActivity(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        lastOwnerActivity.set(key, Date.now());
    }

    /**
     * Check if the owner was active recently in this conversation
     * @param {string} sessionId 
     * @param {string} remoteJid 
     * @param {number} windowMinutes 
     * @returns {boolean}
     */
    static isOwnerActive(sessionId, remoteJid, windowMinutes = 2) {
        const key = `${sessionId}:${remoteJid}`;
        const lastActivity = lastOwnerActivity.get(key);
        if (!lastActivity) return false;

        const now = Date.now();
        const diffMinutes = (now - lastActivity) / (1000 * 60);
        
        const isActive = diffMinutes < windowMinutes;
        if (isActive) {
            log(`Priorité Humaine : L'utilisateur était actif il y a ${Math.round(diffMinutes * 10) / 10} min. IA en veille.`, sessionId, { event: 'ai-silence-window', remoteJid, diffMinutes }, 'INFO');
        }
        return isActive;
    }
    /**
     * Temporarily pause AI for a specific conversation
     * @param {string} sessionId 
     * @param {string} remoteJid 
     */
    static pauseForConversation(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        pausedConversations.set(key, true);
        log(`IA mise en pause temporaire pour ${remoteJid}`, sessionId, { event: 'ai-pause' }, 'DEBUG');
    }

    /**
     * Check if AI is paused for a specific conversation
     * @param {string} sessionId 
     * @param {string} remoteJid 
     * @returns {boolean}
     */
    static isPaused(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        return pausedConversations.has(key);
    }

    /**
     * Resume AI for a specific conversation
     * @param {string} sessionId 
     * @param {string} remoteJid 
     */
    static resumeForConversation(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        pausedConversations.delete(key);
    }

    /**
     * Reset owner activity to immediately allow AI
     * @param {string} sessionId
     * @param {string} remoteJid
     */
    static resetOwnerActivity(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        lastOwnerActivity.set(key, 0);
    }

    /**
     * Track that the bot is reading a specific message to avoid self-pausing
     * @param {string} sessionId 
     * @param {string} messageId 
     */
    static trackBotRead(sessionId, messageId) {
        const key = `${sessionId}:${messageId}`;
        botReadHistory.add(key);
        // Clear after 10 seconds
        setTimeout(() => botReadHistory.delete(key), 10000);
    }

    /**
     * Check if a read event was triggered by the bot itself
     * @param {string} sessionId 
     * @param {string} messageId 
     * @returns {boolean}
     */
    static isReadByBot(sessionId, messageId) {
        const key = `${sessionId}:${messageId}`;
        return botReadHistory.has(key);
    }
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
     * @param {boolean} isRetry - Whether this is a retry of a previously ignored message
     */
    static async handleIncomingMessage(sock, sessionId, msg, isGroupMode = false, isRetry = false) {
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
                log(`No text content found in message from ${msg.key.remoteJid}`, sessionId, { event: 'ai-skip', reason: 'no-text' }, 'INFO');
                return;
            }

            const remoteJid = msg.key.remoteJid;
            const isGroup = remoteJid.endsWith('@g.us');
            const isTagged = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(sock.user.id.split(':')[0] + '@s.whatsapp.net');

            // 1. Check if AI should respond to tags in groups
            if (isGroup && isTagged && !isGroupMode) {
                if (parseInt(session.ai_respond_to_tags) !== 1) {
                    log(`Tag détecté mais réponse aux tags désactivée`, sessionId, { event: 'ai-skip', reason: 'tags-disabled' }, 'INFO');
                    return;
                }
                log(`Tag détecté dans ${remoteJid}, activation du mode groupe temporaire`, sessionId, { event: 'ai-tag-response' }, 'INFO');
                isGroupMode = true; // Use group profile if available
            }

            // 2. Random Protection System (Protection against spam/unpredictable AI behavior)
            // If enabled, randomly ignore messages to simulate human inconsistency or prevent bot loops
            const protectionEnabled = session.ai_random_protection_enabled ?? 1;
            const protectionRate = session.ai_random_protection_rate ?? 0.1; // 10% chance to ignore

            // If it's a retry, we bypass the random protection
            if (!isRetry && protectionEnabled && Math.random() < protectionRate) {
                const retryDelay = Math.floor(Math.random() * (300 - 60 + 1) + 60); // 60 to 300 seconds
                log(`Système de Protection : Message de ${remoteJid} ignoré aléatoirement. Planifié pour traitement ultérieur dans ${retryDelay}s.`, sessionId, { event: 'ai-random-protection-block', remoteJid, rate: protectionRate, retryIn: retryDelay }, 'INFO');
                
                // Clear any existing retry for this conversation
                const retryKey = `${sessionId}:${remoteJid}`;
                if (pendingRetries.has(retryKey)) {
                    clearTimeout(pendingRetries.get(retryKey));
                }

                // Schedule retry
                const timeout = setTimeout(() => {
                    pendingRetries.delete(retryKey);
                    log(`Traitement du message ignoré précédemment pour ${remoteJid}`, sessionId, { event: 'ai-retry-ignored', remoteJid }, 'INFO');
                    
                    // Check if conversation still needs response (no new messages from AI or human since then)
                    const history = this.getMemory(sessionId, remoteJid, 1);
                    if (history.length > 0 && history[history.length - 1].role === 'user' && history[history.length - 1].content === messageText) {
                        this.handleIncomingMessage(sock, sessionId, msg, isGroupMode, true).catch(err => {
                            log(`Erreur lors du retry du message ignoré: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
                        });
                    } else {
                        log(`Annulation du retry pour ${remoteJid} : Nouveau message détecté dans l'historique`, sessionId, { event: 'ai-retry-cancelled' }, 'DEBUG');
                    }
                }, retryDelay * 1000);

                pendingRetries.set(retryKey, timeout);
                return;
            }

            // If we are processing (either normal or retry), clear any pending retry for this JID
            const retryKey = `${sessionId}:${remoteJid}`;
            if (pendingRetries.has(retryKey)) {
                clearTimeout(pendingRetries.get(retryKey));
                pendingRetries.delete(retryKey);
            }

            // 2. Check if AI is temporarily paused for this conversation (Bug Fix: Permanent Deactivation)
            if (this.isPaused(sessionId, remoteJid)) {
                log(`Message de ${remoteJid} ignoré car l'IA est en pause temporaire pour cette conversation`, sessionId, { event: 'ai-skip', reason: 'temporary-pause' }, 'INFO');
                this.resumeForConversation(sessionId, remoteJid); // Resume for next message
                return;
            }

            // Check Human Priority (Session Window)
            // If the owner sent a message within the window, skip AI
            const windowMinutes = session.ai_session_window ?? 2;
            if (this.isOwnerActive(sessionId, remoteJid, windowMinutes)) {
                log(`Message de ${remoteJid} ignoré : Fenêtre de session active (${windowMinutes} min)`, sessionId, { event: 'ai-skip', reason: 'human-priority' }, 'INFO');
                return;
            }

            // Trigger Keywords Check (Bug Fix: Multiple Keywords support improved)
            if (session.ai_trigger_keywords) {
                // Support multiple separators: comma, semicolon, or pipe
                const keywords = session.ai_trigger_keywords
                    .split(/[;|,]/)
                    .map(k => k.trim().toLowerCase())
                    .filter(k => k);

                if (keywords.length > 0) {
                    const textLower = messageText.toLowerCase();
                    
                    // Improved matching: check if any keyword is present as a word or substring
                    // Using word boundaries \b for more precise matching if preferred, 
                    // but following original "includes" logic with better multiple support.
                    const hasKeyword = keywords.some(k => {
                        // Escape special characters for regex
                        const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Match as a whole word or at least present in text
                        const regex = new RegExp(escapedK, 'i');
                        return regex.test(textLower);
                    });

                    if (!hasKeyword) {
                        log(`Message ignoré car ne contient aucun mot-clé déclencheur parmi: ${keywords.join(', ')}`, sessionId, { event: 'ai-skip', reason: 'no-keyword', text: messageText }, 'DEBUG');
                        return;
                    }
                }
            }

            // Increment received counter
            Session.updateAIStats(sessionId, 'received');
            
            // Handle group vs private messages
            if (isGroup) {
                if (!isGroupMode) {
                    log(`Message de groupe ignoré par l'auto-répondeur IA personnel`, sessionId, { remoteJid }, 'DEBUG');
                    return;
                }
            } else if (isGroupMode) {
                // If in group mode but received a private message, skip (should not happen if called correctly)
                return;
            }

            // Optional delay before processing (humanization)
            if (session.ai_reply_delay && parseInt(session.ai_reply_delay) > 0) {
                const delayMs = parseInt(session.ai_reply_delay) * 1000;
                log(`Attente de ${session.ai_reply_delay}s avant de traiter le message (config reply_delay)`, sessionId, { event: 'ai-reply-delay', delay: delayMs }, 'INFO');
                await new Promise(resolve => setTimeout(resolve, delayMs));
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

            // Dispatch Webhook: ai_response
            WebhookService.dispatch(sessionId, 'ai_response', {
                remoteJid,
                response,
                originalMessage: messageText
            });

            log(`AI Response for ${remoteJid}: "${response.substring(0, 50)}${response.length > 50 ? '...' : ''}"`, sessionId, {
                event: 'ai-response',
                remoteJid,
                response
            }, 'INFO');

            // Optional: Mark as read before responding
            if (session.ai_read_on_reply === 1 || session.ai_read_on_reply === true) {
                try {
                    // Track this read event to avoid auto-pausing the AI
                    this.trackBotRead(sessionId, msg.key.id);
                    await sock.readMessages([msg.key]);
                    log(`Message marqué comme lu avant réponse pour ${remoteJid}`, sessionId, { event: 'ai-read-receipt' }, 'DEBUG');
                } catch (readError) {
                    log(`Échec du marquage comme lu pour ${remoteJid}: ${readError.message}`, sessionId, { event: 'ai-read-error', error: readError.message }, 'WARN');
                }
            }

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
        let { id: sessionId, ai_endpoint, ai_key, ai_model, ai_prompt, ai_temperature, ai_max_tokens, ai_constraints } = user;

        // RAG: Search knowledge base
        const knowledge = KnowledgeService.search(sessionId, userMessage);
        let ragContext = "";
        if (knowledge.length > 0) {
            ragContext = "\n\nCONTEXTE DE CONNAISSANCES RÉCUPÉRÉ :\n" + knowledge.join("\n---\n");
            log(`RAG: ${knowledge.length} extraits trouvés pour la réponse.`, sessionId, { query: userMessage }, 'DEBUG');
        }
        
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
            let finalSystemPrompt = (systemPrompt || ai_prompt || 'You are a helpful assistant.');

            // Inject strict constraints (user requirements)
            if (ai_constraints) {
                finalSystemPrompt += "\n\nEXIGENCES STRICTES À RESPECTER :\n" + ai_constraints;
            }

            if (ragContext) {
                finalSystemPrompt += "\n\nIMPORTANT : Utilise les informations du CONTEXTE DE CONNAISSANCES ci-dessus pour répondre de manière précise. Si l'information n'est pas dans le contexte, réponds avec tes connaissances générales ou demande plus de précisions.";
                finalSystemPrompt += ragContext;
            }

            const messages = [
                { role: 'system', content: finalSystemPrompt }
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
        let userId = null;
        let creditDeducted = false;

        try {
            // Check Credits before sending
            const session = Session.findById(sessionId);
            if (session && session.owner_email) {
                const user = User.findByEmail(session.owner_email);
                if (user) {
                    userId = user.id;
                    const hasCredit = CreditService.deduct(userId, 1, `AI Auto-Response to ${jid}`);
                    if (!hasCredit) {
                        log(`Insufficient credits for AI response to ${jid} (Session: ${sessionId})`, sessionId, { event: 'ai-insufficient-credits' }, 'WARN');
                        return; // Stop sending
                    }
                    creditDeducted = true;
                } else {
                    log(`User not found for session ${sessionId} (email: ${session.owner_email}) - Skipping credit check`, sessionId, null, 'WARN');
                }
            } else {
                log(`Session or owner not found for ${sessionId} - Skipping credit check`, sessionId, null, 'WARN');
            }

            // Format the text for WhatsApp before sending
            const formattedText = this.formatForWhatsApp(text);
            
            log(`Envoi de la réponse automatique à ${jid} (Session: ${sessionId})`, sessionId, { event: 'ai-sending', jid }, 'INFO');
            
            // Simulate "composing" (typing status)
            try {
                // Ensure we are subscribed to presence to send updates
                await sock.presenceSubscribe(jid);
                await sock.sendPresenceUpdate('composing', jid);
                log(`Simulation d'écriture en cours pour ${jid} (${formattedText.length} caractères)`, sessionId, { event: 'ai-typing-start', length: formattedText.length }, 'DEBUG');
            } catch (pError) {
                log(`Échec de la mise à jour de présence pour ${jid}: ${pError.message}`, sessionId, { event: 'ai-presence-error', error: pError.message }, 'WARN');
            }
            
            // Wait based on text length (simulating human typing speed: ~100ms per character)
            // Min 1.5s, Max 15s to keep it realistic but not too slow for very long messages
            const typingDelay = Math.min(Math.max(formattedText.length * 100, 1500), 15000);
            
            log(`Attente de simulation d'écriture : ${Math.round(typingDelay / 1000)}s pour ${formattedText.length} caractères`, sessionId, { event: 'ai-typing-delay', delayMs: typingDelay }, 'INFO');
            
            await new Promise(resolve => setTimeout(resolve, typingDelay));

            const result = await QueueService.enqueue(sessionId, sock, jid, { text: formattedText }, {
                skipTyping: false // QueueService handles typing simulation
            });
            
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
                
                // Refund if credit deducted but send failed
                if (creditDeducted && userId) {
                    CreditService.add(userId, 1, 'credit', `Remboursement: échec envoi IA vers ${jid}`);
                }
            }
        } catch (error) {
            log(`Échec de l'envoi du message à ${jid}: ${error.message}`, sessionId, { event: 'ai-send-error', error: error.message }, 'ERROR');
            Session.updateAIStats(sessionId, 'error', `Send error: ${error.message}`);

            // Refund if credit deducted but send failed with error
            if (creditDeducted && userId) {
                CreditService.add(userId, 1, 'credit', `Remboursement: erreur envoi IA vers ${jid}`);
            }
        }
    }
}

module.exports = AIService;
