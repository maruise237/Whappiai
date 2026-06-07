const { db } = require('../config/database');
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const { Session, ActivityLog, User } = require('../models');
const { log } = require('../utils/logger');
const wappy = require('./WappyEventBroadcaster');
const CreditService = require('./CreditService');
const QueueService = require('./QueueService');
const WarningService = require('./warnings');

/**
 * Moderation Service
 * Handles group moderation logic (Anti-spam, Anti-link, Bad words)
 */

// Simple cache for group metadata to avoid over-fetching
const groupMetadataCache = new Map();

/**
 * Get group metadata with caching and retry logic
 * @param {object} sock
 * @param {string} groupId
 * @returns {Promise<object>}
 */
async function getGroupMetadata(sock, groupId) {
    if (!sock?.user?.id) throw new Error('Socket not ready');

    const cacheKey = `${sock.user.id}:${groupId}`;
    const cached = groupMetadataCache.get(cacheKey);

    // Cache for 10 minutes for stability
    if (cached && (Date.now() - cached.timestamp < 600000)) {
        return cached.data;
    }

    try {
        const metadata = await Promise.race([
            sock.groupMetadata(groupId),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Metadata timeout')), 10000))
        ]);

        groupMetadataCache.set(cacheKey, {
            data: metadata,
            timestamp: Date.now()
        });
        return metadata;
    } catch (err) {
        if (cached) {
            log(`Échec groupMetadata pour ${groupId}, utilisation du cache expiré par sécurité`, 'SYSTEM', { error: err.message }, 'DEBUG');
            return cached.data;
        }
        throw err;
    }
}

// Helper to check if a user is admin
function isGroupAdmin(groupMetadata, myJid, myLid, sessionId) {
    if (!groupMetadata.participants) {
        log(`Pas de liste de participants pour le groupe ${groupMetadata.id || groupMetadata.subject}`, sessionId, { 
            event: 'moderation-debug-no-participants',
            groupId: groupMetadata.id,
            subject: groupMetadata.subject
        }, 'DEBUG');
        return false;
    }
    
    const normalizedTarget = jidNormalizedUser(myJid);
    const normalizedLid = myLid ? jidNormalizedUser(myLid) : null;

    const participant = groupMetadata.participants.find(p => {
        const pId = jidNormalizedUser(p.id);
        return pId === normalizedTarget || (normalizedLid && pId === normalizedLid);
    });
    
    if (!participant) {
        return false;
    }
    
    // Baileys roles: 'admin' (admin), 'superadmin' (créateur), null (membre)
    const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
    
    if (isAdmin) {
        log(`Admin détecté pour le groupe ${groupMetadata.subject} (${groupMetadata.id})`, sessionId, {
            event: 'moderation-debug-admin-found',
            role: participant.admin,
            matchedId: participant.id,
            myJid: normalizedTarget,
            myLid: normalizedLid
        }, 'DEBUG');
    }
    
    return !!isAdmin;
}

/**
 * Get all groups where the session is an admin
 * @param {object} sock - Baileys socket instance
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} List of admin groups
 */
