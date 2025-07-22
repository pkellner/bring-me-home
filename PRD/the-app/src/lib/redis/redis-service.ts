import getRedisConnectionLazy from './get-redis-connection-lazy';
import { Redis } from 'ioredis';
import { RedisKeys } from './redis-keys';

// Define interfaces for the data structures
interface CommentDraft {
  content?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  occupation?: string;
  birthdate?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  showOccupation?: boolean;
  showBirthdate?: boolean;
  showCityState?: boolean;
  wantsToHelpMore?: boolean;
  displayNameOnly?: boolean;
  requiresFamilyApproval?: boolean;
}

interface LoginFlowData {
  returnUrl?: string;
  personId?: string;
  action?: string;
  timestamp?: number;
  [key: string]: unknown;
}

// Module-level Redis instance
let redis: Redis | null = null;
let isAvailable: boolean = false;

// Initialize Redis connection
function initializeRedis() {
  if (!redis && process.env.REDIS_HOST && process.env.REDIS_PORT) {
    try {
      redis = getRedisConnectionLazy(
        process.env.REDIS_HOST,
        parseInt(process.env.REDIS_PORT)
      );
      isAvailable = true;
    } catch {
      console.error('Failed to initialize Redis');
      isAvailable = false;
    }
  }
  return { redis, isAvailable };
}

// Initialize on module load
initializeRedis();

export async function isRedisConnected(): Promise<boolean> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) return false;

  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

export async function setCommentDraft(
  sessionId: string,
  personId: string,
  draft: CommentDraft,
  ttlSeconds: number = 3600 // 1 hour default
): Promise<boolean> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) return false;

  try {
    const key = RedisKeys.commentDraft(sessionId, personId);
    await redis.setex(key, ttlSeconds, JSON.stringify(draft));
    return true;
  } catch {
    console.error('Redis setCommentDraft error');
    return false;
  }
}

export async function getCommentDraft(
  sessionId: string,
  personId: string
): Promise<CommentDraft | null> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) return null;

  try {
    const key = RedisKeys.commentDraft(sessionId, personId);
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    console.error('Redis getCommentDraft error');
    return null;
  }
}

export async function deleteCommentDraft(
  sessionId: string,
  personId: string
): Promise<boolean> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) return false;

  try {
    const key = RedisKeys.commentDraft(sessionId, personId);
    await redis.del(key);
    return true;
  } catch {
    console.error('Redis deleteCommentDraft error');
    return false;
  }
}

export async function setLoginFlow(
  sessionId: string,
  flowData: LoginFlowData,
  ttlSeconds: number = 3600
): Promise<boolean> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) return false;

  try {
    const key = RedisKeys.loginFlow(sessionId);
    await redis.setex(key, ttlSeconds, JSON.stringify(flowData));
    return true;
  } catch {
    console.error('Redis setLoginFlow error');
    return false;
  }
}

export async function getLoginFlow(
  sessionId: string
): Promise<LoginFlowData | null> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) return null;

  try {
    const key = RedisKeys.loginFlow(sessionId);
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    console.error('Redis getLoginFlow error');
    return null;
  }
}

export async function deleteLoginFlow(sessionId: string): Promise<boolean> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) return false;

  try {
    const key = RedisKeys.loginFlow(sessionId);
    await redis.del(key);
    return true;
  } catch {
    console.error('Redis deleteLoginFlow error');
    return false;
  }
}

// Health check function
export async function redisHealthCheck(): Promise<{
  connected: boolean;
  writeTime?: number;
  readTime?: number;
  deleteTime?: number;
  totalTime?: number;
  error?: string;
}> {
  const { redis, isAvailable } = initializeRedis();
  if (!redis || !isAvailable) {
    return { connected: false, error: 'Redis not configured' };
  }

  const startTime = Date.now();
  const testKeys: string[] = [];

  try {
    // Test connection
    await redis.ping();

    // Test write operations
    const writeStart = Date.now();
    const timestamp = Date.now();
    for (let i = 0; i < 5; i++) {
      const key = RedisKeys.healthTest(timestamp, i);
      testKeys.push(key);
      await redis.setex(key, 60, `test-value-${i}`);
    }
    const writeTime = Date.now() - writeStart;

    // Test read operations
    const readStart = Date.now();
    for (const key of testKeys) {
      await redis.get(key);
    }
    const readTime = Date.now() - readStart;

    // Test delete operations
    const deleteStart = Date.now();
    for (const key of testKeys) {
      await redis.del(key);
    }
    const deleteTime = Date.now() - deleteStart;

    const totalTime = Date.now() - startTime;

    return {
      connected: true,
      writeTime,
      readTime,
      deleteTime,
      totalTime,
    };
  } catch (error) {
    // Clean up any test keys that were created
    try {
      for (const key of testKeys) {
        await redis.del(key);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup test keys:', cleanupError);
    }

    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Graceful shutdown
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    isAvailable = false;
  }
}
