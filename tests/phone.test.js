const { normalizeJid } = require('../src/utils/phone');

// Mock dependencies
jest.mock('../src/utils/logger', () => ({
    log: jest.fn()
}));

jest.mock('@whiskeysockets/baileys', () => ({
    jidNormalizedUser: jest.fn(jid => {
        // Simple mock implementation of jidNormalizedUser
        // In reality, baileys handles @c.us, @s.whatsapp.net, etc.
        // For testing, we just return what's passed or a simple transform
        return jid;
    })
}), { virtual: true });

describe('Phone Utilities', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = process.env;
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('normalizeJid', () => {
        test('should return null if no number is provided', () => {
            expect(normalizeJid(null)).toBeNull();
            expect(normalizeJid('')).toBeNull();
            expect(normalizeJid(undefined)).toBeNull();
        });

        test('should return the number as-is if it already includes "@"', () => {
            expect(normalizeJid('1234567890@s.whatsapp.net')).toBe('1234567890@s.whatsapp.net');
            expect(normalizeJid('1234567890@g.us')).toBe('1234567890@g.us');
        });

        test('should remove non-digits from the number and append @s.whatsapp.net', () => {
            expect(normalizeJid('123-456-7890')).toBe('1234567890@s.whatsapp.net');
            expect(normalizeJid('+1 (234) 567-890')).toBe('1234567890@s.whatsapp.net');
            expect(normalizeJid('abc123xyz456')).toBe('123456@s.whatsapp.net');
        });

        test('should add default country code if number length is <= 10 and does not start with it', () => {
            // Test with passed defaultCountryCode parameter
            expect(normalizeJid('654321098', '237')).toBe('237654321098@s.whatsapp.net');

            // Length is 10
            expect(normalizeJid('1234567890', '44')).toBe('441234567890@s.whatsapp.net');
        });

        test('should NOT add default country code if number length is > 10', () => {
            expect(normalizeJid('12345678901', '237')).toBe('12345678901@s.whatsapp.net');
        });

        test('should NOT add default country code if number already starts with it', () => {
            expect(normalizeJid('2376543210', '237')).toBe('2376543210@s.whatsapp.net');
        });

        test('should use process.env.DEFAULT_COUNTRY_CODE as fallback if parameter is not provided', () => {
            process.env.DEFAULT_COUNTRY_CODE = '237';
            expect(normalizeJid('654321098')).toBe('237654321098@s.whatsapp.net');
        });

        test('should NOT add country code if no parameter is provided and process.env is empty', () => {
            process.env.DEFAULT_COUNTRY_CODE = '';
            expect(normalizeJid('654321098')).toBe('654321098@s.whatsapp.net');
        });

        test('should clean characters before checking length and adding country code', () => {
            // '654-321-098' has 11 chars but 9 digits
            expect(normalizeJid('654-321-098', '237')).toBe('237654321098@s.whatsapp.net');
        });
    });
});
