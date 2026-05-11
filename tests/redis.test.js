/**
 * Tests pour le service Redis
 */

const redisService = require('../src/services/redis');

// Mock Redis client
const mockRedisClient = {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    mGet: jest.fn(),
    quit: jest.fn(),
    info: jest.fn(),
    on: jest.fn()
};

jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedisClient)
}));

describe('RedisService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset connection state
        redisService.client = null;
        redisService.isConnected = false;
        redisService.isConfigured = false;
    });

    describe('connect()', () => {
        test('should return false when REDIS_URL is not configured', async () => {
            delete process.env.REDIS_URL;
            const result = await redisService.connect();
            expect(result).toBe(false);
            expect(redisService.isConfigured).toBe(false);
        });

        test('should connect successfully when REDIS_URL is configured', async () => {
            process.env.REDIS_URL = 'redis://localhost:6379';
            mockRedisClient.connect = jest.fn().mockResolvedValue(undefined);
            
            const result = await redisService.connect();
            
            expect(result).toBe(true);
            expect(redisService.isConfigured).toBe(true);
            expect(mockRedisClient.connect).toHaveBeenCalled();
        });

        test('should handle connection errors gracefully', async () => {
            process.env.REDIS_URL = 'redis://localhost:6379';
            mockRedisClient.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));
            
            const result = await redisService.connect();
            
            expect(result).toBe(false);
            expect(redisService.isConfigured).toBe(false);
        });
    });

    describe('get()', () => {
        test('should return null when not connected', async () => {
            const result = await redisService.get('test-key');
            expect(result).toBe(null);
        });

        test('should get and parse JSON value', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            
            const testData = { userId: '123', email: 'test@example.com' };
            mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));
            
            const result = await redisService.get('clerk:user:123');
            
            expect(result).toEqual(testData);
            expect(mockRedisClient.get).toHaveBeenCalledWith('clerk:user:123');
        });

        test('should return string value as-is if not JSON', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            
            mockRedisClient.get.mockResolvedValue('simple-string');
            
            const result = await redisService.get('simple-key');
            
            expect(result).toBe('simple-string');
        });
    });

    describe('set()', () => {
        test('should return false when not connected', async () => {
            const result = await redisService.set('key', 'value');
            expect(result).toBe(false);
        });

        test('should set value with default TTL', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            mockRedisClient.setEx.mockResolvedValue('OK');
            
            const result = await redisService.set('test-key', { data: 'value' });
            
            expect(result).toBe(true);
            expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 3600, expect.any(String));
        });

        test('should set value with custom TTL', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            mockRedisClient.setEx.mockResolvedValue('OK');
            
            await redisService.set('test-key', 'value', 300);
            
            expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 300, 'value');
        });
    });

    describe('delete()', () => {
        test('should return false when not connected', async () => {
            const result = await redisService.delete('key');
            expect(result).toBe(false);
        });

        test('should delete key successfully', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            mockRedisClient.del.mockResolvedValue(1);
            
            const result = await redisService.delete('test-key');
            
            expect(result).toBe(true);
            expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
        });
    });

    describe('exists()', () => {
        test('should return false when not connected', async () => {
            const result = await redisService.exists('key');
            expect(result).toBe(false);
        });

        test('should return true if key exists', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            mockRedisClient.exists.mockResolvedValue(1);
            
            const result = await redisService.exists('test-key');
            
            expect(result).toBe(true);
        });

        test('should return false if key does not exist', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            mockRedisClient.exists.mockResolvedValue(0);
            
            const result = await redisService.exists('nonexistent-key');
            
            expect(result).toBe(false);
        });
    });

    describe('disconnect()', () => {
        test('should disconnect successfully', async () => {
            redisService.isConnected = true;
            redisService.client = mockRedisClient;
            mockRedisClient.quit.mockResolvedValue(undefined);
            
            await redisService.disconnect();
            
            expect(mockRedisClient.quit).toHaveBeenCalled();
            expect(redisService.isConnected).toBe(false);
        });

        test('should handle disconnect when not connected', async () => {
            redisService.isConnected = false;
            redisService.client = null;
            
            await redisService.disconnect();
            
            expect(mockRedisClient.quit).not.toHaveBeenCalled();
        });
    });
});
