/**
 * Cal Service Tests
 */

jest.mock('../src/utils/logger', () => ({
    log: jest.fn()
}));

const CalService = require('../src/services/CalService');

describe('CalService', () => {
    let originalEnv;

    beforeEach(() => {
        jest.clearAllMocks();
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('resolveRedirectUri', () => {
        it('Priority 1: should use CAL_REDIRECT_URI if provided', () => {
            process.env.CAL_REDIRECT_URI = 'https://custom.cal.app/api/v1/cal/callback';
            const uri = CalService.resolveRedirectUri();
            expect(uri).toBe('https://custom.cal.app/api/v1/cal/callback');
        });

        it('Priority 1: should append path to CAL_REDIRECT_URI if missing', () => {
            process.env.CAL_REDIRECT_URI = 'https://custom.cal.app';
            const uri = CalService.resolveRedirectUri();
            expect(uri).toBe('https://custom.cal.app/api/v1/cal/callback');
        });

        it('Priority 1: should handle trailing slash on CAL_REDIRECT_URI', () => {
            process.env.CAL_REDIRECT_URI = 'https://custom.cal.app/';
            const uri = CalService.resolveRedirectUri();
            expect(uri).toBe('https://custom.cal.app/api/v1/cal/callback');
        });

        it('Priority 2: should use NEXT_PUBLIC_API_URL if CAL_REDIRECT_URI is missing', () => {
            delete process.env.CAL_REDIRECT_URI;
            process.env.NEXT_PUBLIC_API_URL = 'https://api.myapp.com';
            const uri = CalService.resolveRedirectUri();
            expect(uri).toBe('https://api.myapp.com/api/v1/cal/callback');
        });

        it('Priority 2: should use APP_URL if NEXT_PUBLIC_API_URL is missing', () => {
            delete process.env.CAL_REDIRECT_URI;
            delete process.env.NEXT_PUBLIC_API_URL;
            process.env.APP_URL = 'https://app.myapp.com/';
            const uri = CalService.resolveRedirectUri();
            expect(uri).toBe('https://app.myapp.com/api/v1/cal/callback');
        });

        it('Priority 3: should use dynamic fallback if no env variables exist', () => {
            delete process.env.CAL_REDIRECT_URI;
            delete process.env.NEXT_PUBLIC_API_URL;
            delete process.env.APP_URL;
            const fallbackBaseUrl = 'http://dynamic.host:8080';
            const uri = CalService.resolveRedirectUri(fallbackBaseUrl);
            expect(uri).toBe('http://dynamic.host:8080/api/v1/cal/callback');
        });

        it('Priority 3: should handle dynamic fallback with trailing slash', () => {
            delete process.env.CAL_REDIRECT_URI;
            delete process.env.NEXT_PUBLIC_API_URL;
            delete process.env.APP_URL;
            const fallbackBaseUrl = 'http://dynamic.host:8080/';
            const uri = CalService.resolveRedirectUri(fallbackBaseUrl);
            expect(uri).toBe('http://dynamic.host:8080/api/v1/cal/callback');
        });

        it('Priority 4: should use ultimate fallback to localhost if nothing else provided', () => {
            delete process.env.CAL_REDIRECT_URI;
            delete process.env.NEXT_PUBLIC_API_URL;
            delete process.env.APP_URL;
            const uri = CalService.resolveRedirectUri();
            expect(uri).toBe('http://localhost:3010/api/v1/cal/callback');
        });
    });
});
