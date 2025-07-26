import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSystemLayoutTheme } from '@/app/actions/systemConfig';
import { generateImageUrlFromData } from '@/lib/image-url-from-data';
import { cacheStats } from './cache-stats';
import { getMemoryCache, getRedisCache } from './cache-manager';
//import { GeolocationService } from '@/lib/geolocation';
import { RedisKeys } from '@/lib/redis/redis-keys';
import type { CacheResult, CacheOptions, PersonPageData } from '@/types/cache';
import type { Prisma } from '@prisma/client';

const CACHE_VERSION = 'v1';

function generateCacheKey(townSlug: string, personSlug: string): string {
  return RedisKeys.personCache(townSlug, personSlug, CACHE_VERSION);
}

type PersonWithRelations = Prisma.PersonGetPayload<{
  include: {
    town: {
      include: {
        layout: true;
        theme: true;
      };
    };
    layout: true;
    theme: true;
    detentionCenter: {
      include: {
        detentionCenterImage: {
          include: {
            image: {
              select: {
                id: true;
                mimeType: true;
                size: true;
                width: true;
                height: true;
                caption: true;
                storageType: true;
                s3Key: true;
                createdAt: true;
                updatedAt: true;
              };
            };
          };
        };
      };
    };
    personImages: {
      include: {
        image: {
          select: {
            id: true;
            mimeType: true;
            size: true;
            width: true;
            height: true;
            caption: true;
            storageType: true;
            s3Key: true;
            createdAt: true;
            updatedAt: true;
          };
        };
      };
    };
    comments: {
      where: {
        isActive: true;
        hideRequested: false;
      };
      select: {
        id: true;
        content: true;
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        occupation: true;
        birthdate: true;
        streetAddress: true;
        city: true;
        state: true;
        zipCode: true;
        showOccupation: true;
        showBirthdate: true;
        showComment: true;
        showCityState: true;
        wantsToHelpMore: true;
        displayNameOnly: true;
        requiresFamilyApproval: true;
        privacyRequiredDoNotShowPublicly: true;
        isApproved: true;
        isActive: true;
        hideRequested: true;
        personId: true;
        type: true;
        visibility: true;
        familyVisibilityOverride: true;
        moderatorNotes: true;
        createdAt: true;
        updatedAt: true;
        approvedAt: true;
        approvedBy: true;
      };
    };
    stories: {
      where: {
        isActive: true;
      };
    };
    personHistory: {
      where: {
        visible: true;
      };
      select: {
        id: true;
        description: true;
        date: true;
        visible: true;
        sendNotifications: true;
        createdByUsername: true;
        createdAt: true;
        updatedAt: true;
      };
    };
  };
}>;

