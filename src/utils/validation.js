const validator = require('validator');

/**
 * Validation utilities
 */

/**
 * Validates an ID to prevent path traversal and ensure safe characters.
 * Allows alphanumeric characters, underscores, and hyphens.
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidId = (id) => {
    if (!id || typeof id !== 'string') return false;
    // Allow alphanumeric, underscores, hyphens, colons, @ symbols, and spaces
    return /^[a-zA-Z0-9_@.: -]{1,128}$/.test(id);
};

/**
 * Sanitizes a filename/ID by removing unsafe characters.
 * @param {string} text - The input text
 * @returns {string} - Sanitized text
 */
const sanitizeId = (text) => {
    if (!text || typeof text !== 'string') return '';
    // Allow alphanumeric, underscores, hyphens, colons, @ symbols, and spaces
    return text.replace(/[^a-zA-Z0-9_@.: -]/g, '');
};

/**
 * Validates an AI model configuration.
 * @param {Object} config - The model configuration to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
const validateAIModel = (config) => {
    const errors = [];

    // Support aliases for validation
    const name = config.name;
    const endpoint = config.endpoint || config.api_endpoint;
    const api_key = config.api_key || config.key;
    const model_name = config.model_name || config.model_code;

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
        errors.push('Model name must be at least 3 characters long');
    }
    if (!endpoint || !validator.isURL(endpoint, { require_tld: false, require_protocol: true })) {
        errors.push('Invalid API endpoint URL (must include http:// or https://)');
    }
    // During update, api_key might be empty if we want to keep the existing one
    // But for a NEW model, it must be provided.
    // We check for length < 8 because "YOUR_API_KEY_HERE" or real keys are long.
    if (config.isNew && (!api_key || typeof api_key !== 'string' || api_key.trim().length < 8)) {
        errors.push('API key is required and must be valid');
    }
    if (!model_name || typeof model_name !== 'string' || model_name.trim().length < 2) {
        errors.push('Model name/ID (e.g., deepseek-chat) is required');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    isValidId,
    sanitizeId,
    validateAIModel
};
