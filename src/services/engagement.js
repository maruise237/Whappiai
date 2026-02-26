const { db } = require('../config/database');
const { log } = require('../utils/logger');
const { Session, ActivityLog } = require('../models');
const User = require('../models/User');
const CreditService = require('./CreditService');
const whatsappService = require('./whatsapp');
const aiService = require('./ai');
const QueueService = require('./QueueService');

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
            const tasks = db.transaction(() => {
                const now = new Date();
                
                // Sélection de toutes les tâches en attente
                const allPending = db.prepare(`
                    SELECT * FROM group_engagement_tasks
                    WHERE status = 'pending'
                `).all();

                // Filtrage des tâches dont l'heure est passée
                const tasksToExecute = allPending.filter(task => {
                    const scheduledDate = new Date(task.scheduled_at);
                    return !isNaN(scheduledDate.getTime()) && scheduledDate <= now;
                });

                // Marquage immédiat en 'processing' pour éviter les doublons lors de la prochaine boucle
                if (tasksToExecute.length > 0) {
                    const ids = tasksToExecute.map(t => t.id).join(',');
                    db.prepare(`UPDATE group_engagement_tasks SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id IN (${ids})`).run();
                }

                return tasksToExecute;
            })();

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
            
            const sock = whatsappService.getSocket(session_id);
            if (!sock || !whatsappService.isConnected(session_id)) {
                // Si la session n'est pas connectée, on repasse en 'pending' pour retenter plus tard
                db.prepare("UPDATE group_engagement_tasks SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
                throw new Error('Session non active ou non connectée. Tâche remise en attente.');
            }
            
            // Vérification et déduction des crédits
            const session = Session.findById(session_id);
            if (session && session.owner_email) {
                const user = User.findByEmail(session.owner_email);
                if (user) {
                    sessionOwnerId = user.id;
                    const hasCredit = CreditService.deduct(user.id, 1, `Envoi message programmé vers ${group_id}`);
                    if (!hasCredit) {
                        throw new Error('Crédits insuffisants pour envoyer le message d\'engagement programmé.');
                    }
                    creditDeducted = true;
                }
            }

            // Envoi du message
            if (media_url && ['image', 'video', 'audio'].includes(media_type)) {
                const messageOptions = {};
                const formattedContent = aiService.formatForWhatsApp(message_content || '');
                
                if (media_type === 'image') {
                    messageOptions.image = { url: media_url };
                    messageOptions.caption = formattedContent;
                } else if (media_type === 'video') {
                    messageOptions.video = { url: media_url };
                    messageOptions.caption = formattedContent;
                } else if (media_type === 'audio') {
                    messageOptions.audio = { url: media_url };
                    messageOptions.mimetype = 'audio/mp4';
                }
                
                await QueueService.enqueue(session_id, sock, group_id, messageOptions);
                
                // Log activity
                const session = Session.findById(session_id);
                if (ActivityLog && session) {
                    await ActivityLog.logMessageSend(
                        session.owner_email || 'engagement-system',
                        session_id,
                        group_id,
                        media_type,
                        '127.0.0.1',
                        'Group Engagement'
                    );
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
                await QueueService.enqueue(session_id, sock, group_id, { text: formattedText });

                // Log activity
                const session = Session.findById(session_id);
                if (ActivityLog && session) {
                    await ActivityLog.logMessageSend(
                        session.owner_email || 'engagement-system',
                        session_id,
                        group_id,
                        'text',
                        '127.0.0.1',
                        'Group Engagement'
                    );
                }
            }

            // Update session stats
            Session.updateAIStats(session_id, 'sent');

            // Mise à jour finale du statut et gestion de la récurrence
            db.transaction(() => {
                if (recurrence === 'none') {
                    db.prepare("UPDATE group_engagement_tasks SET status = 'completed', last_run_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
                } else {
                    let nextRun = new Date(task.scheduled_at);
                    if (recurrence === 'daily') {
                        nextRun.setDate(nextRun.getDate() + 1);
                    } else if (recurrence === 'weekly') {
                        nextRun.setDate(nextRun.getDate() + 7);
                    }
                    
                    db.prepare("UPDATE group_engagement_tasks SET status = 'pending', scheduled_at = ?, last_run_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(nextRun.toISOString(), id);
                    log(`Tâche récurrente d'engagement ${id} replanifiée pour ${nextRun.toISOString()}`, session_id, { taskId: id }, 'INFO');
                }
            })();

            log(`Message d'engagement programmé ${id} envoyé avec succès`, session_id, { event: 'engagement-exec-success', taskId: id }, 'INFO');

        } catch (err) {
            if (creditDeducted && sessionOwnerId) {
                CreditService.add(sessionOwnerId, 1, 'credit', `Remboursement: échec envoi d'engagement programmé vers ${group_id}`);
            }

            log(`Échec d'envoi pour la tâche d'engagement ${id}: ${err.message}`, session_id, { event: 'engagement-exec-error', taskId: id, error: err.message }, 'ERROR');
            
            if (!err.message.includes('Session non active')) {
                db.prepare("UPDATE group_engagement_tasks SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(err.message, id);
            }
        }
    }

    /**
     * Get a single task by ID
     */
    getTaskById(id) {
        return db.prepare("SELECT * FROM group_engagement_tasks WHERE id = ?").get(id);
    }

    /**
     * Update an existing task
     */
    updateTask(id, data) {
        const { message_content, media_url, media_type, scheduled_at, recurrence } = data;
        
        return db.transaction(() => {
            const task = db.prepare("SELECT status FROM group_engagement_tasks WHERE id = ?").get(id);
            
            if (!task) throw new Error('Tâche d\'engagement non trouvée');
            if (task.status !== 'pending') throw new Error(`Modification impossible : la tâche est déjà en statut ${task.status}`);

            const result = db.prepare(`
                UPDATE group_engagement_tasks
                SET message_content = ?, 
                    media_url = ?, 
                    media_type = ?, 
                    scheduled_at = ?, 
                    recurrence = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'pending'
            `).run(message_content, media_url, media_type, scheduled_at, recurrence, id);

            if (result.changes === 0) {
                throw new Error('Échec de la modification');
            }
            
            return true;
        })();
    }

    /**
     * Get task history with filters
     */
    getHistory(filters = {}) {
        let query = "SELECT * FROM group_engagement_tasks WHERE 1=1";
        const params = [];

        if (filters.session_id) {
            query += " AND session_id = ?";
            params.push(filters.session_id);
        }
        if (filters.group_id) {
            query += " AND group_id = ?";
            params.push(filters.group_id);
        }
        if (filters.status) {
            query += " AND status = ?";
            params.push(filters.status);
        }
        if (filters.startDate) {
            query += " AND scheduled_at >= ?";
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            query += " AND scheduled_at <= ?";
            params.push(filters.endDate);
        }

        query += " ORDER BY updated_at DESC LIMIT 100";
        return db.prepare(query).all(...params);
    }

    /**
     * Add a new task
     */
    addTask(data) {
        const { group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence } = data;
        
        const result = db.prepare(`
            INSERT INTO group_engagement_tasks (group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `).run(group_id, session_id, message_content, media_url, media_type, scheduled_at, recurrence);
        
        return result.lastInsertRowid;
    }

    /**
     * Get tasks for a group
     */
    getTasks(session_id, group_id) {
        return db.prepare("SELECT * FROM group_engagement_tasks WHERE session_id = ? AND group_id = ? ORDER BY scheduled_at ASC").all(session_id, group_id);
    }

    /**
     * Delete a task
     */
    deleteTask(id) {
        return db.prepare("DELETE FROM group_engagement_tasks WHERE id = ?").run(id);
    }
}

module.exports = new EngagementService();