async function getAdminGroups(sock, sessionId) {
    try {
        if (!sock) {
            log(`Échec de récupération des groupes: Socket inexistant pour ${sessionId}`, sessionId, { event: 'moderation-error-no-sock' }, 'ERROR');
            throw new Error('Socket non initialisé');
        }

        if (!sock.user) {
            const wsState = sock.ws?.readyState;
            const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
            const stateName = wsState !== undefined ? stateNames[wsState] : 'UNKNOWN';
            
            log(`Échec de récupération des groupes: Socket non authentifié pour ${sessionId}`, sessionId, { 
                event: 'moderation-error-not-authed',
                sockState: wsState,
                sockStateName: stateName
            }, 'ERROR');
            throw new Error(`WhatsApp non connecté (Statut: ${stateName})`);
        }

        log(`Récupération des groupes pour la session ${sessionId}...`, sessionId, { event: 'moderation-fetch-start' }, 'DEBUG');
        
        // Use a timeout for group fetching to prevent hanging
        const groups = await Promise.race([
            sock.groupFetchAllParticipating(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Le délai de récupération des groupes WhatsApp a expiré (30s).')), 30000))
        ]);

        if (!sock.user?.id) {
            throw new Error('Identifiant WhatsApp introuvable sur la session active.');
        }

        const myJid = jidNormalizedUser(sock.user.id);
        const myLid = sock.user.lid || sock.user.LID;
        log(`Mon JID: ${myJid}, Mon LID: ${myLid || 'Non défini'}`, sessionId, { 
            event: 'moderation-debug-ids',
            userObj: { id: sock.user.id, lid: sock.user.lid, name: sock.user.name }
        }, 'DEBUG');
        
        const allGroupsCount = Object.keys(groups || {}).length;
        log(`${allGroupsCount} groupes au total trouvés pour ${sessionId}`, sessionId, { event: 'moderation-groups-total', count: allGroupsCount }, 'DEBUG');
        
        const adminGroups = [];
        const allGroups = Object.values(groups || {});
        
        if (allGroups.length > 0) {
            // Find a group where I am present (any role) to check JID or LID matching
            const anyGroupWithMe = allGroups.find(g => g.participants?.some(p => {
                const pId = jidNormalizedUser(p.id);
                return pId === myJid || (myLid && pId === jidNormalizedUser(myLid));
            }));
            if (anyGroupWithMe) {
                const meInGroup = anyGroupWithMe.participants.find(p => {
                    const pId = jidNormalizedUser(p.id);
                    return pId === myJid || (myLid && pId === jidNormalizedUser(myLid));
                });
                log(`Trouvé dans le groupe "${anyGroupWithMe.subject}": Rôle=${meInGroup.admin || 'membre'}`, sessionId, { 
                    event: 'moderation-debug-me',
                    group: anyGroupWithMe.subject,
                    role: meInGroup.admin,
                    myJidInGroup: meInGroup.id,
                    myJidNormalized: myJid,
                    myLidNormalized: myLid ? jidNormalizedUser(myLid) : null
                }, 'DEBUG');
            } else {
                log(`ALERTE: Mon JID (${myJid}) ou LID (${myLid || 'N/A'}) n'a été trouvé dans AUCUN des ${allGroups.length} groupes !`, sessionId, { 
                    event: 'moderation-debug-notfound',
                    myJid: myJid,
                    myLid: myLid,
                    firstGroupParticipants: allGroups[0].participants?.slice(0, 5).map(p => p.id)
                }, 'WARN');
            }
        }
        
        if (allGroups.length === 0) {
            log(`Aucun groupe trouvé pour la session ${sessionId}`, sessionId, { event: 'moderation-no-groups' }, 'INFO');
            return [];
        }

        const adminGroupIds = [];
        const adminGroupsData = [];

        for (const [id, metadata] of Object.entries(groups)) {
            let currentMetadata = metadata;
            
            // Si les participants manquent, essayer de récupérer les métadonnées fraîches
            if (!currentMetadata.participants || currentMetadata.participants.length === 0) {
                try {
                    log(`Métadonnées incomplètes pour ${id}, récupération forcée...`, sessionId, { event: 'moderation-fetch-metadata', groupId: id }, 'DEBUG');
                    currentMetadata = await sock.groupMetadata(id);
                } catch (metaErr) {
                    log(`Impossible de récupérer les métadonnées pour ${id}: ${metaErr.message}`, sessionId, { event: 'moderation-fetch-metadata-error', groupId: id }, 'WARN');
                }
            }

            const isAdmin = isGroupAdmin(currentMetadata, myJid, myLid, sessionId);
            
            if (isAdmin) {
                adminGroupIds.push(id);
                adminGroupsData.push({ id, currentMetadata });
            }
        }

        // Fetch settings for all admin groups in bulk to avoid N+1 queries
        const settingsMap = new Map();
        if (adminGroupIds.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < adminGroupIds.length; i += chunkSize) {
                const chunk = adminGroupIds.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => '?').join(',');
                const query = `SELECT * FROM group_settings WHERE session_id = ? AND group_id IN (${placeholders})`;
                const chunkSettings = db.prepare(query).all(sessionId, ...chunk);
                for (const setting of chunkSettings) {
                    settingsMap.set(setting.group_id, setting);
                }
            }
        }

        for (const { id, currentMetadata } of adminGroupsData) {
            const settings = settingsMap.get(id);
            adminGroups.push({
                id,
                subject: currentMetadata.subject,
                creation: currentMetadata.creation,
                desc: currentMetadata.desc,
                participantsCount: currentMetadata.participants?.length || 0,
                settings: settings || {
                    is_active: 0,
                    anti_link: 0,
                    bad_words: '',
                    warning_template: '@{{name}} votre message a ete supprime: {{reason}}. Avertissement {{count}}/{{max}}. Il reste {{remaining}} avertissement(s) avant exclusion.',
                    warnings_enabled: 0,
                    auto_kick_enabled: 0,
                    max_warnings: 3
                }
            });
        }
        
        log(`${adminGroups.length} groupes administrés trouvés pour ${sessionId}`, sessionId, { 
            event: 'moderation-fetch-success', 
            count: adminGroups.length 
        }, 'INFO');

        return adminGroups;
    } catch (error) {
        log(`Erreur lors de la récupération des groupes pour ${sessionId}: ${error.message}`, sessionId, { 
            event: 'moderation-fetch-error', 
            error: error.message,
            stack: error.stack 
        }, 'ERROR');
        throw error;
    }
}