async function getPersonDataFromDatabase(townSlug: string, personSlug: string): Promise<PersonWithRelations | null> {
  const person = await prisma.person.findFirst({
    where: {
      slug: personSlug,
      town: {
        slug: townSlug,
        isActive: true,
      },
      isActive: true,
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      alienIdNumber: true,
      ssn: true,
      dateOfBirth: true,
      placeOfBirth: true,
      height: true,
      weight: true,
      eyeColor: true,
      hairColor: true,
      lastKnownAddress: true,
      currentAddress: true,
      phoneNumber: true,
      emailAddress: true,
      story: true,
      detentionStory: true,
      familyMessage: true,
      lastSeenDate: true,
      lastSeenLocation: true,
      isActive: true,
      isFound: true,
      status: true,
      detentionCenterId: true,
      detentionDate: true,
      lastHeardFromDate: true,
      notesFromLastContact: true,
      releaseDate: true,
      detentionStatus: true,
      caseNumber: true,
      bondAmount: true,
      bondStatus: true,
      representedByLawyer: true,
      representedByNotes: true,
      legalRepName: true,
      legalRepPhone: true,
      legalRepEmail: true,
      legalRepFirm: true,
      nextCourtDate: true,
      courtLocation: true,
      internationalAddress: true,
      countryOfOrigin: true,
      layoutId: true,
      themeId: true,
      townId: true,
      slug: true,
      showDetentionInfo: true,
      showLastHeardFrom: true,
      showDetentionDate: true,
      showCommunitySupport: true,
      createdAt: true,
      updatedAt: true,
      town: {
        include: {
          layout: true,
          theme: true,
        },
      },
      layout: true,
      theme: true,
      detentionCenter: {
        include: {
          detentionCenterImage: {
            include: {
              image: {
                select: {
                  id: true,
                  mimeType: true,
                  size: true,
                  width: true,
                  height: true,
                  caption: true,
                  storageType: true,
                  s3Key: true,
                  createdAt: true,
                  updatedAt: true,
                  // Explicitly exclude 'data' field
                },
              },
            },
          },
        },
      },
      personImages: {
        include: {
          image: {
            select: {
              id: true,
              mimeType: true,
              size: true,
              width: true,
              height: true,
              caption: true,
              storageType: true,
              s3Key: true,
              createdAt: true,
              updatedAt: true,
              // Explicitly exclude 'data' field
            },
          },
        },
        orderBy: [{ imageType: 'asc' }, { sequenceNumber: 'asc' }],
      },
      comments: {
        where: {
          isActive: true,
          hideRequested: false,
        },
        select: {
          id: true,
          content: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          occupation: true,
          birthdate: true,
          streetAddress: true,
          city: true,
          state: true,
          zipCode: true,
          showOccupation: true,
          showBirthdate: true,
          showComment: true,
          showCityState: true,
          wantsToHelpMore: true,
          displayNameOnly: true,
          requiresFamilyApproval: true,
          privacyRequiredDoNotShowPublicly: true,
          isApproved: true,
          isActive: true,
          hideRequested: true,
          personId: true,
          type: true,
          visibility: true,
          familyVisibilityOverride: true,
          moderatorNotes: true,
          createdAt: true,
          updatedAt: true,
          approvedAt: true,
          approvedBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      stories: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            language: 'asc',
          },
          {
            storyType: 'asc',
          },
        ],
      },
      personHistory: {
        where: {
          visible: true,
        },
        orderBy: {
          date: 'desc',
        },
        select: {
          id: true,
          description: true,
          date: true,
          visible: true,
          sendNotifications: true,
          createdByUsername: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return person;
}

interface SerializedPersonData {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  alienIdNumber: string | null;
  ssn: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  height: string | null;
  weight: string | null;
  eyeColor: string | null;
  hairColor: string | null;
  lastKnownAddress: string;
  currentAddress: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  story: string | null;
  detentionStory: string | null;
  familyMessage: string | null;
  lastSeenDate: string | null;
  lastSeenLocation: string | null;
  isActive: boolean;
  isFound: boolean;
  status: string;
  detentionCenterId: string | null;
  detentionDate: string | null;
  lastHeardFromDate: string | null;
  notesFromLastContact: string | null;
  releaseDate: string | null;
  detentionStatus: string | null;
  caseNumber: string | null;
  bondAmount: string | null;
  bondStatus: string | null;
  representedByLawyer: boolean;
  representedByNotes: string | null;
  legalRepName: string | null;
  legalRepPhone: string | null;
  legalRepEmail: string | null;
  legalRepFirm: string | null;
  nextCourtDate: string | null;
  courtLocation: string | null;
  internationalAddress: string | null;
  countryOfOrigin: string | null;
  layoutId: string | null;
  themeId: string | null;
  townId: string;
  slug: string;
  showDetentionInfo: boolean;
  showLastHeardFrom: boolean;
  showDetentionDate: boolean;
  showCommunitySupport: boolean;
  createdAt: string;
  updatedAt: string;
  town: Record<string, unknown>;
  layout: Record<string, unknown> | null;
  theme: Record<string, unknown> | null;
  detentionCenter: Record<string, unknown> | null;
  stories: Array<{
    id: string;
    language: string;
    storyType: string;
    content: string;
    isActive: boolean;
    personId: string;
    createdAt: string;
    updatedAt: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    occupation: string | null;
    birthdate: string | null;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    showOccupation: boolean;
    showBirthdate: boolean;
    showComment: boolean;
    showCityState: boolean;
    wantsToHelpMore: boolean;
    displayNameOnly: boolean;
    requiresFamilyApproval: boolean;
    privacyRequiredDoNotShowPublicly: boolean;
    isApproved: boolean;
    isActive: boolean;
    personId: string;
    type: string;
    visibility: string;
    familyVisibilityOverride: string | null;
    moderatorNotes: string | null;
    createdAt: string;
    updatedAt: string;
    approvedAt: string | null;
    approvedBy: string | null;
  }>;
  personHistory: Array<{
    id: string;
    description: string;
    date: string;
    visible: boolean;
    sendNotifications: boolean;
    createdByUsername: string;
    createdAt: string;
    updatedAt: string;
  }>;
  images: Array<{
    id: string;
    imageType: string;
    sequenceNumber: number;
    caption: string | null;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
    createdAt: Date;
    updatedAt: Date;
    imageUrl: string;
  }>;
}

async function serializePersonData(person: PersonWithRelations, townSlug: string, personSlug: string): Promise<SerializedPersonData> {
  const serializedComments = (person.comments || []).map((comment) => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    birthdate: comment.birthdate ? comment.birthdate.toISOString() : null,
    approvedAt: comment.approvedAt ? comment.approvedAt.toISOString() : null,
  }));

  const serializedStories = (person.stories || []).map((story) => ({
    id: story.id,
    language: story.language,
    storyType: story.storyType,
    content: story.content,
    isActive: story.isActive,
    personId: story.personId,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  }));
  
  const serializedHistory = (person.personHistory || []).map((history) => ({
    id: history.id,
    description: history.description,
    date: history.date.toISOString(),
    visible: history.visible,
    sendNotifications: history.sendNotifications,
    createdByUsername: history.createdByUsername,
    createdAt: history.createdAt.toISOString(),
    updatedAt: history.updatedAt.toISOString(),
  }));

  const images = await Promise.all(
    person.personImages?.map(async (pi) => {
      // Use the new function that doesn't query the database
      const imageUrl = await generateImageUrlFromData(
        {
          id: pi.image.id,
          storageType: pi.image.storageType,
          s3Key: pi.image.s3Key,
        },
        undefined,
        `/${townSlug}/${personSlug}`
      );

      return {
        id: pi.image.id,
        imageType: pi.imageType,
        sequenceNumber: pi.sequenceNumber,
        caption: pi.image.caption,
        mimeType: pi.image.mimeType,
        size: pi.image.size,
        width: pi.image.width,
        height: pi.image.height,
        createdAt: pi.image.createdAt,
        updatedAt: pi.image.updatedAt,
        imageUrl,
      };
    }) || []
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { personImages, detentionCenter, ...personWithoutImagesAndDetentionCenter } = person;

  // Serialize detention center if it exists
  let serializedDetentionCenter = null;
  if (detentionCenter) {
    serializedDetentionCenter = {
      ...detentionCenter,
      createdAt: detentionCenter.createdAt.toISOString(),
      updatedAt: detentionCenter.updatedAt.toISOString(),
      // Include the detentionCenterImage if it exists
      detentionCenterImage: detentionCenter.detentionCenterImage ? {
        ...detentionCenter.detentionCenterImage,
        createdAt: detentionCenter.detentionCenterImage.createdAt.toISOString(),
        updatedAt: detentionCenter.detentionCenterImage.updatedAt.toISOString(),
        // Include the image data if it exists
        image: detentionCenter.detentionCenterImage.image ? {
          ...detentionCenter.detentionCenterImage.image,
          createdAt: detentionCenter.detentionCenterImage.image.createdAt.toISOString(),
          updatedAt: detentionCenter.detentionCenterImage.image.updatedAt.toISOString(),
        } : undefined,
      } : null,
    };
  }

  return {
    ...personWithoutImagesAndDetentionCenter,
    bondAmount: person.bondAmount ? (typeof person.bondAmount === 'string' ? person.bondAmount : person.bondAmount.toString()) : null,
    stories: serializedStories,
    comments: serializedComments,
    personHistory: serializedHistory,
    images,
    detentionCenter: serializedDetentionCenter,
    detentionDate: person.detentionDate ? person.detentionDate.toISOString() : null,
    lastSeenDate: person.lastSeenDate ? person.lastSeenDate.toISOString() : null,
    lastHeardFromDate: person.lastHeardFromDate ? person.lastHeardFromDate.toISOString() : null,
    dateOfBirth: person.dateOfBirth ? person.dateOfBirth.toISOString() : null,
    releaseDate: person.releaseDate ? person.releaseDate.toISOString() : null,
    nextCourtDate: person.nextCourtDate ? person.nextCourtDate.toISOString() : null,
    createdAt: person.createdAt.toISOString(),
    updatedAt: person.updatedAt.toISOString(),
  } as SerializedPersonData;
}

interface UserPermissions {
  isAdmin: boolean;
  isSiteAdmin: boolean;
  isTownAdmin: boolean;
  isPersonAdmin: boolean;
}

async function getUserPermissions(personId: string, townId: string): Promise<UserPermissions> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      isAdmin: false,
      isSiteAdmin: false,
      isTownAdmin: false,
      isPersonAdmin: false,
    };
  }

  const userWithAccess = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
      townAccess: {
        where: {
          townId: townId,
          accessLevel: 'admin',
        },
      },
      personAccess: {
        where: {
          personId: personId,
          accessLevel: 'admin',
        },
      },
    },
  });

  const isSiteAdmin =
    userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') ||
    session.user.roles?.some(role => role.name === 'site-admin') ||
    false;

  // Check for town-admin role OR town access
  const isTownAdmin =
    userWithAccess?.userRoles.some(ur => ur.role.name === 'town-admin') ||
    session.user.roles?.some(role => role.name === 'town-admin') ||
    (userWithAccess?.townAccess?.length ?? 0) > 0;

  // Check for person-admin role OR person access
  const isPersonAdmin = 
    userWithAccess?.userRoles.some(ur => ur.role.name === 'person-admin') ||
    session.user.roles?.some(role => role.name === 'person-admin') ||
    (userWithAccess?.personAccess?.length ?? 0) > 0;

  return {
    isAdmin: isSiteAdmin || isTownAdmin || isPersonAdmin,
    isSiteAdmin,
    isTownAdmin,
    isPersonAdmin,
  };
}

