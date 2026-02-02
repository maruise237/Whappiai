const whatsappService = require('./src/services/whatsapp');
const { Session } = require('./src/models');
const path = require('path');
require('dotenv').config();

async function forceReconnect() {
    const sessionId = 'kamtech';
    console.log(`Forcing reconnect for session: ${sessionId}`);
    
    try {
        await whatsappService.connect(sessionId, (id, status, detail, qr) => {
            console.log(`Status Update [${id}]: ${status} - ${detail}`);
            Session.updateStatus(id, status, detail);
        }, (id, msg) => {
            console.log(`New Message [${id}]:`, msg);
        });
        
        console.log('Connect call finished. Waiting for connection events...');
        
        // Keep script running for a bit to see events
        setTimeout(() => {
            console.log('Done waiting.');
            process.exit(0);
        }, 30000);
        
    } catch (err) {
        console.error('Failed to connect:', err);
        process.exit(1);
    }
}

forceReconnect();
