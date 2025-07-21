import getRedisConnectionLazy from './redis/get-redis-connection-lazy';
import { Redis } from 'ioredis';

// Module-level Redis instance
let redis: Redis | null = null;
let isInitialized = false;

// Initialize Redis connection lazily
function getRedis(): Redis | null {
  if (!isInitialized) {
    isInitialized = true;
    if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
      try {
        redis = getRedisConnectionLazy(
          process.env.REDIS_HOST,
          parseInt(process.env.REDIS_PORT)
        );
      } catch (error) {
        console.error('Failed to initialize Redis for caching:', error);
      }
    }
  }
  return redis;
}

// Cache TTL settings from environment variables (in seconds)
export const CACHE_TTL = {
  PERSON_DETAIL: parseInt(process.env.CACHE_TTL_PERSON_DETAIL || '600'),       // Default 10 minutes
  PERSON_METADATA: parseInt(process.env.CACHE_TTL_PERSON_METADATA || '600'),   // Default 10 minutes
  COMMENTS: parseInt(process.env.CACHE_TTL_COMMENTS || '300'),                 // Default 5 minutes
  SUPPORT_STATS: parseInt(process.env.CACHE_TTL_SUPPORT_STATS || '60'),        // Default 1 minute
  SYSTEM_CONFIG: parseInt(process.env.CACHE_TTL_SYSTEM_CONFIG || '86400'),     // Default 24 hours
  USER_PERMISSIONS: parseInt(process.env.CACHE_TTL_USER_PERMISSIONS || '300'), // Default 5 minutes
};

// Cache configuration
export const CACHE_CONFIG = {
  COMMENTS_LIMIT: parseInt(process.env.CACHE_COMMENTS_LIMIT || '999'),         // Default 999 comments
};

// Cache key generators
export const CACHE_KEYS = {
  personDetail: (townSlug: string, personSlug: string) => 
    `person:detail:${townSlug}:${personSlug}`,
  personMetadata: (townSlug: string, personSlug: string) => 
    `person:metadata:${townSlug}:${personSlug}`,
  personComments: (personId: string) => 
    `person:comments:${personId}`,
  supportStats: (personId: string) => 
    `person:support:${personId}`,
  systemConfig: () => 'system:config',
  userPermissions: (userId: string, personId: string) => 
    `user:permissions:${userId}:${personId}`,
};

// Generic cache wrapper
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const redisClient = getRedis();
  
  if (!redisClient) {
    // If Redis is not configured, fall back to direct fetch
    return fetcher();
  }

  try {
    // Try to get from cache
    const cached = await redisClient.get(key);
    if (cached) {
      if (process.env.CACHE_DEBUG === 'true') {
        console.log(`Cache HIT: ${key}`);
      }
      return JSON.parse(cached);
    }

    if (process.env.CACHE_DEBUG === 'true') {
      console.log(`Cache MISS: ${key}`);
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache with TTL
    await redisClient.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Cache error:', error);
    // Fall back to direct fetch on cache error
    return fetcher();
  }
}

// Invalidation helpers
export async function invalidateCache(pattern: string): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      if (process.env.CACHE_DEBUG === 'true') {
        console.log(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
      }
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

// Specific invalidation functions
export const cacheInvalidation = {
  person: async (townSlug: string, personSlug: string, personId: string) => {
    await Promise.all([
      invalidateCache(`person:detail:${townSlug}:${personSlug}`),
      invalidateCache(`person:metadata:${townSlug}:${personSlug}`),
      invalidateCache(`person:comments:${personId}`),
      invalidateCache(`person:support:${personId}`),
    ]);
  },
  
  comments: async (personId: string) => {
    await invalidateCache(`person:comments:${personId}`);
  },
  
  systemConfig: async () => {
    await invalidateCache('system:config');
  },
};

// Warm cache function for preloading
export async function warmCache(): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;
  
  // This would be called after updates to pre-populate cache
  // Implementation would call the actual data fetching functions
}

// Health check
export async function isRedisHealthy(): Promise<boolean> {
  const redisClient = getRedis();
  if (!redisClient) return false;
  
  try {
    await redisClient.ping();
    return true;
  } catch {
    return false;
  }
}