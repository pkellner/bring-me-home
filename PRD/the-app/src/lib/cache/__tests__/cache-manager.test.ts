import { jest } from '@jest/globals';
import { getMemoryCache, getRedisCache } from '../cache-manager';

// Mock environment variables
const originalEnv = process.env;

// Mock Redis client
jest.mock('ioredis', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      flushall: jest.fn(),
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

describe('CacheManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Memory Cache', () => {
    it('should return disabled cache when CACHE_MEMORY_ENABLE is not set', async () => {
      delete process.env.CACHE_MEMORY_ENABLE;
      const cache = await getMemoryCache();
      
      // Test disabled cache behavior
      await expect(cache.set('key', 'value')).resolves.toBeUndefined();
      await expect(cache.get('key')).resolves.toBeNull();
      await expect(cache.del('key')).resolves.toBeUndefined();
      await expect(cache.reset()).resolves.toBeUndefined();
    });

    it('should return disabled cache when CACHE_MEMORY_ENABLE is false', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'false';
      const cache = await getMemoryCache();
      
      await expect(cache.get('key')).resolves.toBeNull();
    });

    it('should return functional cache when CACHE_MEMORY_ENABLE is true', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      process.env.CACHE_MEMORY_TTL = '60';
      process.env.CACHE_MEMORY_MAX_SIZE_MB = '10';
      
      const cache = await getMemoryCache();
      
      // Test basic operations
      await cache.set('test-key', { data: 'test-value' });
      const result = await cache.get('test-key');
      expect(result).toEqual({ data: 'test-value' });
      
      // Test deletion
      await cache.del('test-key');
      const deleted = await cache.get('test-key');
      expect(deleted).toBeNull();
    });

    it('should handle different data types', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      // String
      await cache.set('string-key', 'string-value');
      expect(await cache.get('string-key')).toBe('string-value');
      
      // Number
      await cache.set('number-key', 42);
      expect(await cache.get('number-key')).toBe(42);
      
      // Object
      const obj = { name: 'test', values: [1, 2, 3] };
      await cache.set('object-key', obj);
      expect(await cache.get('object-key')).toEqual(obj);
      
      // Array
      const arr = [1, 'two', { three: 3 }];
      await cache.set('array-key', arr);
      expect(await cache.get('array-key')).toEqual(arr);
    });

    it('should respect custom TTL', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      // Set with custom TTL
      await cache.set('ttl-key', 'value', 1); // 1 second TTL
      expect(await cache.get('ttl-key')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(await cache.get('ttl-key')).toBeNull();
    });

    it('should handle size-based eviction', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      process.env.CACHE_MEMORY_MAX_SIZE_MB = '0.001'; // Very small size to trigger eviction
      
      const cache = await getMemoryCache();
      
      // Add multiple items to trigger eviction
      const largeData = 'x'.repeat(1000); // 1KB string
      
      await cache.set('key1', largeData);
      await cache.set('key2', largeData);
      await cache.set('key3', largeData);
      
      // Earlier keys should be evicted
      const key1 = await cache.get('key1');
      const key3 = await cache.get('key3');
      
      // At least one should be evicted
      expect(key1 === null || key3 === null).toBe(true);
    });

    it('should handle reset operation', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      await cache.reset();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('Redis Cache', () => {
    it('should return null when CACHE_REDIS_ENABLE is not set', async () => {
      delete process.env.CACHE_REDIS_ENABLE;
      const cache = await getRedisCache();
      expect(cache).toBeNull();
    });

    it('should return null when CACHE_REDIS_ENABLE is false', async () => {
      process.env.CACHE_REDIS_ENABLE = 'false';
      const cache = await getRedisCache();
      expect(cache).toBeNull();
    });

    it('should return null when Redis connection fails', async () => {
      process.env.CACHE_REDIS_ENABLE = 'true';
      process.env.REDIS_HOST = 'invalid-host';
      
      // Mock Redis to throw connection error
      const Redis = (await import('ioredis')).default;
      Redis.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      
      const cache = await getRedisCache();
      expect(cache).toBeNull();
    });

    it('should return functional cache when CACHE_REDIS_ENABLE is true', async () => {
      process.env.CACHE_REDIS_ENABLE = 'true';
      process.env.REDIS_HOST = 'localhost';
      process.env.REDIS_PORT = '6379';
      process.env.CACHE_REDIS_TTL = '300';
      
      const cache = await getRedisCache();
      expect(cache).not.toBeNull();
      
      if (cache) {
        // Test that cache methods exist
        expect(typeof cache.get).toBe('function');
        expect(typeof cache.set).toBe('function');
        expect(typeof cache.del).toBe('function');
        expect(typeof cache.reset).toBe('function');
      }
    });

    it('should handle Redis operations correctly', async () => {
      process.env.CACHE_REDIS_ENABLE = 'true';
      
      const Redis = (await import('ioredis')).default;
      const mockRedis = {
        get: jest.fn().mockResolvedValue('{"data":"test"}'),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        flushall: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockReturnValue(mockRedis);
      
      const cache = await getRedisCache();
      expect(cache).not.toBeNull();
      
      if (cache) {
        // Test get
        const result = await cache.get('test-key');
        expect(result).toEqual({ data: 'test' });
        expect(mockRedis.get).toHaveBeenCalledWith('test-key');
        
        // Test set
        await cache.set('test-key', { data: 'new' }, 60);
        expect(mockRedis.set).toHaveBeenCalledWith('test-key', '{"data":"new"}', 'EX', 60);
        
        // Test del
        await cache.del('test-key');
        expect(mockRedis.del).toHaveBeenCalledWith('test-key');
        
        // Test reset
        await cache.reset();
        expect(mockRedis.flushall).toHaveBeenCalled();
      }
    });

    it('should handle serialization errors gracefully', async () => {
      process.env.CACHE_REDIS_ENABLE = 'true';
      
      const Redis = (await import('ioredis')).default;
      const mockRedis = {
        get: jest.fn().mockResolvedValue('invalid json'),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        flushall: jest.fn().mockResolvedValue('OK'),
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      Redis.mockReturnValue(mockRedis);
      
      const cache = await getRedisCache();
      if (cache) {
        // Should return null for invalid JSON
        const result = await cache.get('test-key');
        expect(result).toBeNull();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      await cache.set('undefined-key', undefined);
      const result = await cache.get('undefined-key');
      expect(result).toBeUndefined();
    });

    it('should handle null values', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      await cache.set('null-key', null);
      const result = await cache.get('null-key');
      expect(result).toBeNull();
    });

    it('should handle empty strings', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      await cache.set('empty-key', '');
      const result = await cache.get('empty-key');
      expect(result).toBe('');
    });

    it('should handle very large objects', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      const largeObject = {
        data: Array(1000).fill('x'.repeat(100))
      };
      
      await cache.set('large-key', largeObject);
      const result = await cache.get('large-key');
      expect(result).toEqual(largeObject);
    });

    it('should handle concurrent operations', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      const cache = await getMemoryCache();
      
      // Concurrent sets
      await Promise.all([
        cache.set('concurrent-1', 'value1'),
        cache.set('concurrent-2', 'value2'),
        cache.set('concurrent-3', 'value3'),
      ]);
      
      // Concurrent gets
      const [v1, v2, v3] = await Promise.all([
        cache.get('concurrent-1'),
        cache.get('concurrent-2'),
        cache.get('concurrent-3'),
      ]);
      
      expect(v1).toBe('value1');
      expect(v2).toBe('value2');
      expect(v3).toBe('value3');
    });
  });

  describe('Cache Hierarchy', () => {
    it('should work with only memory cache enabled', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'true';
      process.env.CACHE_REDIS_ENABLE = 'false';
      
      const memoryCache = await getMemoryCache();
      const redisCache = await getRedisCache();
      
      expect(memoryCache).toBeDefined();
      expect(redisCache).toBeNull();
      
      // Memory cache should work
      await memoryCache.set('test', 'value');
      expect(await memoryCache.get('test')).toBe('value');
    });

    it('should work with only redis cache enabled', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'false';
      process.env.CACHE_REDIS_ENABLE = 'true';
      
      const memoryCache = await getMemoryCache();
      const redisCache = await getRedisCache();
      
      // Memory cache should be disabled
      await memoryCache.set('test', 'value');
      expect(await memoryCache.get('test')).toBeNull();
      
      // Redis cache should work (if available)
      if (redisCache) {
        expect(typeof redisCache.get).toBe('function');
      }
    });

    it('should work with both caches disabled', async () => {
      process.env.CACHE_MEMORY_ENABLE = 'false';
      process.env.CACHE_REDIS_ENABLE = 'false';
      
      const memoryCache = await getMemoryCache();
      const redisCache = await getRedisCache();
      
      expect(redisCache).toBeNull();
      
      // Memory cache should be disabled
      await memoryCache.set('test', 'value');
      expect(await memoryCache.get('test')).toBeNull();
    });
  });
});