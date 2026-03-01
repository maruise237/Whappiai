import sys

path = 'src/services/whatsapp.js'
with open(path, 'r') as f:
    content = f.read()

# Increase retries and delay for pairing code
old_request = """                    } else if (retry < 5) {
                        const delay = 3000 * (retry + 1);
                        log(`Socket non prêt pour ${sessionId}, tentative ${retry + 1}/5 dans ${delay/1000}s...`, sessionId, { event: 'pairing-retry' }, 'DEBUG');
                        setTimeout(() => requestPairing(retry + 1), delay);
                    } else {
                        log(`Socket non prêt après 5 tentatives, abandon de la demande de code`, sessionId, { event: 'pairing-aborted' }, 'WARN');
                        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', 'Socket non prêt pour le code', null);
                    }"""

new_request = """                    } else if (retry < 15) {
                        const delay = 5000;
                        log(`Socket non prêt pour ${sessionId}, tentative ${retry + 1}/15 dans ${delay/1000}s... (WS state: ${sock.ws?.readyState})`, sessionId, { event: 'pairing-retry', wsState: sock.ws?.readyState }, 'DEBUG');
                        setTimeout(() => requestPairing(retry + 1), delay);
                    } else {
                        log(`Socket non prêt après 15 tentatives, abandon de la demande de code`, sessionId, { event: 'pairing-aborted' }, 'WARN');
                        if (onUpdate) onUpdate(sessionId, 'DISCONNECTED', 'Le serveur WhatsApp prend trop de temps à répondre (socket non prêt)', null);
                    }"""

content = content.replace(old_request, new_request)

# Increase initial delay to 10s
content = content.replace("setTimeout(() => requestPairing(), 6000);", "setTimeout(() => requestPairing(), 10000);")

with open(path, 'w') as f:
    f.write(content)
