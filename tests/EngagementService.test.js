/**
 * Engagement Service Tests
 */

// Mock dependencies
jest.mock('../src/config/database', () => ({
    db: {
        transaction: (fn) => fn,
        prepare: jest.fn().mockReturnValue({
            all: jest.fn().mockReturnValue([]),
            run: jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
            get: jest.fn().mockReturnValue(null)
        })
    }
}));

jest.mock('../src/utils/logger', () => ({
    log: jest.fn()
}));

jest.mock('../src/services/whatsapp', () => ({
    getSocket: jest.fn(),
    isConnected: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mock-uuid')
}));

const EngagementService = require('../src/services/engagement');
const { db } = require('../src/config/database');

describe('EngagementService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should add a task correctly', () => {
        const taskData = {
            group_id: 'group1',
            session_id: 'session1',
            message_content: 'Hello',
            media_url: null,
            media_type: 'text',
            scheduled_at: '2026-01-01T10:00:00Z',
            recurrence: 'none'
        };

        const taskId = EngagementService.addTask(taskData);

        expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO group_engagement_tasks'));
        expect(taskId).toBe(1);
    });

    test('should retrieve tasks for a group', () => {
        db.prepare().all.mockReturnValue([{ id: 1, message_content: 'Test' }]);

        const tasks = EngagementService.getTasks('session1', 'group1');

        expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM group_engagement_tasks'));
        expect(tasks).toHaveLength(1);
        expect(tasks[0].message_content).toBe('Test');
    });

    test('should delete a task', () => {
        EngagementService.deleteTask(1);
        expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM group_engagement_tasks'));
    });
});
