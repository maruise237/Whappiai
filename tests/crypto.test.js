const { encrypt, decrypt, generateKey, isValidKey } = require('../src/utils/crypto');

describe('Crypto Utilities', () => {
    // 64-hex character key
    const testKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    describe('encrypt and decrypt', () => {
        test('should return an empty string when encrypting falsy data', () => {
            expect(encrypt(null, testKey)).toBe('');
            expect(encrypt(undefined, testKey)).toBe('');
            expect(encrypt('', testKey)).toBe('');
        });

        test('should successfully encrypt and decrypt a string', () => {
            const originalText = 'Hello, World! This is a secret message.';
            const encrypted = encrypt(originalText, testKey);

            expect(encrypted).not.toBe(originalText);
            expect(typeof encrypted).toBe('string');
            expect(encrypted.includes(':')).toBe(true);

            const decrypted = decrypt(encrypted, testKey);
            expect(decrypted).toBe(originalText);
        });

        test('should successfully encrypt and decrypt a JSON object', () => {
            const originalObject = {
                id: 123,
                message: 'Secret payload',
                timestamp: new Date().toISOString()
            };

            const encrypted = encrypt(originalObject, testKey);

            expect(encrypted).not.toBe(JSON.stringify(originalObject));
            expect(typeof encrypted).toBe('string');
            expect(encrypted.includes(':')).toBe(true);

            const decryptedStr = decrypt(encrypted, testKey);
            const decryptedObject = JSON.parse(decryptedStr);
            expect(decryptedObject).toEqual(originalObject);
        });

        test('different encryptions of the same data should produce different results (due to random IV)', () => {
            const originalText = 'Consistent text';
            const encrypted1 = encrypt(originalText, testKey);
            const encrypted2 = encrypt(originalText, testKey);

            expect(encrypted1).not.toBe(encrypted2);

            // Both should still decrypt to the same original text
            expect(decrypt(encrypted1, testKey)).toBe(originalText);
            expect(decrypt(encrypted2, testKey)).toBe(originalText);
        });
    });

    describe('generateKey', () => {
        test('should generate a 64-character hex string', () => {
            const key = generateKey();
            expect(typeof key).toBe('string');
            expect(key.length).toBe(64);
            expect(/^[0-9a-f]+$/i.test(key)).toBe(true);
        });

        test('should generate unique keys', () => {
            const key1 = generateKey();
            const key2 = generateKey();
            expect(key1).not.toBe(key2);
        });
    });

    describe('isValidKey', () => {
        test('should return true for valid 64-char hex strings', () => {
            const validKey = 'a'.repeat(64);
            expect(isValidKey(validKey)).toBe(true);

            const generatedKey = generateKey();
            expect(isValidKey(generatedKey)).toBe(true);
        });

        test('should return falsy for invalid keys', () => {
            expect(isValidKey(null)).toBeFalsy();
            expect(isValidKey(undefined)).toBeFalsy();
            expect(isValidKey('')).toBeFalsy();
            expect(isValidKey('short-key')).toBeFalsy();

            // Contains non-hex characters
            const invalidHex = 'g'.repeat(64);
            expect(isValidKey(invalidHex)).toBeFalsy();
        });
    });
});
