/**
 * Tests pour le Middleware de Validation
 */

// Mock dependencies
jest.mock('../src/utils/validation', () => ({
    isValidId: jest.fn((id) => {
        if (!id || typeof id !== 'string') return false;
        return /^[a-zA-Z0-9_@.: -]{1,128}$/.test(id);
    })
}));

jest.mock('validator', () => ({
    isEmail: jest.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    isURL: jest.fn((url, options) => {
        if (!url) return false;
        const hasProtocol = /^https?:\/\//.test(url);
        if (options && options.require_protocol && !hasProtocol) return false;
        return true;
    })
}));

const validators = require('../src/middleware/validators');

describe('Validation Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            params: {},
            query: {},
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('validateSessionId', () => {
        test('should pass with valid session ID', () => {
            req.params.sessionId = 'session-123';
            validators.validateSessionId(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should reject missing session ID', () => {
            validators.validateSessionId(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Session ID est requis'
            });
        });

        test('should reject invalid session ID format', () => {
            req.params.sessionId = '../traversal';
            validators.validateSessionId(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Format de Session ID invalide'
            });
        });
    });

    describe('validateEmail', () => {
        test('should pass with valid email in body', () => {
            req.body.email = 'test@example.com';
            validators.validateEmail(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should pass with valid email in query', () => {
            req.query.email = 'test@example.com';
            validators.validateEmail(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should reject missing email', () => {
            validators.validateEmail(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Email est requis'
            });
        });

        test('should reject invalid email format', () => {
            req.body.email = 'invalid-email';
            validators.validateEmail(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: "Format d'email invalide"
            });
        });
    });

    describe('validatePhoneNumber', () => {
        test('should pass with valid phone number', () => {
            req.body.phone = '+1234567890';
            validators.validatePhoneNumber(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.cleanedPhone).toBe('1234567890');
        });

        test('should clean and validate phone number with spaces', () => {
            req.body.phone = '123 456 7890';
            validators.validatePhoneNumber(req, res, next);
            expect(next).toHaveBeenCalled();
            expect(req.cleanedPhone).toBe('1234567890');
        });

        test('should reject missing phone number', () => {
            validators.validatePhoneNumber(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Numéro de téléphone est requis'
            });
        });

        test('should reject phone number too short', () => {
            req.body.phone = '123';
            validators.validatePhoneNumber(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Numéro de téléphone invalide. Doit contenir 8-15 chiffres.'
            });
        });

        test('should reject phone number too long', () => {
            req.body.phone = '1234567890123456';
            validators.validatePhoneNumber(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Numéro de téléphone invalide. Doit contenir 8-15 chiffres.'
            });
        });
    });

    describe('validateWebhookUrl', () => {
        test('should pass with valid HTTPS URL', () => {
            req.body.url = 'https://example.com/webhook';
            validators.validateWebhookUrl(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should pass with valid HTTP URL', () => {
            req.body.url = 'http://localhost:3000/webhook';
            validators.validateWebhookUrl(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should reject missing URL', () => {
            validators.validateWebhookUrl(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'URL webhook est requise'
            });
        });

        test('should reject URL without protocol', () => {
            req.body.url = 'example.com/webhook';
            validators.validateWebhookUrl(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'URL webhook invalide. Doit commencer par http:// ou https://'
            });
        });
    });

    describe('validateNotEmptyBody', () => {
        test('should pass with non-empty body', () => {
            req.body = { field: 'value' };
            validators.validateNotEmptyBody(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should reject empty body', () => {
            req.body = {};
            validators.validateNotEmptyBody(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Le corps de la requête ne peut pas être vide'
            });
        });
    });

    describe('validateRequiredFields', () => {
        test('should pass when all required fields are present', () => {
            req.body = { name: 'test', email: 'test@example.com' };
            const middleware = validators.validateRequiredFields('name', 'email');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should reject when required field is missing', () => {
            req.body = { name: 'test' };
            const middleware = validators.validateRequiredFields('name', 'email');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Champs requis manquants: email'
            });
        });

        test('should reject when multiple required fields are missing', () => {
            req.body = {};
            const middleware = validators.validateRequiredFields('name', 'email', 'phone');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Champs requis manquants: name, email, phone'
            });
        });

        test('should accept fields from query or params', () => {
            req.query = { name: 'test' };
            req.params = { email: 'test@example.com' };
            const middleware = validators.validateRequiredFields('name', 'email');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('validateArrayLimit', () => {
        test('should pass when array is within limit', () => {
            req.body = { items: [1, 2, 3] };
            const middleware = validators.validateArrayLimit(5, 'items');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should reject when array exceeds limit', () => {
            req.body = { items: [1, 2, 3, 4, 5, 6] };
            const middleware = validators.validateArrayLimit(5, 'items');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'items ne peut pas dépasser 5 éléments'
            });
        });

        test('should reject when field is not an array', () => {
            req.body = { items: 'not-an-array' };
            const middleware = validators.validateArrayLimit(5, 'items');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'items doit être un tableau'
            });
        });
    });

    describe('validateStringLength', () => {
        test('should pass when string length is within range', () => {
            req.body = { name: 'test' };
            const middleware = validators.validateStringLength('name', 2, 10);
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        test('should reject when string is too short', () => {
            req.body = { name: 'a' };
            const middleware = validators.validateStringLength('name', 2, 10);
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'name doit contenir entre 2 et 10 caractères'
            });
        });

        test('should reject when string is too long', () => {
            req.body = { name: 'this-is-very-long' };
            const middleware = validators.validateStringLength('name', 2, 10);
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'name doit contenir entre 2 et 10 caractères'
            });
        });

        test('should reject when field is missing', () => {
            const middleware = validators.validateStringLength('name', 2, 10);
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'name est requis et doit être une chaîne de caractères'
            });
        });
    });
});
