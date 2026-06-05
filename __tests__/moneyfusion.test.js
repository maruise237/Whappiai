jest.mock('axios', () => ({
    post: jest.fn(),
    get: jest.fn()
}), { virtual: true });

jest.mock('../src/config/database', () => ({
    db: {
        prepare: jest.fn(() => ({
            get: jest.fn(),
            run: jest.fn(),
            all: jest.fn(() => [])
        }))
    }
}));

jest.mock('../src/models/User', () => ({
    findById: jest.fn(),
    findByEmail: jest.fn()
}));

jest.mock('../src/models/ActivityLog', () => ({
    log: jest.fn()
}));

jest.mock('../src/services/PricingService', () => ({
    getPlanByCode: jest.fn()
}));

jest.mock('../src/services/SubscriptionService', () => ({
    subscribe: jest.fn()
}));

const {
    buildMoneyFusionPaymentData,
    normalizeMoneyFusionStatus,
    extractMoneyFusionPersonalInfo
} = require('../src/services/moneyfusion');

describe('MoneyFusion helpers', () => {
    test('builds the required MoneyFusion payment payload', () => {
        const payload = buildMoneyFusionPaymentData({
            user: { id: 'user_1', email: 'client@example.com', name: 'Client Test' },
            plan: { id: 'pro', code: 'pro', name: 'Pro', price: 8000 },
            orderId: 'order_123',
            phoneNumber: ' 237699000000 ',
            returnUrl: 'https://whappi.test/dashboard/billing',
            webhookUrl: 'https://api.whappi.test/api/v1/payments/moneyfusion/webhook?secret=s'
        });

        expect(payload.totalPrice).toBe(8000);
        expect(payload.article).toEqual([{ 'Whappi Pro': 8000 }]);
        expect(payload.numeroSend).toBe('237699000000');
        expect(payload.nomclient).toBe('Client Test');
        expect(payload.personal_Info[0]).toMatchObject({
            userId: 'user_1',
            email: 'client@example.com',
            planCode: 'pro',
            orderId: 'order_123'
        });
        expect(payload.return_url).toBe('https://whappi.test/dashboard/billing');
        expect(payload.webhook_url).toBe('https://api.whappi.test/api/v1/payments/moneyfusion/webhook?secret=s');
    });

    test('allows card or crypto checkout without forcing a phone number', () => {
        const payload = buildMoneyFusionPaymentData({
            user: { id: 'user_1', email: 'client@example.com', name: 'Client Test' },
            plan: { id: 'pro', code: 'pro', name: 'Pro', price: 8000 },
            orderId: 'order_123',
            returnUrl: 'https://whappi.test/dashboard/billing',
            webhookUrl: 'https://api.whappi.test/api/v1/payments/moneyfusion/webhook?secret=s'
        });

        expect(payload.numeroSend).toBe('None');
    });

    test('normalizes MoneyFusion webhook and status values', () => {
        expect(normalizeMoneyFusionStatus({ event: 'payin.session.completed' })).toBe('completed');
        expect(normalizeMoneyFusionStatus({ statut: 'paid' })).toBe('completed');
        expect(normalizeMoneyFusionStatus({ event: 'payin.session.pending' })).toBe('pending');
        expect(normalizeMoneyFusionStatus({ statut: 'no paid' })).toBe('cancelled');
        expect(normalizeMoneyFusionStatus({ statut: 'failure' })).toBe('cancelled');
    });

    test('extracts personal info from the MoneyFusion array format', () => {
        const info = extractMoneyFusionPersonalInfo({
            personal_Info: [{ userId: 'user_1', planCode: 'starter', orderId: 'order_123' }]
        });

        expect(info).toEqual({ userId: 'user_1', planCode: 'starter', orderId: 'order_123' });
    });
});
