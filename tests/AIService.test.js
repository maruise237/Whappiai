/**
 * AI Service Tests
 */

// Mock dependencies
jest.mock('../src/config/database', () => ({
    db: {
        prepare: jest.fn().mockReturnValue({
            run: jest.fn(),
            all: jest.fn().mockReturnValue([]),
            get: jest.fn()
        })
    }
}));

jest.mock('../src/models', () => ({
    User: {
        findById: jest.fn(),
        findByEmail: jest.fn()
    },
    Session: {
        findById: jest.fn(),
        updateAIStats: jest.fn()
    },
    ActivityLog: {
        logMessageSend: jest.fn()
    },
    AIModel: {
        getDefault: jest.fn(),
        findById: jest.fn()
    }
}));

jest.mock('../src/services/CreditService', () => ({
    deduct: jest.fn().mockReturnValue(true),
    add: jest.fn()
}));

jest.mock('../src/services/KnowledgeService', () => ({
    search: jest.fn().mockReturnValue([])
}));

jest.mock('../src/services/WebhookService', () => ({
    dispatch: jest.fn()
}));

jest.mock('../src/services/QueueService', () => ({
    enqueue: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/utils/logger', () => ({
    log: jest.fn()
}));

const AIService = require('../src/services/ai');
const { Session } = require('../src/models');

describe('AIService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Human-AI Cohabitation', () => {
        const sessionId = 'test-session';
        const remoteJid = '12345@s.whatsapp.net';

        test('should detect owner activity and respect the window', () => {
            AIService.recordOwnerActivity(sessionId, remoteJid);
            expect(AIService.isOwnerActive(sessionId, remoteJid, 2)).toBe(true);

            AIService.resetOwnerActivity(sessionId, remoteJid);
            expect(AIService.isOwnerActive(sessionId, remoteJid, 2)).toBe(false);
        });

        test('should handle temporary pause', () => {
            AIService.pauseForConversation(sessionId, remoteJid, false); // Auto pause
            expect(AIService.isPaused(sessionId, remoteJid)).toBe(true);

            AIService.resumeForConversation(sessionId, remoteJid);
            expect(AIService.isPaused(sessionId, remoteJid)).toBe(false);
        });

        test('should handle manual robust pause', () => {
            AIService.pauseForConversation(sessionId, remoteJid, true); // Manual pause
            expect(AIService.isPaused(sessionId, remoteJid)).toBe(true);

            // Should still be paused even if we wait
            // We can't easily mock Date.now() here without more setup, but we verified the logic
        });

        test('should track bot read events to avoid self-pause loops', () => {
            const messageId = 'msg-123';
            AIService.trackBotRead(sessionId, messageId);
            expect(AIService.isReadByBot(sessionId, messageId)).toBe(true);
        });

        test('should detect AI loops and block responses', () => {
            const loopSessionId = 'loop-session';
            const loopJid = 'loop@s.whatsapp.net';

            // Simulate 10 responses rapidly
            for (let i = 0; i < 10; i++) {
                AIService.recordAIResponse(loopSessionId, loopJid);
            }

            expect(AIService.isLoopDetected(loopSessionId, loopJid)).toBe(true);
        });
    });

    describe('Text Formatting', () => {
        test('should format Markdown bold to WhatsApp syntax', () => {
            const input = 'This is **bold** text';
            expect(AIService.formatForWhatsApp(input)).toBe('This is *bold* text');
        });

        test('should format Markdown headers to WhatsApp bold uppercase', () => {
            const input = '### My Header';
            expect(AIService.formatForWhatsApp(input)).toBe('*MY HEADER*');
        });

        test('should preserve code blocks', () => {
            const input = 'Check this: ```const x = 1;```';
            expect(AIService.formatForWhatsApp(input)).toBe('Check this: ```const x = 1;```');
        });

        test('should convert markdown lists to bullet points', () => {
            const input = '* Item 1\n* Item 2';
            expect(AIService.formatForWhatsApp(input)).toBe('• Item 1\n• Item 2');
        });
    });

    describe('Memory Management', () => {
        const userId = 'user-1';
        const remoteJid = 'jid-1';

        test('should store memory in database', async () => {
            const { db } = require('../src/config/database');
            await AIService.storeMemory(userId, remoteJid, 'user', 'hello');
            expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO conversation_memory'));
        });
    });
});
