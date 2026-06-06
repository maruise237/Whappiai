/**
 * Evolution API Provider Adapter
 * https://github.com/EvolutionAPI/evolution-api
 */

const WhatsAppProvider = require('./WhatsAppProvider');

class EvolutionApiProvider extends WhatsAppProvider {
    /**
     * @param {Object} [config]
     * @param {string} [config.baseUrl]   - e.g. https://evolution.kamtech.online
     * @param {string} [config.apiKey]    - global api key
     */
    constructor(config = {}) {
        super('evolution');
        this.baseUrl = (config.baseUrl || process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
        this.apiKey = config.apiKey || process.env.EVOLUTION_API_KEY || '';
        // Whappi uses the sessionId directly as the Evolution instance name.
        // Optional override via EVOLUTION_INSTANCE_PREFIX.
        this.instancePrefix = process.env.EVOLUTION_INSTANCE_PREFIX || '';
        if (!this.baseUrl) {
            // Soft warning: provider will fail per-call but the module is loadable
            // eslint-disable-next-line no-console
            console.warn('[evolution] EVOLUTION_API_URL is not set');
        }
    }

    /**
     * Internal HTTP helper
     * @param {string} method
     * @param {string} path
     * @param {Object} [body]
     */
    async _request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
        };
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        let payload = null;
        if (text) {
            try { payload = JSON.parse(text); } catch { payload = text; }
        }
        if (!res.ok) {
            return { ok: false, status: res.status, error: (payload && payload.message) || (payload && payload.response && payload.response.message) || text || `HTTP ${res.status}` };
        }
        return { ok: true, status: res.status, payload };
    }

    _instanceName(instanceId) {
        if (!instanceId) throw new Error('instanceId is required');
        const safe = String(instanceId).replace(/[^A-Za-z0-9_-]/g, '_');
        return this.instancePrefix ? `${this.instancePrefix}-${safe}` : safe;
    }

    async createInstance(instanceId, options = {}) {
        const name = this._instanceName(instanceId);
        const body = {
            instanceName: name,
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true
        };
        // Passing a phone number triggers Evolution to issue a pairing code (8 chars)
        // instead of a QR. This is required for devices that can't scan a QR.
        if (options.phoneNumber) {
            body.number = String(options.phoneNumber).replace(/\D+/g, '');
        }
        const res = await this._request('POST', '/instance/create', body);
        return res;
    }

    /**
     * Get the QR code for a given instance.
     * The provider returns { pairinCode, code, base64 }. We normalize to:
     *  - qr.pairingCode (string|null)
     *  - qr.code (string|null)
     *  - qr.base64 (string|null, data:image/png;base64,...)
     */
    async getQr(instanceId) {
        const name = this._instanceName(instanceId);
        const res = await this._request('GET', `/instance/connect/${name}`);
        if (!res.ok) return res;
        const data = res.payload || {};
        // Evolution v2: payload is flat { pairinCode, code, base64 }
        const pairingCode = data.pairinCode || data.pairingCode || null;
        const code = data.code || null;
        const base64 = data.base64 || null;
        if (!pairingCode && !code && !base64) {
            return { ok: false, error: 'No QR/pairing data returned' };
        }
        return { ok: true, qr: { pairingCode, code, base64 } };
    }

    async getStatus(instanceId) {
        const name = this._instanceName(instanceId);
        const res = await this._request('GET', `/instance/connectionState/${name}`);
        if (!res.ok) return res;
        const state = (res.payload && (res.payload.state || res.payload.instance && res.payload.instance.state)) || 'unknown';
        const phoneNumber = (res.payload && (res.payload.phoneNumber || res.payload.instance && res.payload.instance.ownerJid)) || null;
        return { ok: true, state, phoneNumber };
    }

    async disconnectInstance(instanceId) {
        const name = this._instanceName(instanceId);
        return this._request('DELETE', `/instance/logout/${name}`);
    }

    async deleteInstance(instanceId) {
        const name = this._instanceName(instanceId);
        return this._request('DELETE', `/instance/delete/${name}`);
    }

    async sendTextMessage(instanceId, input) {
        const name = this._instanceName(instanceId);
        const body = {
            number: input.jid,
            text: input.text || ''
        };
        const res = await this._request('POST', `/message/sendText/${name}`, body);
        if (!res.ok) return res;
        const messageId = (res.payload && res.payload.key && res.payload.key.id) || (res.payload && res.payload.id) || null;
        return { ok: true, messageId };
    }

    async setWebhook(instanceId, webhookUrl, events = []) {
        const name = this._instanceName(instanceId);
        const body = {
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false,
            events: events.length ? events : [
                'APPLICATION_STARTUP',
                'QRCODE_UPDATED',
                'CONNECTION_UPDATE',
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'SEND_MESSAGE',
                'CONTACTS_UPDATE',
                'GROUPS_UPSERT'
            ]
        };
        return this._request('POST', `/webhook/set/${name}`, body);
    }
}

module.exports = EvolutionApiProvider;