/**
 * Update group moderation settings
 * @param {string} sessionId 
 * @param {string} groupId 
 * @param {object} settings 
 */
function updateGroupSettings(sessionId, groupId, settings) {
    // Map frontend fields (warning_threshold, banned_words, welcome_message) to DB columns
    const is_active = settings.is_active ? 1 : 0;
    const anti_link = settings.anti_link ? 1 : 0;
    const bad_words = settings.bad_words || settings.banned_words || "";
    const warning_template = settings.warning_template || "@{{name}} votre message a ete supprime: {{reason}}. Avertissement {{count}}/{{max}}. Il reste {{remaining}} avertissement(s) avant exclusion.";
    const warnings_enabled = settings.warnings_enabled === undefined ? 1 : (settings.warnings_enabled ? 1 : 0);
    const auto_kick_enabled = settings.auto_kick_enabled ? 1 : 0;
    const max_warnings = settings.max_warnings || settings.warning_threshold || 3;
    const warning_reset_days = settings.warning_reset_days || 0;
    const welcome_enabled = settings.welcome_enabled ? 1 : 0;
    const welcome_template = settings.welcome_template || settings.welcome_message || "";
    const welcome_digest_enabled = settings.welcome_digest_enabled ? 1 : 0;
    const welcome_digest_time = settings.welcome_digest_time || "18:00";
    const ai_assistant_enabled = settings.ai_assistant_enabled ? 1 : 0;
    
    log(`Mise à jour des paramètres de modération pour le groupe ${groupId}`, sessionId, { 
        event: 'moderation-config-update',
        settings: { is_active, anti_link, bad_words, warnings_enabled, auto_kick_enabled, max_warnings, welcome_enabled, welcome_digest_enabled, welcome_digest_time, ai_assistant_enabled, warning_reset_days }
    }, 'INFO');

    const stmt = db.prepare(`
        INSERT INTO group_settings (group_id, session_id, is_active, anti_link, bad_words, warning_template, warnings_enabled, auto_kick_enabled, max_warnings, welcome_enabled, welcome_template, welcome_digest_enabled, welcome_digest_time, ai_assistant_enabled, warning_reset_days, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(group_id, session_id) DO UPDATE SET
        is_active = excluded.is_active,
        anti_link = excluded.anti_link,
        bad_words = excluded.bad_words,
        warning_template = excluded.warning_template,
        warnings_enabled = excluded.warnings_enabled,
        auto_kick_enabled = excluded.auto_kick_enabled,
        max_warnings = excluded.max_warnings,
        welcome_enabled = excluded.welcome_enabled,
        welcome_template = excluded.welcome_template,
        welcome_digest_enabled = excluded.welcome_digest_enabled,
        welcome_digest_time = excluded.welcome_digest_time,
        ai_assistant_enabled = excluded.ai_assistant_enabled,
        warning_reset_days = excluded.warning_reset_days,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(groupId, sessionId, is_active, anti_link, bad_words, warning_template, warnings_enabled, auto_kick_enabled, max_warnings, welcome_enabled, welcome_template, welcome_digest_enabled, welcome_digest_time, ai_assistant_enabled, warning_reset_days);
}

/**
 * Handle participant updates (welcome messages)
 * @param {object} sock 
 * @param {string} sessionId 
 * @param {object} update 
 */
async function handleParticipantUpdate(sock, sessionId, update) {
    const { id: groupId, participants, action } = update;
    
    if (action !== 'add') return;
    
    try {
        const settings = db.prepare('SELECT * FROM group_settings WHERE group_id = ? AND session_id = ?').get(groupId, sessionId);
        
        if (!settings || !settings.welcome_enabled || !settings.welcome_template) {
            return;
        }

        const groupMetadata = await getGroupMetadata(sock, groupId);
        const groupService = require('./groups');
        const profile = groupService.getProfile(sessionId, groupId);
        const links = groupService.getProductLinks(sessionId, groupId);
        
        // Check Credits
        const session = Session.findById(sessionId);
        let user = null;
        if (session && session.owner_email) {
            user = User.findByEmail(session.owner_email);
        }

        for (const jid of participants) {
            let creditDeducted = false;
            if (user) {
                const hasCredit = CreditService.deduct(user.id, 1, `Moderation: Welcome message to ${jid}`);
                if (!hasCredit) {
                    log(`Insufficient credits for welcome message to ${jid} (Session: ${sessionId})`, sessionId, { event: 'moderation-insufficient-credits' }, 'WARN');
                    continue; // Skip this user
                }
                creditDeducted = true;
            } else {
                log(`User not found for session ${sessionId} - Skipping credit check for welcome`, sessionId, null, 'WARN');
            }

            let message = settings.welcome_template;
            
            // Basic variables
            message = message
                .replace(/{{name}}/g, `${jid.split('@')[0]}`)
                .replace(/{{group_name}}/g, groupMetadata.subject)
                .replace(/{{date}}/g, new Date().toLocaleDateString('fr-FR'))
                .replace(/{{rules}}/g, profile?.rules || groupMetadata.desc || 'Pas de règles spécifiées.');

            // Product links integration
            if (links.length > 0) {
                let linksText = "\n\n*Nos produits/liens :*\n";
                links.forEach(link => {
                    linksText += `\n📌 *${link.title}*\n${link.description}\n🔗 ${link.url}\n👉 ${link.cta}\n`;
                });
                message += linksText;
            }

            try {
                // Formatting is now handled in QueueService or before enqueue
                await QueueService.enqueue(sessionId, sock, groupId, {
                    text: message,
                    mentions: [jid]
                });
                
                // Log activity
                const session = Session.findById(sessionId);
                if (ActivityLog && session) {
                    await ActivityLog.logMessageSend(
                        session.owner_email || 'moderation-system',
                        sessionId,
                        groupId,
                        'text',
                        '127.0.0.1',
                        'Moderation (Welcome)'
                    );
                }
                // Update stats
                Session.updateAIStats(sessionId, 'sent');
                
                log(`[Bienvenue] Message envoyé à ${jid} dans ${groupId}`, sessionId, { event: 'moderation-welcome-sent' }, 'INFO');
            } catch (sendErr) {
                log(`Failed to send welcome message to ${jid}: ${sendErr.message}`, sessionId, { event: 'moderation-welcome-send-error', error: sendErr.message }, 'ERROR');
                // Refund if failed
                if (creditDeducted && user) {
                    CreditService.add(user.id, 1, 'credit', `Remboursement: échec bienvenue ${jid}`);
                }
            }
        }
    } catch (err) {
        log(`Erreur lors de l'envoi du message de bienvenue: ${err.message}`, sessionId, { event: 'moderation-welcome-error', error: err.message }, 'ERROR');
    }
}

