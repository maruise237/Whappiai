/**
 * WhatsApp Provider Interface
 * Abstraction for WhatsApp session/message providers
 */

/**
 * @typedef {Object} ProviderSession
 * @property {string} id
 * @property {string} status  - 'open' | 'close' | 'connecting' | 'unknown'
 * @property {string} [phoneNumber]
 * @property {string} [name]
 */

/**
 * @typedef {Object} QrPayload
 * @property {string} [code]         - QR string
 * @property {string} [pairingCode]  - Pairing code (alternative to QR)
 */

/**
 * @typedef {Object} SendMessageInput
 * @property {string} jid
 * @property {string} [text]
 * @property {Object} [media]        - { url, mimetype, type }
 */

class WhatsAppProvider {
    /**
     * @param {string} name
     */
    constructor(name) {
        if (new.target === WhatsAppProvider) {
            throw new Error('WhatsAppProvider is an interface; use a concrete implementation');
        }
        this.name = name;
    }

    /**
     * Create a new WhatsApp instance
     * @param {string} instanceId
     * @returns {Promise<{ok: boolean, payload?: any, error?: string}>}
     */
    async createInstance(instanceId) {
        throw new Error('Not implemented');
    }

    /**
     * Fetch the current QR code (or pairing code) for an instance
     * @param {string} instanceId
     * @returns {Promise<{ok: boolean, qr?: QrPayload, error?: string}>}
     */
    async getQr(instanceId) {
        throw new Error('Not implemented');
    }

    /**
     * Get the current connection state of an instance
     * @param {string} instanceId
     * @returns {Promise<{ok: boolean, state?: string, phoneNumber?: string, error?: string}>}
     */
    async getStatus(instanceId) {
        throw new Error('Not implemented');
    }

    /**
     * Disconnect/logout an instance
     * @param {string} instanceId
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async disconnectInstance(instanceId) {
        throw new Error('Not implemented');
    }

    /**
     * Delete an instance permanently
     * @param {string} instanceId
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async deleteInstance(instanceId) {
        throw new Error('Not implemented');
    }

    /**
     * Send a text message
     * @param {string} instanceId
     * @param {SendMessageInput} input
     * @returns {Promise<{ok: boolean, messageId?: string, error?: string}>}
     */
    async sendTextMessage(instanceId, input) {
        throw new Error('Not implemented');
    }

    /**
     * Optional: register a webhook URL for inbound events (provider-specific)
     * @param {string} instanceId
     * @param {string} webhookUrl
     * @param {string[]} events
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async setWebhook(instanceId, webhookUrl, events = []) {
        return { ok: true };
    }
}

module.exports = WhatsAppProvider;
