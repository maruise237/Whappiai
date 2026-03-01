import os

path = 'src/services/NotificationService.js'
with open(path, 'r') as f:
    content = f.read()

# Improved broadcast integration
old_code = """        log(`Notification created for ${userId}: ${type}`, 'SYSTEM');

        // Real-time push via WebSocket could be added here
        // websocketService.sendToUser(userId, 'notification', { ... });"""

new_code = """        log(`Notification created for ${userId}: ${type}`, 'SYSTEM');

        // Real-time push via WebSocket
        try {
            const { broadcast } = require('../utils/logger');
            broadcast({
                type: 'notification',
                data: {
                    userId,
                    type,
                    id,
                    title,
                    message,
                    created_at: new Date().toISOString()
                }
            });
        } catch (e) {
            log(`Failed to broadcast notification: ${e.message}`, 'SYSTEM', null, 'WARN');
        }"""

# Since I already patched it once, let's look for what's there
if 'const { broadcast }' not in content:
    # Use a broader replacement if the first patch was partial or failed to match exactly
    import re
    content = re.sub(r'log\(`Notification created for \$\{userId\}: \$\{type\}`,\s*\'SYSTEM\'\);.*?\/\/ websocketService\.sendToUser.*?\n', new_code + '\n', content, flags=re.DOTALL)

with open(path, 'w') as f:
    f.write(content)
