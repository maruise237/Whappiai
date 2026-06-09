/**
 * WappyEventBroadcaster - envoie des events à Wappy via WebSocket
 * Les services l'utilisent pour déclencher l'animation de la mascotte
 */
const { log } = require('../utils/logger');

function broadcast(type, action, metadata = {}) {
  try {
    const { broadcastToClients } = require('../..');
    broadcastToClients({
      type,
      action,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // WebSocket pas encore prêt
  }
}

module.exports = {
  /**
   * Lien suspect bloqué
   */
  linkBlocked(groupId, sessionId) {
    broadcast('moderation', 'link-blocked', { groupId, sessionId });
    log(`[Wappy] alert - lien bloqué dans ${groupId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Membre averti (warning donné)
   */
  memberWarned(groupId, sessionId, memberJid, count, max) {
    broadcast('moderation', 'member-warned', { groupId, sessionId, memberJid, count, max });
    log(`[Wappy] warning - ${memberJid} averti (${count}/${max})`, sessionId, null, 'DEBUG');
  },

  /**
   * Membre banni d'un groupe
   */
  memberBanned(groupId, sessionId, memberJid) {
    broadcast('moderation', 'member-banned', { groupId, sessionId, memberJid });
    log(`[Wappy] banning - ${memberJid} banni de ${groupId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Avertissements remis à zéro
   */
  warningsReset(groupId, sessionId, memberJid) {
    broadcast('moderation', 'warnings-reset', { groupId, sessionId, memberJid });
    log(`[Wappy] reset - avertissements remis à zéro pour ${memberJid}`, sessionId, null, 'DEBUG');
  },

  /**
   * Règle de modération mise à jour
   */
  ruleUpdated(groupId, sessionId) {
    broadcast('moderation', 'rule-updated', { groupId, sessionId });
    log(`[Wappy] rule - configuration mise à jour pour ${groupId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Nouveau membre accueilli
   */
  memberJoined(groupId, sessionId, memberJid) {
    broadcast('moderation', 'member-joined', { groupId, sessionId, memberJid });
    log(`[Wappy] welcome - nouveau membre ${memberJid} dans ${groupId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Membre quitte le groupe
   */
  memberLeft(groupId, sessionId, memberJid) {
    broadcast('moderation', 'member-left', { groupId, sessionId, memberJid });
    log(`[Wappy] member-left - ${memberJid} a quitté ${groupId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Message entrant analysé par la modération
   */
  messageIncoming(groupId, sessionId) {
    broadcast('messaging', 'incoming', { groupId, sessionId });
    log(`[Wappy] message reçu dans ${groupId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Message programmé
   */
  messageScheduled(sessionId) {
    broadcast('engagement', 'scheduled', { sessionId });
    log(`[Wappy] scheduled - message programmé`, sessionId, null, 'DEBUG');
  },

  /**
   * Message programmé envoyé avec succès
   */
  scheduledMessageSent(sessionId, groupId) {
    broadcast('engagement', 'sent', { sessionId, groupId });
    log(`[Wappy] sent - message programmé envoyé`, sessionId, null, 'DEBUG');
  },

  /**
   * Tâche d'engagement créée
   */
  taskCreated(sessionId, groupId) {
    broadcast('engagement', 'task-created', { sessionId, groupId });
    log(`[Wappy] task - tâche d'engagement créée`, sessionId, null, 'DEBUG');
  },

  /**
   * Tâche d'engagement supprimée
   */
  taskDeleted(sessionId, groupId) {
    broadcast('engagement', 'task-deleted', { sessionId, groupId });
    log(`[Wappy] task - tâche d'engagement supprimée`, sessionId, null, 'DEBUG');
  },

  /**
   * Session connectée
   */
  sessionConnected(sessionId) {
    broadcast('session', 'connected', { sessionId, status: 'connected' });
    broadcast('session-update', 'connected', { sessionId, status: 'connected' });
    log(`[Wappy] happy - session connectée ${sessionId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Session en cours de connexion (QR code affiché)
   */
  sessionConnecting(sessionId) {
    broadcast('session', 'connecting', { sessionId, status: 'connecting' });
    broadcast('session-update', 'connecting', { sessionId, status: 'connecting' });
    log(`[Wappy] working - session en connexion ${sessionId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Session déconnectée
   */
  sessionDisconnected(sessionId) {
    broadcast('session', 'disconnected', { sessionId, status: 'disconnected' });
    broadcast('session-update', 'disconnected', { sessionId, status: 'disconnected' });
    log(`[Wappy] sad - session déconnectée ${sessionId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Session supprimée
   */
  sessionDeleted(sessionId) {
    broadcast('session', 'deleted', { sessionId });
    log(`[Wappy] sad - session supprimée ${sessionId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Message IA envoyé
   */
  aiMessageSent(sessionId, groupId) {
    broadcast('ai', 'message-sent', { sessionId, groupId });
    log(`[Wappy] ai - réponse IA envoyée`, sessionId, null, 'DEBUG');
  },

  /**
   * Crédits modifiés
   */
  creditsChanged(userId, amount, balance) {
    broadcast('credits', 'changed', { userId, amount, balance });
    log(`[Wappy] credits - ${amount > 0 ? 'ajout' : 'déduction'} de ${Math.abs(amount)} crédits`, userId, null, 'DEBUG');
  },

  /**
   * Plan/abonnement changé
   */
  planChanged(userId, plan) {
    broadcast('billing', 'plan-changed', { userId, plan });
    log(`[Wappy] plan - changement vers ${plan}`, userId, null, 'DEBUG');
  },

  /**
   * Erreur système
   */
  errorOccurred(sessionId, errorType) {
    broadcast('system', 'error', { sessionId, errorType });
    log(`[Wappy] error - ${errorType}`, sessionId, null, 'DEBUG');
  }
};
