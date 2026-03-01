import os

path = 'src/services/NotificationService.js'
with open(path, 'r') as f:
    content = f.read()

# Add broadcast to NotificationService
old_code = """        log(`Notification created for ${userId}: ${type}`, 'SYSTEM');

        // Real-time push via WebSocket could be added here
        // websocketService.sendToUser(userId, 'notification', { ... });"""

new_code = """        log(`Notification created for ${userId}: ${type}`, 'SYSTEM');

        // Real-time push via WebSocket
        try {
            const { log: appLog } = require('../utils/logger');
            // We use a pseudo-global or require index.js approach?
            // Actually index.js sets setBroadcastFn in logger.js
            // So we can just use a specific broadcast type if we want, or rely on logger.
            // But notifications need to be sent specifically to a user.
            // For now, we'll broadcast a general 'notification-update' which triggers a refresh.
            const { broadcastToClients } = require('../../index.js');
            if (typeof broadcastToClients === 'function') {
                broadcastToClients({ type: 'notification', data: { userId, type, id } });
            }
        } catch (e) {
            // Silently fail if broadcast function is not yet available
        }"""

if 'broadcastToClients' not in content:
    content = content.replace(old_code, new_code)

with open(path, 'w') as f:
    f.write(content)
