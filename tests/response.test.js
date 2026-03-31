// Mock the logger
jest.mock('../src/utils/logger', () => ({
    log: jest.fn()
}));

const { log } = require('../src/utils/logger');
const responseUtils = require('../src/utils/response');

describe('Response Utilities', () => {
    let mockRes;

    beforeEach(() => {
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('success()', () => {
        test('should send a success response with default status code 200 and no data', () => {
            responseUtils.success(mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success' });
        });

        test('should send a success response with provided data', () => {
            const data = { id: 1, name: 'Test' };
            responseUtils.success(mockRes, data);
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'success',
                data
            });
        });

        test('should send a success response with custom status code', () => {
            responseUtils.success(mockRes, null, 201);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({ status: 'success' });
        });
    });

    describe('error()', () => {
        test('should send an error response with default status code 400', () => {
            responseUtils.error(mockRes, 'Bad request');
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Bad request'
            });
        });

        test('should send an error response with custom status code', () => {
            responseUtils.error(mockRes, 'Custom error', 418);
            expect(mockRes.status).toHaveBeenCalledWith(418);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Custom error'
            });
        });

        test('should send an error response with details', () => {
            const details = { field: 'email', issue: 'invalid format' };
            responseUtils.error(mockRes, 'Validation error', 400, details);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Validation error',
                details
            });
        });
    });

    describe('validationError()', () => {
        test('should send a validation error response with 422 status code', () => {
            const errors = ['Email is required', 'Password is too short'];
            responseUtils.validationError(mockRes, errors);
            expect(mockRes.status).toHaveBeenCalledWith(422);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Validation failed',
                details: { errors }
            });
        });
    });

    describe('unauthorized()', () => {
        test('should send an unauthorized response with default message', () => {
            responseUtils.unauthorized(mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Unauthorized'
            });
        });

        test('should send an unauthorized response with custom message', () => {
            responseUtils.unauthorized(mockRes, 'Token expired');
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Token expired'
            });
        });
    });

    describe('forbidden()', () => {
        test('should send a forbidden response with default message', () => {
            responseUtils.forbidden(mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Forbidden'
            });
        });

        test('should send a forbidden response with custom message', () => {
            responseUtils.forbidden(mockRes, 'Access denied');
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Access denied'
            });
        });
    });

    describe('notFound()', () => {
        test('should send a not found response with default message', () => {
            responseUtils.notFound(mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Not found'
            });
        });

        test('should send a not found response with custom message', () => {
            responseUtils.notFound(mockRes, 'User not found');
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'User not found'
            });
        });
    });

    describe('serverError()', () => {
        test('should send a server error response without an error object', () => {
            responseUtils.serverError(mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Internal server error'
            });
            expect(log).not.toHaveBeenCalled();
        });

        test('should send a server error response with custom message', () => {
            responseUtils.serverError(mockRes, 'Database failure');
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Database failure'
            });
            expect(log).not.toHaveBeenCalled();
        });

        test('should log the error and send a server error response when err is provided', () => {
            const err = new Error('Test exception');
            err.stack = 'Error: Test exception\n    at Object.<anonymous> (/test.js:1:1)';

            responseUtils.serverError(mockRes, 'Something went wrong', err);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Something went wrong'
            });
            expect(log).toHaveBeenCalledWith(
                `[Server Error] Something went wrong: Test exception`,
                'SYSTEM',
                { error: 'Test exception', stack: err.stack },
                'ERROR'
            );
        });
    });
});