/**
 * Handle incoming message for moderation
 * @param {object} sock 
 * @param {string} sessionId 
 * @param {object} msg 
 * @returns {Promise<boolean>} True if message was handled/blocked
 */
async function handleIncomingMessage(sock, sessionId, msg) {
    // Only handle group messages
    if (!msg.key.remoteJid.endsWith('@g.us')) return false;
    
    const groupId = msg.key.remoteJid;
    const senderJid = jidNormalizedUser(msg.key.participant || msg.participant || msg.key.remoteJid);
    
    // 1. Get Settings
    const settings = db.prepare('SELECT * FROM group_settings WHERE group_id = ? AND session_id = ?').get(groupId, sessionId);

    const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const isTagged = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.includes(myJid);
    
    // 2. Check for AI Assistant (Section 2.6) - Can run even if moderation is inactive
    // We do this BEFORE moderation if it's a question, or AFTER if it's not a violation
    const text = msg.message?.conversation || 
                msg.message?.extendedTextMessage?.text || 
                msg.message?.imageMessage?.caption || 
                msg.message?.videoMessage?.caption || "";

    const isQuestion = text.includes('?') || /comment|pourquoi|quand|quel|quelle|où|est-ce que|aide|info|besoin/i.test(text);
    
    // Si on est tagué, AIService.js s'en occupera via whatsapp.js -> AIService.handleIncomingMessage
    // On ne déclenche ici que si assistant_enabled ET question ET non-tagué (si on veut ce comportement)
    // MAIS l'utilisateur dit "ne répond que s'il est tage", donc on devrait peut-être désactiver ce déclencheur automatique.

    // 3. Moderation Logic
    if (!settings || !settings.is_active) {
        return false;
    }

    // Get User for Credit Check
    const session = Session.findById(sessionId);
    let user = null;
    if (session && session.owner_email) {
        user = User.findByEmail(session.owner_email);
    }

    log(`[Modération] Vérification pour ${senderJid} dans ${groupId}`, sessionId, { event: 'moderation-check' }, 'INFO');

    // Check if sender is admin (admins are immune)
    try {
        const myJid = jidNormalizedUser(sock.user.id);
        const myLid = sock.user.lid || sock.user.LID;

        const groupMetadata = await getGroupMetadata(sock, groupId);
        if (isGroupAdmin(groupMetadata, senderJid, null, sessionId)) {
            log(`[Modération] ${senderJid} est admin, immunisé.`, sessionId, { event: 'moderation-skip-admin' }, 'DEBUG');
            return false; // Admins are immune
        }
        
        // Content Analysis
        const text = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || 
                    msg.message?.imageMessage?.caption || 
                    msg.message?.videoMessage?.caption || "";
                    
        if (!text) return false;
        
        let violation = null;
        
        // 1. Anti-Link Check
        if (settings.anti_link) {
            const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/gi;
            if (linkRegex.test(text)) {
                violation = 'Lien non autorisé';
            }
        }
        
        // 2. Bad Words Check
    if (!violation && (settings.bad_words || settings.bad_words === "")) {
        const badWords = (settings.bad_words || "").split(',').map(w => w.trim().toLowerCase()).filter(w => w);
            const lowerText = text.toLowerCase();
        if (badWords.length > 0 && badWords.some(word => lowerText.includes(word))) {
                violation = 'Langage inapproprié';
            }
        }
        
        if (violation) {
            log(`Violation détectée dans ${groupId} par ${senderJid}: ${violation}`, sessionId, {
                event: 'moderation-violation',
                groupId,
                senderJid,
                violation
            }, 'WARN');
            
            // Check if BOT is admin before trying to delete/kick
            const botIsAdmin = isGroupAdmin(groupMetadata, myJid, myLid, sessionId);
            
            if (!botIsAdmin) {
                log(`[Modération] Violation détectée mais le bot n'est pas admin dans ${groupId}. Action impossible.`, sessionId, { event: 'moderation-no-admin-privilege' }, 'WARN');
                return false;
            }

            // CREDIT DEDUCTION
            let creditDeducted = false;
            if (user) {
                const hasCredit = CreditService.deduct(user.id, 1, `Moderation: Action on ${senderJid} in ${groupId}`);
                if (!hasCredit) {
                    log(`Insufficient credits for moderation action on ${senderJid} (Session: ${sessionId})`, sessionId, { event: 'moderation-insufficient-credits' }, 'WARN');
                    return false; // Stop moderation
                }
                creditDeducted = true;
            }
            
            try {
                // 1. Delete Message (High priority for moderation)
                await QueueService.enqueue(sessionId, sock, groupId, { delete: msg.key }, { priority: 'high' });
                wappy.linkBlocked(groupId, sessionId);

                if (settings.warnings_enabled === 0) {
                    return true;
                }
                
                // 2. Increment Warnings with automatic reset check
                const resetDays = settings.warning_reset_days || 0;

                let warningInfo;
                if (resetDays > 0) {
                    // Check if we should reset
                    const lastWarn = db.prepare("SELECT last_warning_at, count FROM user_warnings WHERE group_id = ? AND session_id = ? AND user_id = ?").get(groupId, sessionId, senderJid);
                    if (lastWarn) {
                        const lastDate = new Date(lastWarn.last_warning_at);
                        const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                        if (diffDays >= resetDays) {
                            log(`Remise à 0 des avertissements pour ${senderJid} (${diffDays.toFixed(1)} jours écoulés)`, sessionId, { groupId });
                            db.prepare("UPDATE user_warnings SET count = 0 WHERE group_id = ? AND session_id = ? AND user_id = ?").run(groupId, sessionId, senderJid);
                        }
                    }
                }

                warningInfo = db.prepare(`
                    INSERT INTO user_warnings (group_id, session_id, user_id, count, last_warning_at)
                    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
                    ON CONFLICT(group_id, session_id, user_id) DO UPDATE SET
                    count = count + 1,
                    last_warning_at = CURRENT_TIMESTAMP
                    RETURNING count
                `).get(groupId, sessionId, senderJid);
                
                const currentCount = warningInfo.count;
                const maxWarnings = settings.max_warnings || 3;
                
                // 3. Kick if max reached
                if (settings.auto_kick_enabled && currentCount >= maxWarnings) {
                    log(`User ${senderJid} kicked from ${groupId} after ${currentCount} warnings`, sessionId, {
                        event: 'moderation-kick',
                        groupId,
                        senderJid,
                        warnings: currentCount
                    }, 'ERROR');

                    // Send exclusion message BEFORE removing (sinon le message ne part pas)
                    const exclusionMsg = WarningService.composeExclusionMessage({
                        senderJid,
                        currentCount,
                        maxWarnings,
                        reason: violation
                    });
                    await QueueService.enqueue(sessionId, sock, groupId, {
                        text: exclusionMsg,
                        mentions: [senderJid]
                    }, { priority: 'high' });

                    // Remove member ONLY after message is sent
                    await sock.groupParticipantsUpdate(groupId, [senderJid], 'remove');

                    // Log activity
                    const session = Session.findById(sessionId);
                    if (ActivityLog && session) {
                        await ActivityLog.logMessageSend(
                            session.owner_email || 'moderation-system',
                            sessionId,
                            groupId,
                            'text',
                            '127.0.0.1',
                            'Moderation (Kick)'
                        );
                    }
                    // Update stats
                    Session.updateAIStats(sessionId, 'sent');
                } else {
                    // 4. Send Warning
                    const warningMsg = WarningService.composeWarningMessage({
                        template: settings.warning_template,
                        senderJid,
                        currentCount,
                        maxWarnings,
                        reason: violation
                    });

                    await QueueService.enqueue(sessionId, sock, groupId, {
                        text: warningMsg,
                        mentions: [senderJid]
                    }, { priority: 'high' });
                    
                    // Log activity
                    const session = Session.findById(sessionId);
                    if (ActivityLog && session) {
                        await ActivityLog.logMessageSend(
                            session.owner_email || 'moderation-system',
                            sessionId,
                            groupId,
                            'text',
                            '127.0.0.1',
                            'Moderation (Warning)'
                        );
                    }
                    // Update stats
                    Session.updateAIStats(sessionId, 'sent');
                }
            } catch (err) {
                log(`Erreur lors de l'action de modération: ${err.message}`, sessionId, { event: 'moderation-action-error', error: err.message }, 'ERROR');
                
                // Refund if failed
                if (creditDeducted && user) {
                    CreditService.add(user.id, 1, 'credit', `Remboursement: échec modération ${groupId}`);
                }
            }

            
            return true; // Message handled
        }
        
    } catch (err) {
        log(`Error processing message for moderation: ${err.message}`, sessionId, {
            event: 'moderation-error',
            error: err.message
        }, 'ERROR');
        // Log error to session stats if possible
        try {
            Session.updateAIStats(sessionId, 'error', `Moderation Error: ${err.message}`);
        } catch (logErr) {
            // Ignore logging errors
        }
    }
    
    return false;
}

