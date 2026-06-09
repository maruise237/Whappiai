const db = require('../db/query');
const { log } = require('../utils/logger');
const { Session, ActivityLog } = require('../models');
const User = require('../models/User');
const CreditService = require('./CreditService');
const SessionService = require('./SessionService');
const wappy = require('./WappyEventBroadcaster');
const aiService = require('./ai');

/**
 * Engagement Service
 * Handles scheduled messages for groups
 */

class EngagementService {
    constructor() {
        this.checkInterval = null;
    }

    /**
     * Start the engagement service loop
     */
    start() {
        if (this.checkInterval) return;
        
        log('Service Engagement de Groupe démarré', 'SYSTEM', null, 'INFO');
        
        // Check for scheduled tasks every 60 seconds (optimized)
        this.checkInterval = setInterval(() => {
            this.checkTasks().catch(err => {
                log(`Erreur boucle engagement: ${err.message}`, 'SYSTEM', null, 'ERROR');
            });
        }, 60000);
        
        // Initial check with small delay to ensure DB/WebSockets are ready
        setTimeout(() => this.checkTasks(), 5000);
    }

    /**
     * Stop the engagement service
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Check for pending tasks and execute them
     */
    async checkTasks() {
        try {
            // Check if DB is available
            if (!db) return;

            // Utilisation d'une transaction pour garantir l'atomicité de la sélection et du marquage
            const tasks = await db.transaction(async (txDb) => {
                const now = new Date();
                
                // Sélection de toutes les tâches en attente
                const allPending = await txDb.all(`
                    SELECT * FROM group_engagement_tasks
                    WHERE status = 'pending'
                `);

                // Filtrage des tâches dont l'heure est passée
                const tasksToExecute = allPending.filter(task => {
                    const scheduledDate = new Date(task.scheduled_at);
                    return !isNaN(scheduledDate.getTime()) && scheduledDate <= now;
                });

                // Marquage immédiat en 'processing' pour éviter les doublons lors de la prochaine boucle
                if (tasksToExecute.length > 0) {
                    const placeholders = tasksToExecute.map((_, i) => `$${i + 1}`).join(',');
                    const ids = tasksToExecute.map(t => t.id);
                    await txDb.run(`UPDATE group_engagement_tasks SET status = 'processing', updated_at = NOW() WHERE id IN (${placeholders})`, ids);
                }

                return tasksToExecute;
            });

            if (tasks.length > 0) {
                log(`${tasks.length} tâches d'engagement détectées pour exécution`, 'SYSTEM', { count: tasks.length }, 'DEBUG');
            }

            for (const task of tasks) {
                // On exécute de manière asynchrone pour ne pas bloquer la boucle principale
                // mais on gère les erreurs individuellement
                this.executeTask(task).catch(err => {
                    log(`Erreur fatale exécution tâche d'engagement ${task.id}: ${err.message}`, task.session_id, { taskId: task.id }, 'ERROR');
                });
            }
        } catch (err) {
            log(`Erreur lors de la vérification des tâches d'engagement: ${err.message}`, 'SYSTEM', null, 'ERROR');
        }
    }

