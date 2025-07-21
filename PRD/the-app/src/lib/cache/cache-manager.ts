import { Redis } from 'ioredis';
import getRedisConnectionLazy from '@/lib/redis/get-redis-connection-lazy';

// Cache entry type with size tracking
interface CacheEntry {
  value: string;
  expires: number;
  size: number; // Size in bytes
}

// Memory size tracking
interface MemoryStats {
  currentSize: number;
  maxSize: number;
  entries: number;
}

// Create in-memory cache with size limit
function createMemoryCache(ttl: number, maxSizeBytes: number) {
  const cache = new Map<string, CacheEntry>();
  let currentSize = 0;

  const getMemoryStats = (): MemoryStats => ({
    currentSize,
    maxSize: maxSizeBytes,
    entries: cache.size,
  });

  const calculateSize = (value: string): number => {
    // Rough estimate: 2 bytes per character for UTF-16 + overhead
    return value.length * 2 + 100; // 100 bytes overhead estimate
  };

  const evictOldest = (requiredSize: number) => {
    // Sort entries by expiration time (oldest first)
    const entries = Array.from(cache.entries()).sort(
      (a, b) => a[1].expires - b[1].expires
    );

    for (const [key, entry] of entries) {
      if (currentSize + requiredSize <= maxSizeBytes) break;
      cache.delete(key);
      currentSize -= entry.size;
    }
  };

  const get = async <T>(key: string): Promise<T | undefined> => {
    const item = cache.get(key);
    
    if (!item) return undefined;
    
    if (Date.now() > item.expires) {
      cache.delete(key);
      currentSize -= item.size;
      return undefined;
    }
    
    return JSON.parse(item.value);
  };

  const set = async <T>(key: string, value: T, customTtl?: number): Promise<void> => {
    const finalTtl = customTtl || ttl;
    const expires = Date.now() + finalTtl;
    const valueStr = JSON.stringify(value);
    const size = calculateSize(valueStr);
    
    // Remove existing entry if it exists
    const existing = cache.get(key);
    if (existing) {
      currentSize -= existing.size;
    }
    
    // Check if we need to evict entries
    if (currentSize + size > maxSizeBytes) {
      evictOldest(size);
    }
    
    // Only add if we have space (or if cache is unlimited)
    if (maxSizeBytes === 0 || currentSize + size <= maxSizeBytes) {
      cache.set(key, {
        value: valueStr,
        expires,
        size,
      });
      currentSize += size;
    }
  };

  const del = async (key: string): Promise<void> => {
    const item = cache.get(key);
    if (item) {
      cache.delete(key);
      currentSize -= item.size;
    }
  };

  const reset = async (): Promise<void> => {
    cache.clear();
    currentSize = 0;
  };

  // Cleanup expired entries periodically
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expires) {
        cache.delete(key);
        currentSize -= entry.size;
      }
    }
  };

  // Run cleanup every minute
  const cleanupInterval = setInterval(cleanup, 60000);

  // Return cache interface with cleanup method
  return { 
    get, 
    set, 
    del, 
    reset, 
    getMemoryStats,
    destroy: () => clearInterval(cleanupInterval)
  };
}

// Create Redis cache wrapper
function createRedisCache(redis: Redis | null, ttl: number) {
  const get = async <T>(key: string): Promise<T | undefined> => {
    if (!redis) return undefined;
    
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : undefined;
    } catch (error) {
      console.error('Redis get error:', error);
      return undefined;
    }
  };

  const set = async <T>(key: string, value: T, customTtl?: number): Promise<void> => {
    if (!redis) return;
    
    try {
      const finalTtl = customTtl || ttl;
      await redis.setex(key, finalTtl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  };

  const del = async (key: string): Promise<void> => {
    if (!redis) return;
    
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  };

  const reset = async (): Promise<void> => {
    if (!redis) return;
    
    try {
      await redis.flushdb();
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  };

  return { get, set, del, reset };
}

// Cache interface
export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
  getMemoryStats?: () => MemoryStats;
  destroy?: () => void;
}

// Disabled cache that does nothing
const disabledCache: Cache = {
  get: async () => undefined,
  set: async () => {},
  del: async () => {},
  reset: async () => {},
};

// Module-level cache instances
let memoryCache: Cache | null = null;
let redisCache: Cache | null = null;

export async function getMemoryCache(): Promise<Cache> {
  // Check if memory cache is enabled
  const isEnabled = process.env.CACHE_MEMORY_ENABLE === 'true';
  
  if (!isEnabled) {
    return disabledCache;
  }

  if (!memoryCache) {
    const ttl = parseInt(process.env.CACHE_MEMORY_TTL || '300') * 1000; // Convert to milliseconds
    const maxSizeMB = parseFloat(process.env.CACHE_MEMORY_MAX_SIZE_MB || '100');
    const maxSizeBytes = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    
    memoryCache = createMemoryCache(ttl, maxSizeBytes);
  }
  
  return memoryCache;
}

export async function getRedisCache(): Promise<Cache | null> {
  // Check if Redis cache is enabled
  const isEnabled = process.env.CACHE_REDIS_ENABLE === 'true';
  
  if (!isEnabled) {
    return null;
  }

  if (!redisCache && process.env.REDIS_HOST && process.env.REDIS_PORT) {
    try {
      const redis = getRedisConnectionLazy(
        process.env.REDIS_HOST,
        parseInt(process.env.REDIS_PORT)
      );
      
      // Test connection
      await redis.ping();
      
      const ttl = parseInt(process.env.CACHE_REDIS_TTL || '3600');
      
      redisCache = createRedisCache(redis, ttl);
    } catch (error) {
      console.error('Failed to initialize Redis cache:', error);
      return null;
    }
  }
  
  return redisCache;
}

// Helper to check if any cache is enabled
export function isCacheEnabled(): boolean {
  return process.env.CACHE_MEMORY_ENABLE === 'true' || 
         process.env.CACHE_REDIS_ENABLE === 'true';
}

// Export for testing
export const _testing = {
  createMemoryCache,
  createRedisCache,
  resetCaches: () => {
    if (memoryCache?.destroy) memoryCache.destroy();
    memoryCache = null;
    redisCache = null;
  }
};