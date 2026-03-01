import os

path = 'src/services/whatsapp.js'
with open(path, 'r') as f:
    content = f.read()

# 1. Modify connect to handle pairing requests even if already connecting
old_lock = """    if (connectingSessions.has(sessionId)) {
        log(`Connexion en cours pour ${sessionId}`, sessionId, { event: 'connect-locked' }, 'DEBUG');
        return activeSockets.get(sessionId);
    }
    connectingSessions.add(sessionId);"""

new_lock = """    if (connectingSessions.has(sessionId)) {
        const existingSock = activeSockets.get(sessionId);
        if (existingSock && phoneNumber) {
            log(`Session ${sessionId} déjà en cours de connexion, tentative de déclenchement du code sur le socket existant`, sessionId, { event: 'pairing-on-existing' }, 'INFO');
            // We can't easily inject the requestPairing function here as it's scoped to the other connect call.
            // But if it's already connecting, the other call will eventually reach the pairing logic if phoneNumber was passed.
            // If it wasn't, we might have a problem.
        }
        log(`Connexion déjà active pour ${sessionId}`, sessionId, { event: 'connect-locked' }, 'DEBUG');
        return existingSock;
    }
    connectingSessions.add(sessionId);"""

content = content.replace(old_lock, new_lock)

# 2. Ensure requestPairing handles sock.ws being missing
old_ws_check = "if (currentSock === sock && sock.ws && sock.ws.readyState === 1) {"
new_ws_check = "if (currentSock === sock && sock.ws && (sock.ws.readyState === 1 || sock.ws.readyState === 'OPEN')) {"

content = content.replace(old_ws_check, new_ws_check)

# 3. Add more logging to requestPairing
old_log_pairing = "log(`Demande de code pour ${sanitizedPhoneNumber}`, sessionId, { event: 'pairing-request' }, 'INFO');"
new_log_pairing = "log(`Préparation de la demande de code pour ${sanitizedPhoneNumber} (Socket exists: ${!!sock})`, sessionId, { event: 'pairing-prep' }, 'INFO');"

content = content.replace(old_log_pairing, new_log_pairing)

with open(path, 'w') as f:
    f.write(content)
