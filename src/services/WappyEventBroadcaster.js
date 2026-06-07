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
   * Membre banni d'un groupe
   */
  memberBanned(groupId, sessionId, memberJid) {
    broadcast('moderation', 'member-banned', { groupId, sessionId, memberJid });
    log(`[Wappy] banning - ${memberJid} banni de ${groupId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Message programmé
   */
  messageScheduled(sessionId) {
    broadcast('engagement', 'scheduled', { sessionId });
    log(`[Wappy] scheduled - message programmé`, sessionId, null, 'DEBUG');
  },

  /**
   * Session connectée
   */
  sessionConnected(sessionId) {
    broadcast('session-update', 'connected', { sessionId, status: 'connected' });
    log(`[Wappy] happy - session connectée ${sessionId}`, sessionId, null, 'DEBUG');
  },

  /**
   * Session déconnectée
   */
  sessionDisconnected(sessionId) {
    broadcast('session-update', 'disconnected', { sessionId, status: 'disconnected' });
    log(`[Wappy] sad - session déconnectée ${sessionId}`, sessionId, null, 'DEBUG');
  }
};
