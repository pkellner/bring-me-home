import { prisma } from '@/lib/prisma';
import { generateImageUrlFromData } from '@/lib/image-url-from-data';
import { cacheStats } from './cache-stats';
import { getMemoryCache, getRedisCache } from './cache-manager';
import { RedisKeys } from '@/lib/redis/redis-keys';
import type { CacheResult, CacheOptions } from '@/types/cache';
import type { Prisma } from '@prisma/client';

const CACHE_VERSION = 'v1';

function generateCacheKey(townSlug: string): string {
  return RedisKeys.townCache(townSlug, CACHE_VERSION);
}

type TownWithRelations = Prisma.TownGetPayload<{
  include: {
    layout: {
      select: {
        id: true;
        name: true;
      };
    };
    theme: {
      select: {
        id: true;
        name: true;
      };
    };
    persons: {
      where: {
        isActive: true;
        status: 'detained';
      };
      select: {
        id: true;
        firstName: true;
        lastName: true;
        slug: true;
        personImages: {
          where: {
            imageType: 'primary';
          };
          include: {
            image: {
              select: {
                id: true;
                updatedAt: true;
                storageType: true;
                s3Key: true;
              };
            };
          };
          take: 1;
        };
        lastSeenDate: true;
        dateOfBirth: true;
        story: true;
        createdAt: true;
        detentionCenterId: true;
        detentionCenter: {
          select: {
            id: true;
            name: true;
            city: true;
            state: true;
          };
        };
        _count: {
          select: {
            comments: {
              where: {
                isActive: true;
              };
            };
          };
        };
      };
      orderBy: {
        createdAt: 'desc';
      };
    };
  };
}>;

async function getTownDataFromDatabase(townSlug: string): Promise<TownWithRelations | null> {
  const town = await prisma.town.findFirst({
    where: {
      slug: townSlug,
      isActive: true,
    },
    include: {
      layout: {
        select: {
          id: true,
          name: true,
        },
      },
      theme: {
        select: {
          id: true,
          name: true,
        },
      },
      persons: {
        where: {
          isActive: true,
          status: 'detained',
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
          dateOfBirth: true,
          story: true,
          createdAt: true,
          detentionCenterId: true,
          detentionCenter: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
          _count: {
            select: {
              comments: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  return town;
}

export interface TownPagePerson {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  lastSeenDate: Date | null;
  dateOfBirth: Date | null;
  story: string | null;
  createdAt: Date;
  detentionCenterId: string | null;
  detentionCenter: {
    id: string;
    name: string;
    city: string;
    state: string;
  } | null;
  _count: {
    comments: number;
  };
  imageUrl: string | null;
}

export interface TownPageData {
  id: string;
  name: string;
  slug: string;
  state: string;
  layout: {
    id: string;
    name: string;
  } | null;
  theme: {
    id: string;
    name: string;
  } | null;
  persons: TownPagePerson[];
}

async function serializeTownData(town: TownWithRelations, townSlug: string): Promise<TownPageData> {
  // Generate image URLs for all persons in parallel
  const personsWithImageUrls = await Promise.all(
    town.persons.map(async (person) => {
      const imageData = person.personImages?.[0]?.image;
      let imageUrl: string | null = null;

      if (imageData) {
        imageUrl = await generateImageUrlFromData(
          {
            id: imageData.id,
            storageType: imageData.storageType,
            s3Key: imageData.s3Key,
          },
          undefined,
          `/${townSlug}`
        );
      }

      return {
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        slug: person.slug,
        lastSeenDate: person.lastSeenDate,
        dateOfBirth: person.dateOfBirth,
        story: person.story,
        createdAt: person.createdAt,
        detentionCenterId: person.detentionCenterId,
        detentionCenter: person.detentionCenter,
        _count: person._count,
        imageUrl,
      };
    })
  );

  return {
    id: town.id,
    name: town.name,
    slug: town.slug,
    state: town.state,
    layout: town.layout,
    theme: town.theme,
    persons: personsWithImageUrls,
  };
}

export async function getCachedTownData(
  townSlug: string,
  options?: CacheOptions
): Promise<CacheResult<TownPageData | null>> {
  const startTime = Date.now();
  const cacheKey = generateCacheKey(townSlug);
  const requestId = `${townSlug}-${startTime}`;

  // Track cache requests (not database queries - use PRISMA_LOG for database query tracking)
  if (process.env.CACHE_REQUEST_TRACKING === 'true') {
    console.log(`\n[CACHE REQUEST - Town] ${requestId}`);
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  Town: ${townSlug}`);
    console.log(`  Force Refresh: ${options?.forceRefresh || false}`);
  }

  // Skip cache if force refresh is requested
  if (options?.forceRefresh) {
    const town = await getTownDataFromDatabase(townSlug);

    if (!town) {
      return {
        data: null,
        source: 'database',
        latency: Date.now() - startTime,
      };
    }

    const serializedTown = await serializeTownData(town, townSlug);
    cacheStats.recordDatabaseQuery(cacheKey);

    // Update caches with fresh data
    const [memoryCache, redisCache] = await Promise.all([
      getMemoryCache(),
      getRedisCache(),
    ]);

    await Promise.all([
      memoryCache.set(cacheKey, serializedTown, options?.ttl),
      redisCache?.set(cacheKey, serializedTown, options?.ttl),
    ]);

    return {
      data: serializedTown,
      source: 'database',
      latency: Date.now() - startTime,
    };
  }

  // Try memory cache first
  try {
    const memoryCache = await getMemoryCache();
    const cachedData = await memoryCache.get<TownPageData>(cacheKey);

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
      const cachedData = await redisCache.get<TownPageData>(cacheKey);

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
  const town = await getTownDataFromDatabase(townSlug);
  cacheStats.recordDatabaseQuery(cacheKey);

  if (!town) {
    return {
      data: null,
      source: 'database',
      latency: Date.now() - startTime,
    };
  }

  const serializedTown = await serializeTownData(town, townSlug);

  // Update both caches
  try {
    const [memoryCache, redisCache] = await Promise.all([
      getMemoryCache(),
      getRedisCache(),
    ]);

    await Promise.all([
      memoryCache.set(cacheKey, serializedTown, options?.ttl),
      redisCache?.set(cacheKey, serializedTown, options?.ttl),
    ]);
  } catch (error) {
    console.error('Cache update error:', error);
  }

  return {
    data: serializedTown,
    source: 'database',
    latency: Date.now() - startTime,
  };
}

export async function invalidateTownCache(townSlug: string): Promise<void> {
  const cacheKey = generateCacheKey(townSlug);

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

export async function invalidateAllTownCaches(): Promise<void> {
  try {
    // Get all active towns
    const towns = await prisma.town.findMany({
      where: { isActive: true },
      select: { slug: true },
    });

    // Invalidate each town's cache
    await Promise.all(
      towns.map(town => invalidateTownCache(town.slug))
    );
  } catch (error) {
    console.error('Failed to invalidate all town caches:', error);
  }
}