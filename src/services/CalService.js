const axios = require('axios');
const { log } = require('../utils/logger');
const User = require('../models/User');

class CalService {
    constructor() {
        this.clientId = process.env.CAL_CLIENT_ID;
        this.clientSecret = process.env.CAL_CLIENT_SECRET;
        this.redirectUri = process.env.CAL_REDIRECT_URI || 'http://localhost:3010/api/v1/cal/callback';
        this.apiUrl = 'https://api.cal.com/v2';
    }

    /**
     * Get the OAuth authorization URL
     * @param {string} userId
     * @returns {string}
     */
    getAuthUrl(userId) {
        return `https://app.cal.com/auth/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${userId}&response_type=code`;
    }

    /**
     * Exchange authorization code for access token
     * @param {string} code
     * @param {string} userId
     */
    async exchangeCode(code, userId) {
        try {
            const response = await axios.post('https://api.cal.com/v2/oauth/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code,
                redirect_uri: this.redirectUri,
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
            return response.data.data;
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
            // location is optional, Cal.com defaults to event type location
            // If ai_cal_video_allowed is on, and location is not specified, Cal.com usually handles it

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
            } else if (user.ai_cal_video_allowed) {
                // If video is allowed but no specific location, we might want to suggest 'integrations:cal-video'
                // or similar based on Cal.com API v2 specs. For now, let's leave it to the event type default.
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
