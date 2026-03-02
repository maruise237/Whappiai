const axios = require('axios');
const { log } = require('../utils/logger');
const User = require('../models/User');

class CalService {
    get clientId() {
        return process.env.CAL_CLIENT_ID;
    }

    get clientSecret() {
        return process.env.CAL_CLIENT_SECRET;
    }

    get redirectUri() {
        return process.env.CAL_REDIRECT_URI;
    }

    get apiUrl() {
        return 'https://api.cal.com/v2';
    }

    /**
     * Get the OAuth authorization URL
     * @param {string} userId
     * @param {string} fallbackBaseUrl - Optional base URL from request
     * @returns {string}
     */
    getAuthUrl(userId, fallbackBaseUrl = null) {
        let finalRedirectUri = this.redirectUri;

        if (!finalRedirectUri && fallbackBaseUrl) {
            finalRedirectUri = `${fallbackBaseUrl}/api/v1/cal/callback`;
        }

        if (!finalRedirectUri) {
            finalRedirectUri = 'http://localhost:3010/api/v1/cal/callback';
        }

        log(`Génération URL OAuth Cal.com. Redirect URI: ${finalRedirectUri}`, 'SYSTEM', { clientId: this.clientId, redirectUri: finalRedirectUri }, 'DEBUG');

        if (!this.clientId || this.clientId.trim() === '' || this.clientId.includes('xxxx')) {
            throw new Error('Configuration Cal.com incorrecte : CAL_CLIENT_ID est manquant ou contient des caractères d\'exemple (xxxx). Veuillez vérifier vos variables d\'environnement.');
        }

        return `https://app.cal.com/auth/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&state=${userId}&response_type=code`;
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code
     * @param {string} userId
     * @param {string} fallbackBaseUrl - Optional base URL from request
     */
    async exchangeCode(code, userId, fallbackBaseUrl = null) {
        if (!this.clientSecret || this.clientSecret.trim() === '' || this.clientSecret.includes('votre_secret')) {
            throw new Error('Configuration Cal.com incomplète : CAL_CLIENT_SECRET est manquant dans le .env');
        }

        // We use the same logic for redirectUri as in getAuthUrl
        // In OAuth2, the redirect_uri must be EXACTLY the same during code exchange
        let finalRedirectUri = this.redirectUri;
        if (!finalRedirectUri && fallbackBaseUrl) {
            finalRedirectUri = `${fallbackBaseUrl}/api/v1/cal/callback`;
        }

        if (!finalRedirectUri) {
            finalRedirectUri = 'http://localhost:3010/api/v1/cal/callback';
        }

        try {
            const response = await axios.post('https://api.cal.com/v2/oauth/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code,
                redirect_uri: finalRedirectUri,
                grant_type: 'authorization_code'
            });

            const { access_token, refresh_token, expires_in } = response.data.data;
            const expiry = Math.floor(Date.now() / 1000) + expires_in;

            await User.update(userId, {
                cal_access_token: access_token,
                cal_refresh_token: refresh_token,
                cal_token_expiry: expiry
            });

            return response.data;
        } catch (error) {
            log(`CalService exchangeCode error: ${error.message}`, 'SYSTEM', { error: error.response?.data || error.message }, 'ERROR');
            throw error;
        }
    }

    /**
     * Refresh the access token
     * @param {string} userId
     */
    async refreshToken(userId) {
        const user = User.findById(userId);
        if (!user || !user.cal_refresh_token) throw new Error('No refresh token found');

        try {
            const response = await axios.post('https://api.cal.com/v2/oauth/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: user.cal_refresh_token,
                grant_type: 'refresh_token'
            });

            const { access_token, refresh_token, expires_in } = response.data.data;
            const expiry = Math.floor(Date.now() / 1000) + expires_in;

            await User.update(userId, {
                cal_access_token: access_token,
                cal_refresh_token: refresh_token,
                cal_token_expiry: expiry
            });

            return access_token;
        } catch (error) {
            log(`CalService refreshToken error: ${error.message}`, 'SYSTEM', { error: error.response?.data || error.message }, 'ERROR');
            throw error;
        }
    }

    /**
     * Get valid access token for user
     * @param {string} userId
     */
    async getAccessToken(userId) {
        const user = await User.findById(userId);
        if (!user || !user.cal_access_token) return null;

        if (user.cal_token_expiry && Date.now() / 1000 > user.cal_token_expiry - 60) {
            return await this.refreshToken(userId);
        }

        return user.cal_access_token;
    }

    /**
     * List user event types
     * @param {string} userId
     */
    async getEventTypes(userId) {
        const token = await this.getAccessToken(userId);
        if (!token) return [];

        try {
            const response = await axios.get(`${this.apiUrl}/event-types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data?.data || response.data || [];
        } catch (error) {
            log(`CalService getEventTypes error: ${error.message}`, 'SYSTEM', { error: error.response?.data || error.message }, 'ERROR');
            return [];
        }
    }

    /**
     * Get availability for an event type
     * @param {string} userId
     * @param {number} eventTypeId
     * @param {string} startTime ISO string
     * @param {string} endTime ISO string
     */
    async getAvailability(userId, eventTypeId, startTime, endTime) {
        const token = await this.getAccessToken(userId);
        if (!token) return [];

        try {
            const response = await axios.get(`${this.apiUrl}/slots/available`, {
                params: {
                    eventTypeId,
                    startTime,
                    endTime
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.data.slots;
        } catch (error) {
            log(`CalService getAvailability error: ${error.message}`, 'SYSTEM', { error: error.response?.data || error.message }, 'ERROR');
            return [];
        }
    }

    /**
     * Create a booking
     * @param {string} userId
     * @param {object} bookingDetails
     */
    async createBooking(userId, { eventTypeId, start, name, email, notes, location }) {
        const token = await this.getAccessToken(userId);
        if (!token) throw new Error('User not connected to Cal.com');

        try {
            const user = await User.findById(userId);
            const payload = {
                eventTypeId,
                start,
                responses: {
                    name,
                    email,
                    notes
                }
            };

            if (location) {
                payload.location = location;
            }

            const response = await axios.post(`${this.apiUrl}/bookings`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.data;
        } catch (error) {
            log(`CalService createBooking error: ${error.message}`, 'SYSTEM', { error: error.response?.data || error.message }, 'ERROR');
            throw error;
        }
    }
}

module.exports = new CalService();