export async function getSupportMapMetadata(personId: string) {
  try {
    // Combine all geolocation queries into a single transaction
    const [comments, support, messagesWithIp, supportWithIp] = await prisma.$transaction([
      // Get processed locations
      prisma.comment.findMany({
        where: {
          personId,
          latitude: { not: null },
          longitude: { not: null },
          isApproved: true
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          geoCity: true,
          country: true,
          createdAt: true
        }
      }),
      prisma.anonymousSupport.findMany({
        where: {
          personId,
          latitude: { not: null },
          longitude: { not: null }
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          geoCity: true,
          country: true,
          createdAt: true
        }
      }),
      // Check for IP addresses
      prisma.comment.count({
        where: {
          personId,
          ipAddress: {
            not: null,
            notIn: ['unknown']
          }
        }
      }),
      prisma.anonymousSupport.count({
        where: {
          personId,
          ipAddress: {
            not: null,
            notIn: ['unknown']
          }
        }
      })
    ]);

    const hasIpAddresses = (messagesWithIp + supportWithIp) > 0;

    return {
      hasIpAddresses,
      messageLocationCount: comments.length,
      supportLocationCount: support.length,
    };
  } catch (error) {
    console.error('Error fetching support map metadata:', error);
    return {
      hasIpAddresses: false,
      messageLocationCount: 0,
      supportLocationCount: 0,
    };
  }
}

