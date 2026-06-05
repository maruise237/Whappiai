const { shouldCelebrateSessionConnection } = require('../frontend/src/lib/session-celebration');

describe('shouldCelebrateSessionConnection', () => {
    test('does not celebrate a connected session discovered on page load', () => {
        expect(shouldCelebrateSessionConnection(undefined, { status: 'CONNECTED' })).toBe(false);
    });

    test('does not celebrate a session that was already connected', () => {
        expect(
            shouldCelebrateSessionConnection(
                { sessionId: 'ventes', status: 'CONNECTED', isConnected: true },
                { sessionId: 'ventes', status: 'CONNECTED' }
            )
        ).toBe(false);
    });

    test('celebrates the transition from disconnected to connected', () => {
        expect(
            shouldCelebrateSessionConnection(
                { sessionId: 'ventes', status: 'GENERATING_QR', isConnected: false },
                { sessionId: 'ventes', status: 'CONNECTED' }
            )
        ).toBe(true);
    });
});
