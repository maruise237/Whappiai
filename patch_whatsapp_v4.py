import os

path = 'src/services/whatsapp.js'
with open(path, 'r') as f:
    content = f.read()

# Fix the connect lock to allow pairing requests to be queued or handled
old_code = """    if (connectingSessions.has(sessionId)) {
        const existingSock = activeSockets.get(sessionId);
        if (existingSock && phoneNumber) {
            log(`Session ${sessionId} déjà en cours de connexion, tentative de déclenchement du code sur le socket existant`, sessionId, { event: 'pairing-on-existing' }, 'INFO');
            # We can't easily inject the requestPairing function here as it's scoped to the other connect call.
            # But if it's already connecting, the other call will eventually reach the pairing logic if phoneNumber was passed.
            # If it wasn't, we might have a problem.
        }
        log(`Connexion déjà active pour ${sessionId}`, sessionId, { event: 'connect-locked' }, 'DEBUG');
        return existingSock;
    }"""

# Wait, I used # instead of // in the previous script? No, I see it in the read_file output.
# Actually the previous script had:
# if (existingSock && phoneNumber) {
#    log(`Session ${sessionId} déjà en cours de connexion, tentative de déclenchement du code sur le socket existant`, sessionId, { event: 'pairing-on-existing' }, 'INFO');
#    // We can't easily inject the requestPairing function here as it's scoped to the other connect call.
#    // But if it's already connecting, the other call will eventually reach the pairing logic if phoneNumber was passed.
#    log(`Préparation de la demande de code pour ${sanitizedPhoneNumber} (Socket exists: ${!!sock})`, sessionId, { event: 'pairing-prep' }, 'INFO');

# It seems I messed up the replacement logic. Let's rewrite the connect function head.

new_connect_head = """async function connect(sessionId, onUpdate, onMessage, phoneNumber = null) {
    if (!require('../utils/validation').isValidId(sessionId)) throw new Error('Invalid session ID');
    if (deletingSessions.has(sessionId)) return null;

    if (connectingSessions.has(sessionId)) {
        const existingSock = activeSockets.get(sessionId);
        if (existingSock && phoneNumber && !existingSock.registered) {
            log(`Demande de code reçue alors que la session ${sessionId} est déjà en cours de connexion`, sessionId, { event: 'pairing-on-existing' }, 'INFO');
            // Instead of returning, we could potentially force a disconnect and reconnect if we really need to change the phoneNumber
            // but for now let's just log it. The problem is often that the first call didn't have a phoneNumber.
            await disconnect(sessionId, false);
            // After disconnect, we continue to create a new one with the phoneNumber
        } else {
            log(`Connexion déjà active pour ${sessionId}`, sessionId, { event: 'connect-locked' }, 'DEBUG');
            return existingSock;
        }
    }
    connectingSessions.add(sessionId);"""

# Replace from the start of the function to the lock block
import re
pattern = r"async function connect\(sessionId, onUpdate, onMessage, phoneNumber = null\) \{.*?connectingSessions\.add\(sessionId\);"
content = re.sub(pattern, new_connect_head, content, flags=re.DOTALL)

with open(path, 'w') as f:
    f.write(content)