export async function getCachedPersonData(
  townSlug: string,
  personSlug: string,
  options?: CacheOptions
): Promise<CacheResult<PersonPageData | null>> {
  const startTime = Date.now();
  const cacheKey = generateCacheKey(townSlug, personSlug);
  const requestId = `${townSlug}/${personSlug}-${startTime}`;

  // Track cache requests (not database queries - use PRISMA_LOG for database query tracking)
  if (process.env.CACHE_REQUEST_TRACKING === 'true') {
    console.log(`\n[CACHE REQUEST - Person] ${requestId}`);
    console.log(`  Time: ${new Date().toISOString()}`);
    console.log(`  Town: ${townSlug}, Person: ${personSlug}`);
    console.log(`  Force Refresh: ${options?.forceRefresh || false}`);
  }

  // Skip cache if force refresh is requested
  if (options?.forceRefresh) {
    const person = await getPersonDataFromDatabase(townSlug, personSlug);

    if (!person) {
      return {
        data: null,
        source: 'database',
        latency: Date.now() - startTime,
      };
    }

    if (process.env.CACHE_REQUEST_TRACKING === 'true') {
      console.log(`[CACHE REQUEST - Person] Starting parallel operations for ${requestId}`);
    }

    const [systemDefaults, permissions, serializedPerson, supportMapMetadata] = await Promise.all([
      getSystemLayoutTheme(),
      getUserPermissions(person.id, person.townId),
      serializePersonData(person, townSlug, personSlug),
      getSupportMapMetadata(person.id),
    ]);

    if (process.env.CACHE_REQUEST_TRACKING === 'true') {
      console.log(`[CACHE REQUEST - Person] Completed parallel operations for ${requestId}`);
    }

    const data: PersonPageData = {
      person: serializedPerson as unknown as PersonPageData['person'],
      systemDefaults,
      permissions,
      supportMapMetadata,
    };

    cacheStats.recordDatabaseQuery(cacheKey);

    // Update caches with fresh data
    const [memoryCache, redisCache] = await Promise.all([
      getMemoryCache(),
      getRedisCache(),
    ]);

    await Promise.all([
      memoryCache.set(cacheKey, data, options?.ttl),
      redisCache?.set(cacheKey, data, options?.ttl),
    ]);

    return {
      data,
      source: 'database',
      latency: Date.now() - startTime,
    };
  }

  // Try memory cache first
  try {
    const memoryCache = await getMemoryCache();
    const cachedData = await memoryCache.get<PersonPageData>(cacheKey);

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
      const cachedData = await redisCache.get<PersonPageData>(cacheKey);

      if (cachedData) {
        const size = redisCache.getSize ? redisCache.getSize(cacheKey) : 0;
        // Redis doesn't have getEntryInfo, but we can estimate based on TTL
        const redisTtl = parseInt(process.env.CACHE_REDIS_TTL || '3600');
        const ttlInfo = {
          ttl: redisTtl,
          cachedAt: new Date(), // We don't know the exact time
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
  const person = await getPersonDataFromDatabase(townSlug, personSlug);
  cacheStats.recordDatabaseQuery(cacheKey);

  if (!person) {
    return {
      data: null,
      source: 'database',
      latency: Date.now() - startTime,
    };
  }

  if (process.env.CACHE_REQUEST_TRACKING === 'true') {
    console.log(`[CACHE REQUEST - Person] Starting parallel operations for ${requestId} (from DB)`);
  }

  const [systemDefaults, permissions, serializedPerson, supportMapMetadata] = await Promise.all([
    getSystemLayoutTheme(),
    getUserPermissions(person.id, person.townId),
    serializePersonData(person, townSlug, personSlug),
    getSupportMapMetadata(person.id),
  ]);

  if (process.env.CACHE_REQUEST_TRACKING === 'true') {
    console.log(`[CACHE REQUEST - Person] Completed parallel operations for ${requestId} (from DB)`);
  }

  const data: PersonPageData = {
    person: serializedPerson as unknown as PersonPageData['person'],
    systemDefaults,
    permissions,
    supportMapMetadata,
  };

  // Update both caches
  try {
    const [memoryCache, redisCache] = await Promise.all([
      getMemoryCache(),
      getRedisCache(),
    ]);

    await Promise.all([
      memoryCache.set(cacheKey, data, options?.ttl),
      redisCache?.set(cacheKey, data, options?.ttl),
    ]);
  } catch (error) {
    console.error('Cache update error:', error);
  }

  return {
    data,
    source: 'database',
    latency: Date.now() - startTime,
  };
}

export async function invalidatePersonCache(townSlug: string, personSlug: string): Promise<void> {
  const cacheKey = generateCacheKey(townSlug, personSlug);

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