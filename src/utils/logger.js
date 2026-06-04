/**
 * Logger Utility
 * Handles application-wide logging and broadcasting to WebSocket clients
 */

let broadcastFn = null;

/**
 * Set the broadcast function for real-time logs
 * @param {function} fn - The broadcast function
 */
function setBroadcastFn(fn) {
    broadcastFn = fn;
}

/**
 * Application-wide log function
 * @param {string} message - Log message
 * @param {string} context - Context (e.g., Session ID or SYSTEM)
 * @param {object} details - Additional details (optional)
 * @param {string} level - Log level (INFO, WARN, ERROR)
 */
function log(message, context = 'SYSTEM', details = null, level = null) {
    // Determine level if not provided (heuristic)
    if (!level) {
        const lowerMsg = message.toLowerCase();
        if (lowerMsg.includes('error') || lowerMsg.includes('fail') || lowerMsg.includes('exception')) {
            level = 'ERROR';
        } else if (lowerMsg.includes('warn') || lowerMsg.includes('alert') || lowerMsg.includes('attention')) {
            level = 'WARN';
        } else {
            level = 'INFO';
        }
    }

    // Safe details (prevent circular structure errors)
    let safeDetails = null;
    if (details) {
        if (details instanceof Error) {
            safeDetails = {
                message: details.message,
                stack: details.stack,
                code: details.code
            };
        } else {
            try {
                // Quick check for circularity
                JSON.stringify(details);
                safeDetails = details;
            } catch (e) {
                safeDetails = { error: 'Circular structure detected', originalMessage: details.toString() };
            }
        }
    }

    const logObject = {
        type: 'log',
        timestamp: new Date().toISOString(),
        sessionId: context,
        message: message,
        level: level,
        details: safeDetails
    };

    // Print to console
    const consoleMethod = level === 'ERROR' ? 'error' : (level === 'WARN' ? 'warn' : 'log');
    console[consoleMethod](`[${logObject.timestamp}] [${logObject.level}] [${logObject.sessionId}] ${message}`, safeDetails || '');

    // Broadcast to all connected dashboard clients if broadcast function is set
    if (broadcastFn) {
        broadcastFn(logObject);
    }
}

module.exports = {
    log,
    setBroadcastFn
};
