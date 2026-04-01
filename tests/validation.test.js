const mockValidator = {
    isURL: (url) => {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch (e) {
            return false;
        }
    }
};

jest.mock('validator', () => mockValidator, { virtual: true });

const { isValidId, sanitizeId, validateAIModel } = require('../src/utils/validation');

describe('Validation Utilities', () => {
    describe('isValidId', () => {
        test('should return true for valid IDs', () => {
            expect(isValidId('user123')).toBe(true);
            expect(isValidId('user_123')).toBe(true);
            expect(isValidId('user-123')).toBe(true);
            expect(isValidId('user@domain.com')).toBe(true);
            expect(isValidId('user:123')).toBe(true);
            expect(isValidId('user.name')).toBe(true);
            expect(isValidId('user name')).toBe(true);
            expect(isValidId('A'.repeat(128))).toBe(true);
        });

        test('should return false for invalid IDs', () => {
            expect(isValidId('../path')).toBe(false);
            expect(isValidId('user%123')).toBe(false);
            expect(isValidId('user$123')).toBe(false);
            expect(isValidId('user&123')).toBe(false);
            expect(isValidId('A'.repeat(129))).toBe(false);
        });

        test('should return false for non-string or empty inputs', () => {
            expect(isValidId('')).toBe(false);
            expect(isValidId(null)).toBe(false);
            expect(isValidId(undefined)).toBe(false);
            expect(isValidId(123)).toBe(false);
            expect(isValidId({})).toBe(false);
        });
    });

    describe('sanitizeId', () => {
        test('should remove unsafe characters', () => {
            expect(sanitizeId('user/123')).toBe('user123');
            expect(sanitizeId('user%123$')).toBe('user123');
            expect(sanitizeId('user&name#')).toBe('username');
        });

        test('should keep safe characters', () => {
            expect(sanitizeId('user_123-abc@domain.com:8080.test name')).toBe('user_123-abc@domain.com:8080.test name');
        });

        test('should handle empty or non-string inputs', () => {
            expect(sanitizeId('')).toBe('');
            expect(sanitizeId(null)).toBe('');
            expect(sanitizeId(undefined)).toBe('');
            expect(sanitizeId(123)).toBe('');
        });
    });

    describe('validateAIModel', () => {
        test('should return isValid true for valid configuration', () => {
            const config = {
                name: 'GPT-4',
                endpoint: 'https://api.openai.com/v1',
                api_key: 'sk-12345678',
                model_name: 'gpt-4'
            };
            const result = validateAIModel(config);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should support aliases for configuration fields', () => {
            const config = {
                name: 'GPT-4',
                api_endpoint: 'https://api.openai.com/v1',
                key: 'sk-12345678',
                model_code: 'gpt-4'
            };
            const result = validateAIModel(config);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should return errors for invalid configuration', () => {
            const config = {
                name: 'GP',
                endpoint: 'not-a-url',
                isNew: true,
                api_key: 'short',
                model_name: 'g'
            };
            const result = validateAIModel(config);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Model name must be at least 3 characters long');
            expect(result.errors).toContain('Invalid API endpoint URL (must include http:// or https://)');
            expect(result.errors).toContain('API key is required and must be valid');
            expect(result.errors).toContain('Model name/ID (e.g., deepseek-chat) is required');
        });

        test('should not require api_key if isNew is false', () => {
            const config = {
                name: 'GPT-4',
                endpoint: 'https://api.openai.com/v1',
                model_name: 'gpt-4',
                isNew: false
            };
            const result = validateAIModel(config);
            expect(result.isValid).toBe(true);
        });
    });
});
