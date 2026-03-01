import sys

path = 'src/services/whatsapp.js'
with open(path, 'r') as f:
    content = f.read()

# 1. Add imports if not present
imports = [
    "const NotificationService = require('./NotificationService');",
    "const User = require('../models/User');",
    "const Session = require('../models/Session');"
]

for imp in imports:
    if imp not in content:
        content = content.replace(
            "const moderationService = require('./moderation');",
            f"const moderationService = require('./moderation');\n{imp}"
        )

# 2. Robust pairing code logic
old_pairing = """            setTimeout(async () => {
                try {
                    const currentSock = activeSockets.get(sessionId);
                    // Check if this socket is still the active one before requesting code
                    if (currentSock === sock && sock.ws && sock.ws.readyState === 1) {
                        const code = await sock.requestPairingCode(sanitizedPhoneNumber);
                        log(`Code d'appairage reçu: ${code}`, sessionId, { event: 'pairing-success' }, 'INFO');
                        if (onUpdate) onUpdate(sessionId, 'GENERATING_CODE', 'Code prêt', code);
                    } else {
                        log(`Socket non prêt, abandon de la demande de code`, sessionId, { event: 'pairing-aborted' }, 'WARN');
                    }
                } catch (err) {
                    log(`Erreur lors de la demande de code: ${err.message}`, sessionId, { error: err.message }, 'ERROR');
                    if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', `Échec code: ${err.message}`, null);
                }
            }, 6000); // Wait for handshake to complete"""

new_pairing = """            const requestPairing = async (retry = 0) => {
                try {
                    const currentSock = activeSockets.get(sessionId);
                    if (currentSock === sock && sock.ws && sock.ws.readyState === 1) {
                        const code = await sock.requestPairingCode(sanitizedPhoneNumber);
                        log(`Code d'appairage reçu: ${code}`, sessionId, { event: 'pairing-success' }, 'INFO');

                        // Persist pairing code immediately in DB
                        Session.updateStatus(sessionId, 'GENERATING_CODE', 'Code prêt', code);
                        if (onUpdate) onUpdate(sessionId, 'GENERATING_CODE', 'Code prêt', code);

                        // Send notification
                        const session = Session.findById(sessionId);
                        if (session?.owner_email) {
                            const user = User.findByEmail(session.owner_email);
                            if (user) {
                                NotificationService.send(user.id, 'session', {
                                    title: "Code d'appairage prêt",
                                    message: `Le code d'appairage pour ${sessionId} est : ${code}`,
                                    sessionId: sessionId
                                });
                            }
                        }
                    } else if (retry < 5) {
                        const delay = 3000 * (retry + 1);
                        log(`Socket non prêt pour ${sessionId}, tentative ${retry + 1}/5 dans ${delay/1000}s...`, sessionId, { event: 'pairing-retry' }, 'DEBUG');
                        setTimeout(() => requestPairing(retry + 1), delay);
                    } else {
                        log(`Socket non prêt après 5 tentatives, abandon de la demande de code`, sessionId, { event: 'pairing-aborted' }, 'WARN');
                        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', 'Socket non prêt pour le code', null);
                    }
                } catch (err) {
                    log(`Erreur lors de la demande de code (tentative ${retry}): ${err.message}`, sessionId, { error: err.message }, 'ERROR');
                    if (retry < 3) {
                        setTimeout(() => requestPairing(retry + 1), 5000);
                    } else {
                        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', `Échec code: ${err.message}`, null);
                    }
                }
            };

            setTimeout(() => requestPairing(), 6000);"""

content = content.replace(old_pairing, new_pairing)

# 3. Connection open notification
old_open = """            if (connection === 'open') {
                log(`WhatsApp connecté: ${sock.user?.name}`, sessionId, { event: 'open' }, 'INFO');
                retryCounters.delete(sessionId);
                lastQrs.delete(sessionId);
                if (onUpdate) onUpdate(sessionId, 'CONNECTED', `Connecté: ${sock.user?.name || 'Session'}`, null);
            }"""

new_open = """            if (connection === 'open') {
                log(`WhatsApp connecté: ${sock.user?.name}`, sessionId, { event: 'open' }, 'INFO');
                retryCounters.delete(sessionId);
                lastQrs.delete(sessionId);
                if (onUpdate) onUpdate(sessionId, 'CONNECTED', `Connecté: ${sock.user?.name || 'Session'}`, null);

                // Send connected notification
                const session = Session.findById(sessionId);
                if (session?.owner_email) {
                    const user = User.findByEmail(session.owner_email);
                    if (user) {
                        NotificationService.send(user.id, 'session', {
                            title: 'Session Connectée',
                            message: `Votre session WhatsApp "${sessionId}" (${sock.user?.id.split(':')[0]}) est maintenant opérationnelle.`,
                            sessionId: sessionId
                        });
                    }
                }
            }"""

content = content.replace(old_open, new_open)

with open(path, 'w') as f:
    f.write(content)
