/**
 * Evolution API Provider Adapter
 * https://github.com/EvolutionAPI/evolution-api
 */

const WhatsAppProvider = require('./WhatsAppProvider');
const { log } = require('../../utils/logger');

/**
 * TTL cache — stores last successful API response.
 * Served when Evolution is temporarily unreachable (crash, restart, network glitch).
 */
class TtlCache {
    constructor(ttlMs) {
        this._store = new Map();
        this._ttl = ttlMs;
    }
    get(key) {
        const entry = this._store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.ts > this._ttl) {
            this._store.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data) {
        this._store.set(key, { data, ts: Date.now() });
    }
    has(key) {
        return this.get(key) !== null;
    }
}

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
        // Resilience cache — TTL in ms (default 5 min). Set EVOLUTION_CACHE_TTL_MS to override.
        const cacheTtl = parseInt(process.env.EVOLUTION_CACHE_TTL_MS, 10) || 300000;
        this._cache = new TtlCache(cacheTtl);
    }

    /**
     * Internal HTTP helper
     * @param {string} method
     * @param {string} path
     * @param {Object} [body]
     * @param {boolean} [useInstanceKey=false] - use instance token instead of global API key
     * @param {string} [instanceId] - required if useInstanceKey is true
     */
    async _request(method, path, body, useInstanceKey = false, instanceId) {
        const url = `${this.baseUrl}${path}`;
        let apiKey = this.apiKey;
        if (useInstanceKey) {
            if (!instanceId) throw new Error('instanceId required with useInstanceKey');
            const name = this._instanceName(instanceId);
            const token = await this._getInstanceToken(name);
            if (token) apiKey = token;
        }
        const headers = {
            'Content-Type': 'application/json',
            'apikey': apiKey
        };
        let res;
        try {
            res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(15000) // 15s timeout
            });
        } catch (err) {
            // Network error (connection refused, DNS fail, timeout, etc.)
            const errorMsg = err.name === 'TimeoutError' ? 'Evolution API timeout' : `Evolution API unreachable: ${err.message}`;
            log(`[evolution] ${method} ${path} failed — ${errorMsg}`, null, { url }, 'WARN');
            return { ok: false, status: 0, error: errorMsg, networkError: true };
        }
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

    _instanceTokenCache = {};

    async _getInstanceToken(name) {
        if (this._instanceTokenCache[name]) return this._instanceTokenCache[name];
        let res;
        try {
            res = await fetch(`${this.baseUrl}/instance/fetchInstances`, {
                headers: { 'apikey': this.apiKey },
                signal: AbortSignal.timeout(10000)
            });
        } catch {
            return null; // network error — no fallback cached token needed
        }
        if (!res.ok) return null;
        const text = await res.text();
        let instances;
        try { instances = JSON.parse(text); } catch { return null; }
        if (!Array.isArray(instances)) return null;
        const match = instances.find(i => i.name === name);
        if (match && match.token) {
            this._instanceTokenCache[name] = match.token;
            return match.token;
        }
        return null;
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
        if (!res.ok) {
            // Evolution down — serve cached status
            const cached = this._cache.get(`status:${instanceId}`);
            if (cached) {
                log(`[evolution] getStatus fallback to cache for ${instanceId}`, instanceId, null, 'INFO');
                return { ok: true, state: cached.state, phoneNumber: cached.phoneNumber, cached: true };
            }
            return res;
        }
        const state = (res.payload && (res.payload.state || res.payload.instance && res.payload.instance.state)) || 'unknown';
        let phoneNumber = (res.payload && (res.payload.phoneNumber || res.payload.instance && res.payload.instance.ownerJid)) || null;
        // connectionState doesn't always return ownerJid; try fetchInstances as fallback
        if (!phoneNumber) {
            const instances = await this._request('GET', '/instance/fetchInstances');
            if (instances.ok && Array.isArray(instances.payload)) {
                const match = instances.payload.find(i => i.name === name);
                if (match && match.ownerJid) phoneNumber = match.ownerJid;
            }
        }
        // Cache on success
        this._cache.set(`status:${instanceId}`, { state, phoneNumber });
        return { ok: true, state, phoneNumber };
    }

    async disconnectInstance(instanceId) {
        const name = this._instanceName(instanceId);
        return this._request('DELETE', `/instance/logout/${name}`);
    }

    async deleteInstance(instanceId) {
        const name = this._instanceName(instanceId);

        // Best-effort logout first so connected WhatsApp devices are detached before deletion.
        // Some Evolution versions return 400/404 when the instance is already closed; ignore that
        // and continue to the destructive delete call.
        await this._request('DELETE', `/instance/logout/${name}`).catch(() => null);

        const res = await this._request('DELETE', `/instance/delete/${name}`);

        // If the instance is already gone on Evolution, local cleanup is safe and prevents stale Whappi rows.
        const errorText = String(res.error || '').toLowerCase();
        if (!res.ok && (res.status === 404 || errorText.includes('not found') || errorText.includes('não encontrada') || errorText.includes('not exist'))) {
            return { ok: true, status: res.status, alreadyDeleted: true, payload: res.payload || null };
        }

        return res;
    }

    async sendTextMessage(instanceId, input) {
        const name = this._instanceName(instanceId);
        const body = {
            number: input.jid,
            text: input.text || ''
        };
        if (input.mentions && Array.isArray(input.mentions)) {
            body.mentions = input.mentions;
        }
        const res = await this._request('POST', `/message/sendText/${name}`, body);
        if (!res.ok) {
            log(`sendTextMessage failed for ${instanceId}: ${res.error}`, instanceId, null, 'ERROR');
            return res;
        }
        const messageId = (res.payload && res.payload.key && res.payload.key.id) || (res.payload && res.payload.id) || null;
        return { ok: true, messageId };
    }

    async setWebhook(instanceId, webhookUrl, events = []) {
        const name = this._instanceName(instanceId);
        const body = {
            webhook: {
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
            }
        };
        return this._request('POST', `/webhook/set/${name}`, body);
    }

    /**
     * Delete a message for everyone (revoke)
     * @param {string} instanceId
     * @param {Object} msg - { id, remoteJid, fromMe }
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async deleteMessage(instanceId, msg) {
        const name = this._instanceName(instanceId);
        const body = {
            id: msg.id,
            remoteJid: msg.remoteJid,
            fromMe: msg.fromMe !== false
        };
        if (msg.participant) body.participant = msg.participant;
        const res = await this._request('DELETE', `/chat/deleteMessageForEveryone/${name}`, body);
        if (!res.ok) {
            log(`deleteMessage failed for ${instanceId}: ${res.error} (id=${msg.id}, remoteJid=${msg.remoteJid})`, instanceId, null, 'ERROR');
        }
        return res;
    }

    /**
     * Update group participants (kick, promote, demote, add)
     * @param {string} instanceId
     * @param {Object} opts - { groupJid, action: 'add'|'remove'|'promote'|'demote', participants: string[] }
     * @returns {Promise<{ok: boolean, error?: string}>}
     */
    async groupUpdateParticipant(instanceId, opts) {
        const name = this._instanceName(instanceId);
        const body = {
            groupJid: opts.groupJid,
            action: opts.action,
            participants: opts.participants
        };
        return this._request('POST', `/group/updateParticipant/${name}`, body);
    }

    /**
     * Fetch all groups for this instance via Evolution API
     * @param {string} instanceId
     * @returns {Promise<{ok: boolean, groups?: Array, error?: string}>}
     */
    /**
     * Send a media message (image, video, audio, document)
     * @param {string} instanceId
     * @param {Object} input - { jid, mediaUrl, mediaType, caption?, fileName? }
     * @returns {Promise<{ok: boolean, messageId?: string, error?: string}>}
     */
    async sendMedia(instanceId, input) {
        const name = this._instanceName(instanceId);
        // Evolution API /message/sendMedia/{name}
        // Supports both URL and base64 media. We use URL mode.
        const body = {
            number: input.jid,
            mediatype: input.mediaType || 'image', // image|video|audio|document
            media: input.mediaUrl
        };
        if (input.caption) body.caption = input.caption;
        if (input.fileName) body.fileName = input.fileName;

        const res = await this._request('POST', `/message/sendMedia/${name}`, body);
        if (!res.ok) return res;
        const messageId = (res.payload && res.payload.key && res.payload.key.id) || (res.payload && res.payload.id) || null;
        return { ok: true, messageId };
    }

    async fetchGroups(instanceId) {
        const name = this._instanceName(instanceId);
        const res = await this._request('GET', `/group/fetchAllGroups/${name}?getParticipants=true`);
        if (!res.ok) {
            // Evolution down — serve cached groups
            const cached = this._cache.get(`groups:${instanceId}`);
            if (cached) {
                log(`[evolution] fetchGroups fallback to cache for ${instanceId}`, instanceId, null, 'INFO');
                return { ok: true, groups: cached, cached: true };
            }
            return res;
        }
        const groups = Array.isArray(res.payload) ? res.payload : [];
        // Cache on success
        this._cache.set(`groups:${instanceId}`, groups);
        return { ok: true, groups };
    }

    /**
     * Resolve a @lid participant JID to the actual WhatsApp phone JID
     * by fetching group participants and matching the lid ID.
     * @param {string} instanceId
     * @param {string} lidJid - e.g. "74797258166444@lid"
     * @returns {Promise<string|null>} - e.g. "237658992588@s.whatsapp.net"
     */
    async resolveParticipantJid(instanceId, lidJid) {
        if (!lidJid || !lidJid.endsWith('@lid')) return lidJid;
        const name = this._instanceName(instanceId);
        const res = await this._request('GET', `/group/fetchAllGroups/${name}?getParticipants=true`);
        if (!res.ok || !Array.isArray(res.payload)) return lidJid;
        for (const group of res.payload) {
            const participants = group.participants || [];
            const match = participants.find(p => p.id === lidJid);
            if (match && match.phoneNumber) return match.phoneNumber;
        }
        return lidJid;
    }
}

module.exports = EvolutionApiProvider;
