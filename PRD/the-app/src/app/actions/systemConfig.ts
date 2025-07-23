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
const layoutThemeRequests = new Map<string, Promise<{ layout: string; theme: string }>>();

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

// Cached version of getSystemLayoutTheme
async function getCachedSystemLayoutTheme(): Promise<{ layout: string; theme: string }> {
  // Skip database queries during build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      layout: process.env.SYSTEM_DEFAULT_LAYOUT || 'grid',
      theme: process.env.SYSTEM_DEFAULT_THEME || 'default',
    };
  }

  const cacheKey = generateRedisKey(RedisNamespaces.CACHE, 'system-layout-theme');
  const TTL_SECONDS = parseInt(process.env.CACHE_SYSTEM_CONFIG_TTL || '120');
  
  // Check if there's already a pending request for this data
  if (layoutThemeRequests.has(cacheKey)) {
    return layoutThemeRequests.get(cacheKey)!;
  }
  
  // Create the promise for this request
  const requestPromise = (async () => {
    try {
      // Try caches
      const memoryCache = await getMemoryCache();
      let cached = await memoryCache.get<{ layout: string; theme: string }>(cacheKey);
      if (cached) return cached;
      
      const redisCache = await getRedisCache();
      if (redisCache) {
        cached = await redisCache.get<{ layout: string; theme: string }>(cacheKey);
        if (cached) {
          await memoryCache.set(cacheKey, cached, TTL_SECONDS * 1000);
          return cached;
        }
      }
      
      // Query database - use findMany to get both configs in one query
      const configs = await prisma.systemConfig.findMany({
        where: {
          key: {
            in: ['SYSTEM_DEFAULT_LAYOUT', 'SYSTEM_DEFAULT_THEME']
          }
        }
      });
      
      const layoutConfig = configs.find(c => c.key === 'SYSTEM_DEFAULT_LAYOUT');
      const themeConfig = configs.find(c => c.key === 'SYSTEM_DEFAULT_THEME');
      
      const result = {
        layout: layoutConfig?.value || process.env.SYSTEM_DEFAULT_LAYOUT || 'grid',
        theme: themeConfig?.value || process.env.SYSTEM_DEFAULT_THEME || 'default',
      };
      
      // Cache result
      await memoryCache.set(cacheKey, result, TTL_SECONDS * 1000);
      if (redisCache) {
        await redisCache.set(cacheKey, result, TTL_SECONDS);
      }
      
      return result;
    } finally {
      // Clean up the pending request
      layoutThemeRequests.delete(cacheKey);
    }
  })();
  
  // Store the pending request
  layoutThemeRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
}

export async function getSystemLayoutTheme() {
  return getCachedSystemLayoutTheme();
}

export async function updateSystemDefaults(layout: string, theme: string) {
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
    // Update or create layout config
    await prisma.systemConfig.upsert({
      where: { key: 'SYSTEM_DEFAULT_LAYOUT' },
      update: { value: layout },
      create: {
        key: 'SYSTEM_DEFAULT_LAYOUT',
        value: layout,
        description: 'System default layout override',
        dataType: 'string',
      },
    });

    // Update or create theme config
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
    
    // Clear individual config caches
    const layoutKey = generateRedisKey(RedisNamespaces.CACHE, 'system-config', 'SYSTEM_DEFAULT_LAYOUT');
    const themeKey = generateRedisKey(RedisNamespaces.CACHE, 'system-config', 'SYSTEM_DEFAULT_THEME');
    const combinedKey = generateRedisKey(RedisNamespaces.CACHE, 'system-layout-theme');
    
    // Use existing del method from cache infrastructure
    await memoryCache.del(layoutKey);
    await memoryCache.del(themeKey);
    await memoryCache.del(combinedKey);
    
    if (redisCache) {
      await redisCache.del(layoutKey);
      await redisCache.del(themeKey);
      await redisCache.del(combinedKey);
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
