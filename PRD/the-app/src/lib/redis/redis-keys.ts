/**
 * Centralized Redis key management
 * All Redis keys must be generated through this module to ensure proper folder structure
 */

// Get the Redis folder prefix from environment or use default
const REDIS_FOLDER_PREFIX = process.env.REDIS_FOLDER_PREFIX || 'bring-me-home';

/**
 * Redis key namespaces
 */
export const RedisNamespaces = {
  SESSION: 'session',
  CACHE: 'cache',
  HEALTH: 'health',
  PERSON: 'person',
  COMMENT: 'comment',
  LOGIN: 'login',
} as const;

type RedisNamespace = typeof RedisNamespaces[keyof typeof RedisNamespaces];

/**
 * Generates a properly namespaced Redis key
 * @param namespace - The namespace for the key
 * @param parts - Additional parts of the key
 * @returns The full Redis key with folder structure
 */
export function generateRedisKey(namespace: RedisNamespace, ...parts: string[]): string {
  const cleanParts = parts.filter(part => part && part.length > 0);
  return `${REDIS_FOLDER_PREFIX}:${namespace}:${cleanParts.join(':')}`;
}

/**
 * Redis key generators for specific use cases
 */
export const RedisKeys = {
  // Session keys
  commentDraft: (sessionId: string, personId: string) => 
    generateRedisKey(RedisNamespaces.SESSION, sessionId, 'comment', personId, 'draft'),
  
  loginFlow: (sessionId: string) => 
    generateRedisKey(RedisNamespaces.SESSION, sessionId, 'login_flow'),
  
  // Cache keys
  personCache: (townSlug: string, personSlug: string, version: string = 'v1') => 
    generateRedisKey(RedisNamespaces.CACHE, 'person', townSlug, personSlug, version),
  
  // Health check keys
  healthTest: (timestamp: number, index: number) => 
    generateRedisKey(RedisNamespaces.HEALTH, 'test', timestamp.toString(), index.toString()),
  
  // Pattern matchers for bulk operations
  patterns: {
    allInNamespace: (namespace: RedisNamespace) => `${REDIS_FOLDER_PREFIX}:${namespace}:*`,
    allInFolder: () => `${REDIS_FOLDER_PREFIX}:*`,
    sessionKeys: (sessionId: string) => `${REDIS_FOLDER_PREFIX}:${RedisNamespaces.SESSION}:${sessionId}:*`,
    personCacheKeys: () => `${REDIS_FOLDER_PREFIX}:${RedisNamespaces.CACHE}:person:*`,
  }
};

/**
 * Validates that a key belongs to our Redis folder
 * @param key - The Redis key to validate
 * @returns true if the key is in our folder
 */
export function isValidRedisKey(key: string): boolean {
  return key.startsWith(`${REDIS_FOLDER_PREFIX}:`);
}

/**
 * Extracts namespace from a Redis key
 * @param key - The Redis key
 * @returns The namespace or null if invalid
 */
export function getNamespaceFromKey(key: string): RedisNamespace | null {
  if (!isValidRedisKey(key)) return null;
  
  const parts = key.split(':');
  if (parts.length < 2) return null;
  
  const namespace = parts[1] as RedisNamespace;
  return Object.values(RedisNamespaces).includes(namespace) ? namespace : null;
}