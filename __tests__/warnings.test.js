jest.mock('../src/config/database', () => ({
    db: {
        prepare: jest.fn(() => ({
            all: jest.fn(() => []),
            run: jest.fn()
        }))
    }
}));

const WarningService = require('../src/services/warnings');

describe('WarningService message composition', () => {
    test('warning message always includes remaining warnings before exclusion', () => {
        const message = WarningService.composeWarningMessage({
            template: '@{{name}} stop: {{reason}}.',
            senderJid: '237600000001@s.whatsapp.net',
            currentCount: 2,
            maxWarnings: 3,
            reason: 'Langage inapproprie'
        });

        expect(message).toContain('@237600000001');
        expect(message).toContain('Langage inapproprie');
        expect(message).toContain('Il reste 1 avertissement(s) avant exclusion');
        expect(message).toContain('Avertissement 2/3');
    });

    test('exclusion message announces member, reason and warning total', () => {
        const message = WarningService.composeExclusionMessage({
            senderJid: '237600000001@s.whatsapp.net',
            currentCount: 3,
            maxWarnings: 3,
            reason: 'Langage inapproprie'
        });

        expect(message).toContain('@237600000001');
        expect(message).toContain('a ete exclu du groupe');
        expect(message).toContain('Motif: Langage inapproprie');
        expect(message).toContain('3/3 avertissements recus');
    });
});
