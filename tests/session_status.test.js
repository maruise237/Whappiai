const Session = require('../src/models/Session');
const db = require('../src/db/query');

jest.mock('../src/db/query', () => {
    let mockSession = {
        id: 'test_session_1',
        owner_email: 'user@test.com',
        status: 'CONNECTING',
        pairing_code: '12345678',
        qr_code: 'data:image/png;base64,123'
    };
    return {
        findById: jest.fn(async () => ({ ...mockSession })),
        get: jest.fn(async () => ({ ...mockSession })),
        run: jest.fn(async (sql, params) => {
            if (sql.includes('UPDATE whatsapp_sessions')) {
                mockSession.status = params[0];
                mockSession.detail = params[1];
                mockSession.pairing_code = params[2];
                mockSession.qr_code = params[3];
            }
            return { changes: 1 };
        }),
        _reset: () => {
            mockSession = {
                id: 'test_session_1',
                owner_email: 'user@test.com',
                status: 'CONNECTING',
                pairing_code: '12345678',
                qr_code: 'data:image/png;base64,123'
            };
        }
    };
});

describe('Session status updates', () => {
    beforeEach(() => {
        require('../src/db/query')._reset();
    });

    it('preserves pairing_code and qr_code on DISCONNECTED status when undefined', async () => {
        const updated = await Session.updateStatus('test_session_1', 'DISCONNECTED', 'Connection closed');
        expect(updated.pairing_code).toBe('12345678');
        expect(updated.qr_code).toBe('data:image/png;base64,123');
    });

    it('clears pairing_code and qr_code when explicitly passed as null', async () => {
        const updated = await Session.updateStatus('test_session_1', 'DISCONNECTED', 'Connection closed', null, null);
        expect(updated.pairing_code).toBeNull();
        expect(updated.qr_code).toBeNull();
    });
});