/**
 * Handle incoming message for moderation (Provider-aware version, no Baileys sock)
 * Called by the Evolution webhook handler on MESSAGES_UPSERT.
 *
 * @param {string} sessionId
 * @param {Object} msg - Evolution message format { key, message, pushName, ... }
 * @param {Object} [extra] - { groupId, senderJid, plainText }
 */
async function handleIncomingMessageProvider(sessionId, msg, extra = {}) {
    const groupId = extra.groupId || (msg.key && msg.key.remoteJid) || '';
    if (!groupId.endsWith('@g.us')) return false;

    try {
        const settings = db.prepare('SELECT * FROM group_settings WHERE group_id = ? AND session_id = ?').get(groupId, sessionId);
        if (!settings || !settings.is_active) return false;

        const senderJid = extra.senderJid || (msg.key && msg.key.participant) || (msg.key && msg.key.remoteJid) || '';
        const text = extra.plainText || msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

        if (msg.key && msg.key.fromMe) return false;

        let violation = null;
        if (settings.anti_link === 1) {
            const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-z0-9-]+\.[a-z]{2,}\b)/gi;
            if (linkRegex.test(text)) violation = 'Lien non autorisé';
        }

        if (!violation && settings.bad_words) {
            const badWords = (settings.bad_words || '').split(',').map(w => w.trim().toLowerCase()).filter(w => w);
            const lowerText = text.toLowerCase();
            if (badWords.length > 0 && badWords.some(word => lowerText.includes(word))) {
                violation = 'Langage inapproprié';
            }
        }

        if (!violation) return false;

        log(`Violation détectée dans ${groupId} par ${senderJid}: ${violation}`, sessionId, {
            event: 'moderation-violation', groupId, senderJid, violation
        }, 'WARN');

        const provider = require('./SessionService').getProvider();
        const SessionService = require('./SessionService');

        // Resolve @lid JID to WhatsApp phone JID for mentions/actions
        const resolvedJid = await SessionService.resolveParticipantJidProvider(sessionId, senderJid);

        // Delete the violating message
        const msgId = msg.key && msg.key.id;
        log(`Tentative suppression message ${groupId}: id=${msgId}`, sessionId, {
            event: 'moderation-delete', groupId, msgId
        }, 'INFO');
        await provider.deleteMessage(sessionId, { id: msgId, remoteJid: groupId, fromMe: false, participant: msg.key && msg.key.participant });

        if (settings.warnings_enabled === 0) return true;

        // Increment warnings
        const existing = db.prepare('SELECT * FROM user_warnings WHERE session_id = ? AND group_id = ? AND user_id = ?').get(sessionId, groupId, resolvedJid);
        const currentCount = existing ? existing.count : 0;
        const newCount = currentCount + 1;
        const maxWarnings = settings.auto_kick_threshold || 3;
        const remaining = maxWarnings - newCount;

        if (existing) {
            db.prepare("UPDATE user_warnings SET count = ?, last_warning_at = datetime('now') WHERE group_id = ? AND session_id = ? AND user_id = ?").run(newCount, groupId, sessionId, resolvedJid);
        } else {
            db.prepare('INSERT INTO user_warnings (session_id, group_id, user_id, count) VALUES (?, ?, ?, ?)').run(sessionId, groupId, resolvedJid, newCount);
        }

        // Send warning message
        const template = settings.warning_template || '@{{name}} votre message a ete supprime: {{reason}}. Merci de respecter les regles du groupe.';
        const warningText = template
            .replace('{{name}}', `${resolvedJid.split('@')[0]}`)
            .replace('{{reason}}', violation)
            .replace('{{count}}', String(newCount))
            .replace('{{max}}', String(maxWarnings))
            .replace('{{remaining}}', String(Math.max(0, remaining)));

        await provider.sendTextMessage(sessionId, { jid: groupId, text: warningText, mentions: [resolvedJid] });

        // Auto-kick if threshold reached
        if (settings.auto_kick_enabled === 1 && newCount >= maxWarnings) {
            // Send exclusion message before removing
            const exclusionMsg = WarningService.composeExclusionMessage({
                senderJid: resolvedJid,
                currentCount: newCount,
                maxWarnings,
                reason: violation
            });
            await provider.sendTextMessage(sessionId, { jid: groupId, text: exclusionMsg, mentions: [resolvedJid] });

            await provider.groupUpdateParticipant(sessionId, {
                groupJid: groupId,
                action: 'remove',
                participants: [resolvedJid]
            });
            log(`Membre ${senderJid} exclu de ${groupId} (${newCount}/${maxWarnings})`, sessionId, {
                event: 'moderation-kick', groupId, senderJid, warnings: newCount
            }, 'INFO');
            wappy.memberBanned(groupId, sessionId, senderJid);
        }

        return true;
    } catch (err) {
        log(`Erreur modération pour ${groupId}: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
        return false;
    }
}

/**
 * Handle participant updates (welcome messages) via provider (Evolution API).
 * Called from GROUPS_UPSERT webhook when action === 'add'.
 * @param {string} sessionId
 * @param {Object} data - Evolution webhook data { groupJid, participants: string[], action }
 */
async function handleParticipantUpdateProvider(sessionId, data) {
    const { groupJid: groupId, participants, action } = data;
    if (action !== 'add') return;

    try {
        const settings = db.prepare('SELECT * FROM group_settings WHERE group_id = ? AND session_id = ?').get(groupId, sessionId);
        if (!settings || !settings.welcome_enabled || !settings.welcome_template) return;

        const SessionService = require('./SessionService');
        const provider = SessionService.getProvider();

        // Get group metadata via fetchGroups to have subject/description
        const fetchResult = await provider.fetchGroups(sessionId);
        const groups = fetchResult.ok ? fetchResult.groups : [];
        const groupMeta = groups.find(g => g.id === groupId) || {};

        const groupService = require('./groups');
        const profile = groupService.getProfile(sessionId, groupId);
        const links = groupService.getProductLinks(sessionId, groupId);

        // Check Credits
        const session = Session.findById(sessionId);
        let user = null;
        if (session && session.owner_email) {
            user = User.findByEmail(session.owner_email);
        }

        for (const jid of participants) {
            let creditDeducted = false;
            if (user) {
                const hasCredit = CreditService.deduct(user.id, 1, `Moderation: Welcome message to ${jid}`);
                if (!hasCredit) {
                    log(`Insufficient credits for welcome message to ${jid} (Session: ${sessionId})`, sessionId, { event: 'moderation-insufficient-credits' }, 'WARN');
                    continue;
                }
                creditDeducted = true;
            } else {
                log(`User not found for session ${sessionId} - Skipping credit check for welcome`, sessionId, null, 'WARN');
            }

            let message = settings.welcome_template;
            message = message
                .replace(/{{name}}/g, `${jid.split('@')[0]}`)
                .replace(/{{group_name}}/g, groupMeta.subject || groupId)
                .replace(/{{date}}/g, new Date().toLocaleDateString('fr-FR'))
                .replace(/{{rules}}/g, profile?.rules || groupMeta.description || 'Pas de règles spécifiées.');

            if (links.length > 0) {
                let linksText = "\n\n*Nos produits/liens :*\n";
                links.forEach(link => {
                    linksText += `\n📌 *${link.title}*\n${link.description}\n🔗 ${link.url}\n👉 ${link.cta}\n`;
                });
                message += linksText;
            }

            try {
                await provider.sendTextMessage(sessionId, { jid: groupId, text: message });

                const session = Session.findById(sessionId);
                if (ActivityLog && session) {
                    await ActivityLog.logMessageSend(
                        session.owner_email || 'moderation-system',
                        sessionId,
                        groupId,
                        'text',
                        '127.0.0.1',
                        'Moderation (Welcome)'
                    );
                }
                Session.updateAIStats(sessionId, 'sent');

                log(`[Bienvenue] Message envoyé à ${jid} dans ${groupId}`, sessionId, { event: 'moderation-welcome-sent' }, 'INFO');
            } catch (sendErr) {
                log(`Failed to send welcome message to ${jid}: ${sendErr.message}`, sessionId, { event: 'moderation-welcome-send-error', error: sendErr.message }, 'ERROR');
                if (creditDeducted && user) {
                    CreditService.add(user.id, 1, 'credit', `Remboursement: échec bienvenue ${jid}`);
                }
            }
        }
    } catch (err) {
        log(`Erreur lors de l'envoi du message de bienvenue (provider): ${err.message}`, sessionId, { event: 'moderation-welcome-error', error: err.message }, 'ERROR');
    }
}

module.exports = {
    getAdminGroups,
    updateGroupSettings,
    handleIncomingMessage,
    handleParticipantUpdate,
    handleParticipantUpdateProvider,
    isGroupAdmin,
    getGroupMetadata,
    handleIncomingMessageProvider
};
