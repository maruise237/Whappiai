/**
 * Warning Service Tests
 */

jest.mock('../src/config/database', () => ({
    db: {
        prepare: jest.fn()
    }
}));

const { db } = require('../src/config/database');
const WarningService = require('../src/services/warnings');

describe('WarningService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('lists warned members for a group ordered by warning count', () => {
        const rows = [
            { user_id: '237600000001@s.whatsapp.net', count: 3, last_warning_at: '2026-06-05T17:00:00.000Z' },
            { user_id: '237600000002@s.whatsapp.net', count: 1, last_warning_at: '2026-06-05T16:00:00.000Z' }
        ];
        const all = jest.fn().mockReturnValue(rows);
        db.prepare.mockReturnValue({ all });

        const warnedMembers = WarningService.listByGroup('session-a', '120363@g.us');

        expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM user_warnings'));
        expect(all).toHaveBeenCalledWith('session-a', '120363@g.us');
        expect(warnedMembers).toEqual([
            {
                userId: '237600000001@s.whatsapp.net',
                phone: '237600000001',
                count: 3,
                lastWarningAt: '2026-06-05T17:00:00.000Z',
                risk: 'high'
            },
            {
                userId: '237600000002@s.whatsapp.net',
                phone: '237600000002',
                count: 1,
                lastWarningAt: '2026-06-05T16:00:00.000Z',
                risk: 'low'
            }
        ]);
    });

    test('composes warning message with remaining count before exclusion', () => {
        const message = WarningService.composeWarningMessage({
            template: '@{{name}} message supprime: {{reason}}. Il reste {{remaining}} avertissement(s) avant exclusion.',
            senderJid: '237600000001@s.whatsapp.net',
            currentCount: 2,
            maxWarnings: 5,
            reason: 'Lien non autorise'
        });

        expect(message).toBe('@237600000001 message supprime: Lien non autorise. Il reste 3 avertissement(s) avant exclusion.');
    });
});