    /**
     * Execute a single task
     * @param {object} task 
     */
    async executeTask(task) {
        const { id, group_id, session_id, message_content, media_url, media_type, recurrence } = task;
        
        let creditDeducted = false;
        let sessionOwnerId = null;

        try {
            log(`Tentative d'envoi du message programmé ${id}`, session_id, { event: 'engagement-exec-start', taskId: id, scheduled_at: task.scheduled_at }, 'INFO');
            
            if (SessionService.isProviderActive()) {
                const providerState = await SessionService.getStatusProvider(session_id);
                const normalizedState = String(providerState.state || '').toLowerCase();
                if (!providerState.ok || !['open', 'connected'].includes(normalizedState)) {
                    const retryAt = new Date(Date.now() + 15 * 60 * 1000);
                    await db.run("UPDATE group_engagement_tasks SET status = 'pending', scheduled_at = $1, updated_at = NOW() WHERE id = $2", [retryAt.toISOString(), id]);
                    throw new Error('Session non active ou non connectée. Tâche remise en attente.');
                }
            }
            
            // Vérification et déduction des crédits
            const session = await Session.findById(session_id);
            if (session && session.owner_email) {
                const user = await User.findByEmail(session.owner_email);
                if (user) {
                    sessionOwnerId = user.id;
                    const hasCredit = await CreditService.deduct(user.id, 1, `Envoi message programmé vers ${group_id}`);
                    if (!hasCredit) {
                        throw new Error('Crédits insuffisants pour envoyer le message d\'engagement programmé.');
                    }
                    creditDeducted = true;
                }
            }

            // Envoi du message
            if (media_url && ['image', 'video', 'audio'].includes(media_type)) {
                if (SessionService.isProviderActive()) {
                    const sent = await SessionService.sendMediaProvider(session_id, {
                        jid: group_id,
                        mediaUrl: media_url,
                        mediaType: media_type,
                        caption: message_content || ''
                    });
                    if (!sent.ok) {
                        throw new Error(sent.error || 'Evolution sendMedia failed');
                    }
                } else {
                    let text = message_content || '';
                    if (media_url && !text.includes(media_url)) {
                        text = text ? `${text}\n\n${media_url}` : media_url;
                    }
                    
                    if (!text) {
                        throw new Error('Message vide (pas de contenu ni de média valide)');
                    }
                    
                    const formattedText = aiService.formatForWhatsApp(text);
                    if (SessionService.isProviderActive()) {
                        const sent = await SessionService.sendTextMessageProvider(session_id, { jid: group_id, text: formattedText });
                        if (!sent.ok) {
                            throw new Error(sent.error || 'Evolution send failed');
                        }
                    } else {
                        throw new Error('Legacy Baileys mode is disabled in this branch');
                    }
                }
            } else {
                let text = message_content || '';
                if (!text) {
                    throw new Error('Message vide (pas de contenu ni de média valide)');
                }
                
                const formattedText = aiService.formatForWhatsApp(text);
                if (SessionService.isProviderActive()) {
                    const sent = await SessionService.sendTextMessageProvider(session_id, { jid: group_id, text: formattedText });
                    if (!sent.ok) {
                        throw new Error(sent.error || 'Evolution send failed');
                    }
                } else {
                    throw new Error('Legacy Baileys mode is disabled in this branch');
                }
            }

            // Update session stats
            await Session.updateAIStats(session_id, 'sent');

            // Mise à jour finale du statut et gestion de la récurrence
            await db.transaction(async (txDb) => {
                if (recurrence === 'none') {
                    await txDb.run("UPDATE group_engagement_tasks SET status = 'completed', last_run_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
                } else {
                    let nextRun = new Date(task.scheduled_at);
                    const now = new Date();
                    while (nextRun <= now) {
                        if (recurrence === 'daily') {
                            nextRun.setDate(nextRun.getDate() + 1);
                        } else if (recurrence === 'weekly') {
                            nextRun.setDate(nextRun.getDate() + 7);
                        } else {
                            break;
                        }
                    }
                    
                    await txDb.run("UPDATE group_engagement_tasks SET status = 'pending', scheduled_at = $1, last_run_at = NOW(), updated_at = NOW() WHERE id = $2", [nextRun.toISOString(), id]);
                    log(`Tâche récurrente d'engagement ${id} replanifiée pour ${nextRun.toISOString()}`, session_id, { taskId: id }, 'INFO');
                }
            });

            log(`Message d'engagement programmé ${id} envoyé avec succès`, session_id, { event: 'engagement-exec-success', taskId: id }, 'INFO');
            wappy.messageScheduled(session_id);
            wappy.scheduledMessageSent(session_id, group_id);

        } catch (err) {
            if (creditDeducted && sessionOwnerId) {
                await CreditService.add(sessionOwnerId, 1, 'credit', `Remboursement: échec envoi d'engagement programmé vers ${group_id}`);
            }

            log(`Échec d'envoi pour la tâche d'engagement ${id}: ${err.message}`, session_id, { event: 'engagement-exec-error', taskId: id, error: err.message }, 'ERROR');
            
            if (!err.message.includes('Session non active')) {
                await db.run("UPDATE group_engagement_tasks SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2", [err.message, id]);
            }
        }
    }

    /**
     * Get a single task by ID
     */
    async getTaskById(id) {
        return await db.get("SELECT * FROM group_engagement_tasks WHERE id = $1", [id]);
    }

    /**
     * Update an existing task
     */
    async updateTask(id, data) {
        const { message_content, media_url, media_type, scheduled_at, recurrence } = data;
        
        return await db.transaction(async (txDb) => {
            const task = await txDb.get("SELECT status FROM group_engagement_tasks WHERE id = $1", [id]);
            
            if (!task) throw new Error('Tâche d\'engagement non trouvée');
            if (task.status !== 'pending') throw new Error(`Modification impossible : la tâche est déjà en statut ${task.status}`);

            const result = await txDb.run(`
                UPDATE group_engagement_tasks
                SET message_content = $1, 
                    media_url = $2, 
                    media_type = $3, 
                    scheduled_at = $4, 
                    recurrence = $5, 
                    updated_at = NOW()
                WHERE id = $6 AND status = 'pending'
            `, [message_content, media_url, media_type, scheduled_at, recurrence, id]);

            if (result.changes === 0) {
                throw new Error('Échec de la modification');
            }
            
            return true;
        });
    }

    /**
     * Get task history with filters
     */
    async getHistory(filters = {}) {
        let query = "SELECT * FROM group_engagement_tasks WHERE 1=1";
        const params = [];
        let paramIndex = 1;

        if (filters.session_id) {
            query += ` AND session_id = $${paramIndex++}`;
            params.push(filters.session_id);
        }
        if (filters.group_id) {
            query += ` AND group_id = $${paramIndex++}`;
            params.push(filters.group_id);
        }
        if (filters.status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(filters.status);
        }
        if (filters.startDate) {
            query += ` AND scheduled_at >= $${paramIndex++}`;
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND scheduled_at <= $${paramIndex++}`;
            params.push(filters.endDate);
        }

        query += " ORDER BY updated_at DESC LIMIT 100";
        return await db.all(query, params);
    }

    /**
     * Add a new task
     */
    async addTask(data) {
        const { group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence } = data;
        
        const result = await db.get(`
            INSERT INTO group_engagement_tasks (group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING id
        `, [group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence]);
        
        return result ? result.id : null;
    }

    /**
     * Get tasks for a group
     */
    async getTasks(session_id, group_id) {
        return await db.all("SELECT * FROM group_engagement_tasks WHERE session_id = $1 AND group_id = $2 ORDER BY scheduled_at ASC", [session_id, group_id]);
    }

    /**
     * Delete a task
     */
    async deleteTask(id) {
        return await db.run("DELETE FROM group_engagement_tasks WHERE id = $1", [id]);
    }
}

module.exports = new EngagementService();
