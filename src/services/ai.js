/**
 * AI Service
 * Handles interaction with agnostic AI APIs (OpenAI, Groq, Ollama, etc.)
 * Supports Bot and Keyword modes.
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
const botSentHistory = new Set(); // Track messages sent by the bot itself
const lastOwnerActivity = new Map(); // Track last activity from the owner per JID
const pendingRetries = new Map(); // Track messages ignored by random protection for later retry
const aiResponseHistory = new Map(); // Track AI response timestamps for loop protection

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
     * @param {boolean} manual - Whether it was a manual pause by the user
     */
    static pauseForConversation(sessionId, remoteJid, manual = false) {
        const key = `${sessionId}:${remoteJid}`;
        pausedConversations.set(key, { timestamp: Date.now(), manual });
        log(`IA mise en pause ${manual ? 'MANUELLE' : 'temporaire'} pour ${remoteJid}`, sessionId, { event: 'ai-pause', manual }, 'DEBUG');
    }

    /**
     * Check if AI is paused for a specific conversation
     * @param {string} sessionId 
     * @param {string} remoteJid 
     * @returns {boolean}
     */
    static isPaused(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        const pause = pausedConversations.get(key);
        if (!pause) return false;

        // Manual pause is robust: stays paused until manual resume
        if (pause.manual) return true;

        // Auto pause (from owner activity) expires after 2 minutes of inactivity
        const diff = (Date.now() - pause.timestamp) / (1000 * 60);
        if (diff > 2) {
            pausedConversations.delete(key);
            return false;
        }
        return true;
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
     * Track that the bot is sending a specific message to avoid self-pausing
     * @param {string} sessionId
     * @param {string} messageId
     */
    static trackBotSent(sessionId, messageId) {
        if (!messageId) return;
        const key = `${sessionId}:${messageId}`;
        botSentHistory.add(key);
        // Clear after 30 seconds
        setTimeout(() => botSentHistory.delete(key), 30000);
    }

    /**
     * Check if a message was sent by the bot itself
     * @param {string} sessionId
     * @param {string} messageId
     * @returns {boolean}
     */
    static isSentByBot(sessionId, messageId) {
        const key = `${sessionId}:${messageId}`;
        return botSentHistory.has(key);
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
     * Check if we are in an AI-to-AI loop
     * @param {string} sessionId
     * @param {string} remoteJid
     * @returns {boolean}
     */
    static isLoopDetected(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        const now = Date.now();
        const history = aiResponseHistory.get(key) || [];

        // Keep only timestamps from the last 10 minutes
        const recentResponses = history.filter(ts => (now - ts) < 10 * 60 * 1000);
        aiResponseHistory.set(key, recentResponses);

        // Threshold: More than 10 responses in 10 minutes is likely a loop
        if (recentResponses.length >= 10) {
            log(`Protection anti-boucle activée pour ${remoteJid} : ${recentResponses.length} réponses en 10 min.`, sessionId, { event: 'ai-loop-block', remoteJid, count: recentResponses.length }, 'WARN');
            return true;
        }
        return false;
    }

    /**
     * Record an AI response for loop protection
     * @param {string} sessionId
     * @param {string} remoteJid
     */
    static recordAIResponse(sessionId, remoteJid) {
        const key = `${sessionId}:${remoteJid}`;
        const history = aiResponseHistory.get(key) || [];
        history.push(Date.now());
        aiResponseHistory.set(key, history);
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

            // Comprehensive Tag Detection (JID, LID, and Name)
            const myJid = (sock.user.id || "").split(':')[0] + '@s.whatsapp.net';
            const myLid = sock.user.lid || sock.user.LID;
            const myName = sock.user.name || "Bot";

            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            const isTagged = mentionedJids.includes(myJid) ||
                             (myLid && mentionedJids.includes(myLid)) ||
                             messageText.includes('@' + sock.user.id.split(':')[0]) ||
                             (myLid && messageText.includes('@' + myLid.split(':')[0])) ||
                             messageText.toLowerCase().includes('@' + myName.toLowerCase());

            // --- RESTRICTION GROUPE (SÉCURITÉ FINANCIÈRE) ---
            if (isGroup) {
                // 1. On vérifie si on est admin du groupe
                const modService = require('./moderation');
                try {
                    const groupMetadata = await modService.getGroupMetadata(sock, remoteJid);
                    const botIsAdmin = modService.isGroupAdmin(groupMetadata, myJid, myLid, sessionId);

                    if (!botIsAdmin) {
                        // log(`IA ignorée : Le bot n'est pas admin du groupe ${remoteJid}`, sessionId, { event: 'ai-skip-not-admin' }, 'DEBUG');
                        return;
                    }
                } catch (e) {
                    // log(`IA ignorée : Impossible de vérifier le statut admin pour ${remoteJid}`, sessionId, { event: 'ai-skip-meta-error' }, 'WARN');
                    return;
                }

                // 2. On ne répond QUE si on est tagué (ou si mode assistant forcé)
                if (!isTagged && !isGroupMode) {
                    return;
                }
            }

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

            // 2. Check if AI is temporarily paused for this conversation
            if (this.isPaused(sessionId, remoteJid)) {
                log(`Message de ${remoteJid} ignoré car l'IA est en pause pour cette conversation`, sessionId, { event: 'ai-skip', reason: 'temporary-pause' }, 'INFO');
                return;
            }

            // 3. Loop Protection
            if (this.isLoopDetected(sessionId, remoteJid)) {
                log(`Message de ${remoteJid} ignoré : Boucle IA potentielle détectée`, sessionId, { event: 'ai-skip', reason: 'loop-protection' }, 'WARN');
                return;
            }

            // Check Human Priority (Session Window)
            // If the owner sent a message within the window, skip AI
            const windowMinutes = session.ai_session_window ?? 2;
            if (this.isOwnerActive(sessionId, remoteJid, windowMinutes)) {
                log(`Message de ${remoteJid} ignoré : Fenêtre de session active (${windowMinutes} min)`, sessionId, { event: 'ai-skip', reason: 'human-priority' }, 'INFO');
                return;
            }

            // Trigger Keywords Check (Section 2.1 - Keyword Mode)
            // If mode is 'keyword', we MUST match a keyword.
            // If mode is 'bot', we match keywords ONLY IF trigger_keywords is not empty.
            const isKeywordMode = session.ai_mode === 'keyword';

            if (isKeywordMode || session.ai_trigger_keywords) {
                // Support multiple separators: comma, semicolon, or pipe
                const keywords = (session.ai_trigger_keywords || "")
                    .split(/[;|,]/)
                    .map(k => k.trim().toLowerCase())
                    .filter(k => k);

                if (keywords.length > 0 || isKeywordMode) {
                    if (keywords.length === 0 && isKeywordMode) {
                        log(`Mode mot-clé activé mais aucun mot-clé configuré pour ${sessionId}`, sessionId, { event: 'ai-skip', reason: 'empty-keywords' }, 'WARN');
                        return;
                    }

                    if (keywords.length > 0) {
                        const textLower = messageText.toLowerCase();

                        // Improved matching: check if any keyword is present as a word or substring
                        const hasKeyword = keywords.some(k => {
                            try {
                                const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                const regex = new RegExp(escapedK, 'i');
                                return regex.test(textLower);
                            } catch (e) {
                                return textLower.includes(k);
                            }
                        });

                        if (!hasKeyword) {
                            log(`Message ignoré car ne contient aucun mot-clé déclencheur parmi: ${keywords.join(', ')}`, sessionId, { event: 'ai-skip', reason: 'no-keyword', text: messageText }, 'DEBUG');
                            return;
                        }
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
            // Note: QueueService also adds a 1-3s delay.
            if (session.ai_reply_delay && parseInt(session.ai_reply_delay) > 0) {
                const delayMs = parseInt(session.ai_reply_delay) * 1000;
                // log(`Attente de ${session.ai_reply_delay}s avant de traiter le message`, sessionId, { event: 'ai-reply-delay', delay: delayMs }, 'INFO');
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

            // Intercept Cal.com commands
            let finalResponse = response;
            const user = session.owner_email ? User.findByEmail(session.owner_email) : null;

            if (user && user.ai_cal_enabled && user.cal_access_token) {
                const CalService = require('./CalService');

                // 1. [CAL_CHECK:YYYY-MM-DD]
                const checkMatch = finalResponse.match(/\[CAL_CHECK:([\d-]{10})\]/);
                if (checkMatch) {
                    const date = checkMatch[1];
                    const eventTypes = await CalService.getEventTypes(user.id);
                    if (Array.isArray(eventTypes) && eventTypes.length > 0) {
                        const eventTypeId = eventTypes[0].id; // Use first event type as default
                        const startTime = `${date}T00:00:00Z`;
                        const endTime = `${date}T23:59:59Z`;
                        const slots = await CalService.getAvailability(user.id, eventTypeId, startTime, endTime);

                        let slotsText = (slots && slots.length > 0)
                            ? `Voici les disponibilités pour le ${date} :\n` + slots.slice(0, 5).map(s => `- ${new Date(s.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`).join('\n')
                            : `Désolé, aucune disponibilité pour le ${date}.`;

                        finalResponse = finalResponse.replace(/\[CAL_CHECK:[\d-]{10}\]/, slotsText);
                    }
                }

                // 2. [CAL_BOOK:YYYY-MM-DD HH:mm,Nom,Email,Motif]
                const bookMatch = finalResponse.match(/\[CAL_BOOK:([^,]+),([^,]+),([^,]+),?([^\]]*)\]/);
                if (bookMatch) {
                    const [_, dateTime, name, email, notes] = bookMatch;
                    const eventTypes = await CalService.getEventTypes(user.id);
                    if (Array.isArray(eventTypes) && eventTypes.length > 0) {
                        try {
                            const startTime = new Date(dateTime).toISOString();
                            const booking = await CalService.createBooking(user.id, {
                                eventTypeId: eventTypes[0].id,
                                start: startTime,
                                name: name.trim(),
                                email: email.trim(),
                                notes: (notes || "").trim()
                            });

                            let confirmationText = `✅ Rendez-vous confirmé pour le ${new Date(startTime).toLocaleString()} !`;
                            if (booking && booking.videoCallUrl) {
                                confirmationText += `\nLien vidéo : ${booking.videoCallUrl}`;
                            }

                            finalResponse = finalResponse.replace(/\[CAL_BOOK:[^\]]+\]/, confirmationText);
                        } catch (err) {
                            finalResponse = finalResponse.replace(/\[CAL_BOOK:[^\]]+\]/, "Désolé, une erreur est survenue lors de la réservation. Le créneau est peut-être déjà pris.");
                        }
                    }
                }
            }

            // Store assistant response in memory
            await this.storeMemory(sessionId, remoteJid, 'assistant', finalResponse);

            // Dispatch Webhook: ai_response
            WebhookService.dispatch(sessionId, 'ai_response', {
                remoteJid,
                response: finalResponse,
                originalMessage: messageText
            });

            log(`AI Response for ${remoteJid}: "${finalResponse.substring(0, 50)}${finalResponse.length > 50 ? '...' : ''}"`, sessionId, {
                event: 'ai-response',
                remoteJid,
                response: finalResponse
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
            await this.sendAutoResponse(sock, remoteJid, finalResponse, sessionId);

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

        // Identify valid session key (not placeholder)
        const hasValidSessionKey = ai_key && ai_key !== 'YOUR_API_KEY_HERE' && ai_key.trim() !== '';

        // RAG: Search knowledge base
        const knowledge = KnowledgeService.search(sessionId, userMessage);
        let ragContext = "";
        if (knowledge.length > 0) {
            ragContext = "\n\nCONTEXTE DE CONNAISSANCES RÉCUPÉRÉ :\n" + knowledge.join("\n---\n");
            log(`RAG: ${knowledge.length} extraits trouvés pour la réponse.`, sessionId, { query: userMessage }, 'DEBUG');
        }
        
        let resolvedEndpoint = ai_endpoint;
        let resolvedKey = ai_key;
        let resolvedModelName = ai_model;
        let resolvedTemp = ai_temperature;
        let resolvedMaxTokens = ai_max_tokens;

        // If no model is set, try to get the global default model
        if (!ai_model) {
            const defaultModel = AIModel.getDefault();
            if (defaultModel) {
                resolvedEndpoint = defaultModel.endpoint;
                resolvedKey = hasValidSessionKey ? ai_key : defaultModel.api_key;
                resolvedModelName = defaultModel.model_name;
                resolvedTemp = ai_temperature ?? defaultModel.temperature;
                resolvedMaxTokens = ai_max_tokens ?? defaultModel.max_tokens;
            }
        }
        // If ai_model && ai_model looks like a model ID (UUID), use the global model configuration
        else if (ai_model && ai_model.length > 30) {
            const globalModel = AIModel.findById(ai_model);
            if (globalModel && globalModel.is_active) {
                log(`Utilisation du modèle global: ${globalModel.name}`, user.id, { modelId: ai_model }, 'DEBUG');
                resolvedEndpoint = globalModel.endpoint;
                resolvedKey = hasValidSessionKey ? ai_key : globalModel.api_key;
                resolvedModelName = globalModel.model_name;
                resolvedTemp = ai_temperature ?? globalModel.temperature;
                resolvedMaxTokens = ai_max_tokens ?? globalModel.max_tokens;
            }
        }

        // Default to DeepSeek if not configured, as per specs "DeepSeek (Gratuit)"
        let finalEndpoint = resolvedEndpoint || 'https://api.deepseek.com/v1/chat/completions';
        let finalKey = (resolvedKey && resolvedKey !== 'YOUR_API_KEY_HERE' && resolvedKey.trim() !== '') ? resolvedKey : process.env.DEEPSEEK_API_KEY;
        let finalModel = resolvedModelName || 'deepseek-chat';
        let finalTemperature = resolvedTemp ?? 0.7;
        let finalMaxTokens = resolvedMaxTokens ?? 1000;

        if (!finalKey || finalKey === 'YOUR_API_KEY_HERE' || finalKey.trim() === '') {
            log('ATTENTION: Clé API IA manquante ou non configurée', user.id, { event: 'ai-config-missing-key' }, 'WARN');
            return "Désolé, mon service d'IA n'est pas encore configuré correctement par l'administrateur. Veuillez vérifier la clé API du modèle par défaut.";
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

            const systemPrompt = `Tu es un expert en engagement et animation de groupes WhatsApp. Ton but est de rédiger un message engageant, pertinent et percutant.
            
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

        // 5. List markers: convert Markdown lists to WhatsApp bullet points
        // Doing this before italics to avoid conflict with "*"
        formatted = formatted.replace(/^[\s]*[\*\-][\s]+(.*)$/gm, '• $1');

        // 6. Italics: *text* or _text_ -> _text_
        // Match single * or _ that are NOT part of our placeholders
        formatted = formatted.replace(/(^|[^\*])\*([^\*\n§«»]+)\*([^\*]|$)/g, '$1_$2_$3');
        formatted = formatted.replace(/(^|[^_])_([^_ \n§«»]+)_([^_]|$)/g, '$1_$2_$3');

        // 7. Strikethrough: ~~text~~ -> ~text~
        formatted = formatted.replace(/~~(.*?)~~/g, '~$1~');

        // 8. Convert bold placeholders to *
        formatted = formatted.replace(/§B§/g, '*');

        // 9. Re-insert protected code at the very end
        inlineCodes.forEach((code, i) => {
            formatted = formatted.replace(`«IC${i}»`, `\`\`\`${code}\`\`\``);
        });
        codeBlocks.forEach((code, i) => {
            formatted = formatted.replace(`«CB${i}»`, `\`\`\`${code}\`\`\``);
        });

        // 10. Clean up multiple empty lines (max 2)
        formatted = formatted.replace(/\n{3,}/g, '\n\n');

        return formatted.trim();
    }

    /**
     * Sends the response with human-like simulation
     */
    static async sendAutoResponse(sock, jid, text, sessionId) {
        if (!text) return;
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
            
            // Note: We delegate typing simulation and human delays to QueueService to prevent blocking the worker
            const result = await QueueService.enqueue(sessionId, sock, jid, { text: formattedText }, {
                skipTyping: false
            });
            
            if (result) {
                log(`Message envoyé avec succès à ${jid}`, sessionId, { event: 'ai-sent', jid }, 'INFO');
                Session.updateAIStats(sessionId, 'sent');
                this.recordAIResponse(sessionId, jid);

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
