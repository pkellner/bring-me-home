'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getMemoryCache, getRedisCache } from '@/lib/cache/cache-manager';
import { generateRedisKey, RedisNamespaces } from '@/lib/redis/redis-keys';

// Request deduplication for preventing concurrent identical queries
// Using separate maps for different return types to maintain type safety
const configRequests = new Map<string, Promise<string | null>>();
const themeRequests = new Map<string, Promise<string>>();

// Cached version of getSystemConfig
async function getCachedSystemConfig(key: string): Promise<string | null> {
  const cacheKey = generateRedisKey(RedisNamespaces.CACHE, 'system-config', key);
  const TTL_SECONDS = parseInt(process.env.CACHE_SYSTEM_CONFIG_TTL || '120');
  
  // Check if there's already a pending request for this data
  if (configRequests.has(cacheKey)) {
    return configRequests.get(cacheKey)!;
  }
  
  // Create the promise for this request
  const requestPromise = (async () => {
    try {
      // Try caches
      const memoryCache = await getMemoryCache();
      let cached = await memoryCache.get<string | null>(cacheKey);
      if (cached !== undefined) return cached;
      
      const redisCache = await getRedisCache();
      if (redisCache) {
        cached = await redisCache.get<string | null>(cacheKey);
        if (cached !== undefined) {
          await memoryCache.set(cacheKey, cached, TTL_SECONDS * 1000);
          return cached;
        }
      }
      
      // Query database
      const config = await prisma.systemConfig.findUnique({
        where: { key },
      });
      const value = config?.value || null;
      
      // Cache result
      await memoryCache.set(cacheKey, value, TTL_SECONDS * 1000);
      if (redisCache) {
        await redisCache.set(cacheKey, value, TTL_SECONDS);
      }
      
      return value;
    } finally {
      // Clean up the pending request
      configRequests.delete(cacheKey);
    }
  })();
  
  // Store the pending request
  configRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
}

export async function getSystemConfig(key: string) {
  return getCachedSystemConfig(key);
}

// Cached version of getSystemTheme
async function getCachedSystemTheme(): Promise<string> {
  // Skip database queries during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return process.env.SYSTEM_DEFAULT_THEME || 'default';
  }

  const cacheKey = generateRedisKey(RedisNamespaces.CACHE, 'system-theme');
  const TTL_SECONDS = parseInt(process.env.CACHE_SYSTEM_CONFIG_TTL || '120');
  
  // Check if there's already a pending request for this data
  if (themeRequests.has(cacheKey)) {
    return themeRequests.get(cacheKey)!;
  }
  
  // Create the promise for this request
  const requestPromise = (async () => {
    try {
      // Try caches
      const memoryCache = await getMemoryCache();
      let cached = await memoryCache.get<string>(cacheKey);
      if (cached) return cached;
      
      const redisCache = await getRedisCache();
      if (redisCache) {
        cached = await redisCache.get<string>(cacheKey);
        if (cached) {
          await memoryCache.set(cacheKey, cached, TTL_SECONDS * 1000);
          return cached;
        }
      }
      
      // Query database for theme config
      const themeConfig = await prisma.systemConfig.findUnique({
        where: { key: 'SYSTEM_DEFAULT_THEME' }
      });
      
      const result = themeConfig?.value || process.env.SYSTEM_DEFAULT_THEME || 'default';
      
      // Cache result
      await memoryCache.set(cacheKey, result, TTL_SECONDS * 1000);
      if (redisCache) {
        await redisCache.set(cacheKey, result, TTL_SECONDS);
      }
      
      return result;
    } finally {
      // Clean up the pending request
      themeRequests.delete(cacheKey);
    }
  })();
  
  // Store the pending request
  themeRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
}

export async function getSystemTheme() {
  return getCachedSystemTheme();
}

// For backward compatibility - returns object with theme only
export async function getSystemLayoutTheme() {
  const theme = await getCachedSystemTheme();
  return { layout: 'grid', theme }; // Always return 'grid' for layout
}

export async function updateSystemDefaults(layout: string, theme: string) {
  // Note: layout parameter is ignored now, kept for backward compatibility
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if user has system:config permission
  const hasPermission = session.user.roles?.some(role => {
    try {
      const permissions = JSON.parse(role.permissions || '{}');
      return (
        permissions.system?.includes('config') || role.name === 'site-admin'
      );
    } catch {
      return false;
    }
  });

  if (!hasPermission) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Update or create theme config only
    await prisma.systemConfig.upsert({
      where: { key: 'SYSTEM_DEFAULT_THEME' },
      update: { value: theme },
      create: {
        key: 'SYSTEM_DEFAULT_THEME',
        value: theme,
        description: 'System default theme override',
        dataType: 'string',
      },
    });

    // Clear relevant caches using existing infrastructure
    const memoryCache = await getMemoryCache();
    const redisCache = await getRedisCache();
    
    // Clear cache
    const themeKey = generateRedisKey(RedisNamespaces.CACHE, 'system-config', 'SYSTEM_DEFAULT_THEME');
    const cacheKey = generateRedisKey(RedisNamespaces.CACHE, 'system-theme');
    
    // Use existing del method from cache infrastructure
    await memoryCache.del(themeKey);
    await memoryCache.del(cacheKey);
    
    if (redisCache) {
      await redisCache.del(themeKey);
      await redisCache.del(cacheKey);
    }

    // Revalidate all pages to reflect the changes
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error) {
    console.error('Failed to update system defaults:', error);
    return { success: false, error: 'Failed to update system defaults' };
  }
}

export async function getAllSystemConfigs() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return [];
  }

  // Check if user has system:config permission
  const hasPermission = session.user.roles?.some(role => {
    try {
      const permissions = JSON.parse(role.permissions || '{}');
      return (
        permissions.system?.includes('config') || role.name === 'site-admin'
      );
    } catch {
      return false;
    }
  });

  if (!hasPermission) {
    return [];
  }

  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  });

  return configs;
}
