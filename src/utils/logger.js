/**
 * Logger Utility
 * Handles application-wide logging and broadcasting to WebSocket clients
 */

let broadcastFn = null;
const LEVEL_RANK = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40 };

function getConfiguredLevel() {
    const explicit = (process.env.LOG_LEVEL || '').toUpperCase();
    if (LEVEL_RANK[explicit]) return explicit;
    return process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO';
}

function shouldLog(level) {
    return (LEVEL_RANK[level] || LEVEL_RANK.INFO) >= LEVEL_RANK[getConfiguredLevel()];
}

function sanitizeValue(key, value) {
    const lowerKey = String(key || '').toLowerCase();
    if (
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('claims') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('cookie')
    ) {
        return '[redacted]';
    }
    return value;
}

function sanitizeDetails(input) {
    if (!input || typeof input !== 'object') return input;
    if (input instanceof Error) {
        return {
            message: input.message,
            stack: input.stack,
            code: input.code
        };
    }
    if (Array.isArray(input)) {
        return input.map(item => sanitizeDetails(item));
    }

    const output = {};
    for (const [key, value] of Object.entries(input)) {
        const sanitized = sanitizeValue(key, value);
        output[key] = sanitized && typeof sanitized === 'object' ? sanitizeDetails(sanitized) : sanitized;
    }
    return output;
}

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

    level = String(level).toUpperCase();
    if (!shouldLog(level)) return;

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
                const sanitized = sanitizeDetails(details);
                JSON.stringify(sanitized);
                safeDetails = sanitized;
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
