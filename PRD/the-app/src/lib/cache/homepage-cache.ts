import { prisma } from '@/lib/prisma';
import { generateImageUrlFromData } from '@/lib/image-url-from-data';
import { cacheStats } from './cache-stats';
import { getMemoryCache, getRedisCache } from './cache-manager';
import { RedisKeys } from '@/lib/redis/redis-keys';
import type { CacheResult, CacheOptions } from '@/types/cache';

const CACHE_VERSION = 'v1';

function generateCacheKey(): string {
  return RedisKeys.homepageCache(CACHE_VERSION);
}

interface HomepageTown {
  id: string;
  name: string;
  slug: string;
  state: string;
  _count: {
    persons: number;
  };
}

interface HomepagePerson {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  lastSeenDate: Date | null;
  town: {
    name: string;
    slug: string;
    state: string;
  };
  imageUrl: string | null;
}

export interface HomepageData {
  towns: HomepageTown[];
  recentPersons: HomepagePerson[];
  totalDetained: number;
}

async function getHomepageDataFromDatabase(): Promise<{
  towns: HomepageTown[];
  recentPersons: Array<{
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    personImages: Array<{
      image: {
        id: string;
        updatedAt: Date;
        storageType: string;
        s3Key: string | null;
      };
    }>;
    lastSeenDate: Date | null;
    town: {
      name: string;
      slug: string;
      state: string;
    };
  }>;
  totalDetained: number;
}> {
  const [towns, recentPersons, totalDetained] = await Promise.all([
    prisma.town.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        state: true,
        _count: {
          select: {
            persons: {
              where: {
                isActive: true,
                status: 'detained',
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.person.findMany({
      where: {
        isActive: true,
        status: 'detained',
        town: {
          isActive: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        slug: true,
        personImages: {
          where: {
            imageType: 'primary',
          },
          include: {
            image: {
              select: {
                id: true,
                updatedAt: true,
                storageType: true,
                s3Key: true,
              },
            },
          },
          take: 1,
        },
        lastSeenDate: true,
        town: {
          select: {
            name: true,
            slug: true,
            state: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    }),
    prisma.person.count({
      where: {
        isActive: true,
        status: 'detained',
        town: {
          isActive: true,
        },
      },
    }),
  ]);

  return { towns, recentPersons, totalDetained };
}

async function serializeHomepageData(data: {
  towns: HomepageTown[];
  recentPersons: Array<{
    id: string;
    firstName: string;
    lastName: string;
    slug: string;
    personImages: Array<{
      image: {
        id: string;
        updatedAt: Date;
        storageType: string;
        s3Key: string | null;
      };
    }>;
    lastSeenDate: Date | null;
    town: {
      name: string;
      slug: string;
      state: string;
    };
  }>;
  totalDetained: number;
}): Promise<HomepageData> {
  // Pre-generate image URLs for recent persons
  const recentPersonsWithUrls = await Promise.all(
    data.recentPersons.map(async (person) => {
      const imageData = person.personImages?.[0]?.image;
      let imageUrl: string | null = null;

      if (imageData) {
        imageUrl = await generateImageUrlFromData(
          {
            id: imageData.id,
            storageType: imageData.storageType,
            s3Key: imageData.s3Key,
          },
          { width: 300, height: 300, quality: 80 },
          '/' // Home page is not an admin route
        );
      }

      return {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        slug: person.slug,
        lastSeenDate: person.lastSeenDate,
        town: person.town,
        imageUrl,
      };
    })
  );

  return {
    towns: data.towns,
    recentPersons: recentPersonsWithUrls,
    totalDetained: data.totalDetained,
  };
}

export async function getCachedHomepageData(
  options?: CacheOptions
): Promise<CacheResult<HomepageData>> {
  const startTime = Date.now();
  const cacheKey = generateCacheKey();

  // Skip cache if force refresh is requested
  if (options?.forceRefresh) {
    const data = await getHomepageDataFromDatabase();
    const serializedData = await serializeHomepageData(data);
    cacheStats.recordDatabaseQuery(cacheKey);

    // Update caches with fresh data
    const [memoryCache, redisCache] = await Promise.all([
      getMemoryCache(),
      getRedisCache(),
    ]);

    await Promise.all([
      memoryCache.set(cacheKey, serializedData, options?.ttl),
      redisCache?.set(cacheKey, serializedData, options?.ttl),
    ]);

    return {
      data: serializedData,
      source: 'database',
      latency: Date.now() - startTime,
    };
  }

  // Try memory cache first
  try {
    const memoryCache = await getMemoryCache();
    const cachedData = await memoryCache.get<HomepageData>(cacheKey);

    if (cachedData) {
      const size = memoryCache.getSize ? memoryCache.getSize(cacheKey) : 0;
      const entryInfo = memoryCache.getEntryInfo ? memoryCache.getEntryInfo(cacheKey) : null;
      const ttlInfo = entryInfo ? {
        ttl: entryInfo.ttl,
        cachedAt: entryInfo.cachedAt,
        expiresAt: entryInfo.expiresAt,
      } : undefined;
      cacheStats.recordMemoryHit(cacheKey, size, ttlInfo);
      return {
        data: cachedData,
        source: 'memory',
        latency: Date.now() - startTime,
      };
    }

    cacheStats.recordMemoryMiss(cacheKey);
  } catch (error) {
    console.error('Memory cache error:', error);
    cacheStats.recordMemoryMiss(cacheKey);
  }

  // Try Redis cache
  try {
    const redisCache = await getRedisCache();
    if (redisCache) {
      const cachedData = await redisCache.get<HomepageData>(cacheKey);

      if (cachedData) {
        const size = redisCache.getSize ? redisCache.getSize(cacheKey) : 0;
        const redisTtl = parseInt(process.env.CACHE_REDIS_TTL || '3600');
        const ttlInfo = {
          ttl: redisTtl,
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + redisTtl * 1000),
        };
        cacheStats.recordRedisHit(cacheKey, size, ttlInfo);

        // Populate memory cache from Redis data
        try {
          const memoryCache = await getMemoryCache();
          await memoryCache.set(cacheKey, cachedData, options?.ttl);
        } catch (error) {
          console.error('Failed to populate memory cache from Redis:', error);
        }

        return {
          data: cachedData,
          source: 'redis',
          latency: Date.now() - startTime,
        };
      }

      cacheStats.recordRedisMiss(cacheKey);
    }
  } catch (error) {
    console.error('Redis cache error:', error);
    cacheStats.recordRedisMiss(cacheKey);
  }

  // Fall back to database
  const data = await getHomepageDataFromDatabase();
  const serializedData = await serializeHomepageData(data);
  cacheStats.recordDatabaseQuery(cacheKey);

  // Update both caches
  try {
    const [memoryCache, redisCache] = await Promise.all([
      getMemoryCache(),
      getRedisCache(),
    ]);

    await Promise.all([
      memoryCache.set(cacheKey, serializedData, options?.ttl),
      redisCache?.set(cacheKey, serializedData, options?.ttl),
    ]);
  } catch (error) {
    console.error('Cache update error:', error);
  }

  return {
    data: serializedData,
    source: 'database',
    latency: Date.now() - startTime,
  };
}

export async function invalidateHomepageCache(): Promise<void> {
  const cacheKey = generateCacheKey();

  try {
    const [memoryCache, redisCache] = await Promise.all([
      getMemoryCache(),
      getRedisCache(),
    ]);

    await Promise.all([
      memoryCache.del(cacheKey),
      redisCache?.del(cacheKey),
    ]);
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}