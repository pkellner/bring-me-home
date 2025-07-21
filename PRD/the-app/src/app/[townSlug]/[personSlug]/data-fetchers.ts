import { prisma } from '@/lib/prisma';
import { withCache, CACHE_TTL, CACHE_KEYS, CACHE_CONFIG } from '@/lib/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSystemLayoutTheme } from '@/app/actions/systemConfig';

// Shared interfaces
export interface PersonDataResult {
  person: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  comments: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  session: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  systemDefaults: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  permissions: {
    isSiteAdmin: boolean;
    isTownAdmin: boolean;
    isPersonAdmin: boolean;
    isAdmin: boolean;
  };
}

// Metadata fetching function (always uses cache if enabled)
export async function fetchPersonMetadata(
  townSlug: string,
  personSlug: string,
  useCache: boolean
) {
  const fetcher = async () => {
    return prisma.person.findFirst({
      where: {
        slug: personSlug,
        town: {
          slug: townSlug,
          isActive: true,
        },
        isActive: true,
      },
      select: {
        firstName: true,
        lastName: true,
        story: true,
        town: {
          select: {
            name: true,
          },
        },
      },
    });
  };

  if (useCache) {
    return withCache(
      CACHE_KEYS.personMetadata(townSlug, personSlug),
      fetcher,
      CACHE_TTL.PERSON_METADATA
    );
  }
  
  return fetcher();
}

// Main person data fetching function
export async function fetchPersonData(
  townSlug: string,
  personSlug: string,
  useCache: boolean
) {
  const fetcher = async () => {
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
        // Include all necessary fields
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
        
        // Relations
        town: {
          select: {
            id: true,
            name: true,
            slug: true,
            layout: {
              select: {
                id: true,
                name: true,
                template: true,
              },
            },
            theme: {
              select: {
                id: true,
                name: true,
                cssVars: true,
              },
            },
          },
        },
        layout: {
          select: {
            id: true,
            name: true,
            template: true,
          },
        },
        theme: {
          select: {
            id: true,
            name: true,
            cssVars: true,
          },
        },
        detentionCenter: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            detentionCenterImage: {
              select: {
                image: {
                  select: {
                    id: true,
                    caption: true,
                    mimeType: true,
                  },
                },
              },
            },
          },
        },
        personImages: {
          select: {
            imageType: true,
            sequenceNumber: true,
            image: {
              select: {
                id: true,
                caption: true,
                mimeType: true,
                size: true,
                width: true,
                height: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
          orderBy: [{ imageType: 'asc' }, { sequenceNumber: 'asc' }],
        },
        stories: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            language: true,
            storyType: true,
            content: true,
            isActive: true,
            personId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [
            { language: 'asc' },
            { storyType: 'asc' },
          ],
        },
      },
    });

    if (person && person.bondAmount) {
      return {
        ...person,
        bondAmount: person.bondAmount.toString(),
      };
    }

    return person;
  };

  if (useCache) {
    return withCache(
      CACHE_KEYS.personDetail(townSlug, personSlug),
      fetcher,
      CACHE_TTL.PERSON_DETAIL
    );
  }

  return fetcher();
}

// Comments fetching function
export async function fetchPersonComments(
  personId: string,
  useCache: boolean
) {
  const fetcher = async () => {
    if (useCache) {
      // Optimized query for cached version - only approved comments
      return prisma.comment.findMany({
        where: {
          personId,
          isActive: true,
          isApproved: true,
        },
        select: {
          id: true,
          content: true,
          firstName: true,
          lastName: true,
          occupation: true,
          birthdate: true,
          city: true,
          state: true,
          showOccupation: true,
          showBirthdate: true,
          showComment: true,
          showCityState: true,
          displayNameOnly: true,
          privacyRequiredDoNotShowPublicly: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: CACHE_CONFIG.COMMENTS_LIMIT,
      });
    } else {
      // Full query for non-cached version
      return prisma.comment.findMany({
        where: {
          personId,
          isActive: true,
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
      });
    }
  };

  if (useCache) {
    return withCache(
      CACHE_KEYS.personComments(personId),
      fetcher,
      CACHE_TTL.COMMENTS
    );
  }

  return fetcher();
}

// User permissions fetching function
export async function fetchUserPermissions(
  userId: string,
  personId: string,
  townId: string,
  useCache: boolean
) {
  const fetcher = async () => {
    const userWithAccess = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        townAccess: {
          where: {
            townId,
            accessLevel: 'admin',
          },
          select: {
            id: true,
          },
        },
        personAccess: {
          where: {
            personId,
            accessLevel: 'admin',
          },
          select: {
            id: true,
          },
        },
      },
    });

    const isSiteAdmin = userWithAccess?.userRoles.some(ur => ur.role.name === 'site-admin') || false;
    const isTownAdmin = (userWithAccess?.townAccess?.length ?? 0) > 0;
    const isPersonAdmin = (userWithAccess?.personAccess?.length ?? 0) > 0;

    return {
      isSiteAdmin,
      isTownAdmin,
      isPersonAdmin,
      isAdmin: isSiteAdmin || isTownAdmin || isPersonAdmin,
    };
  };

  if (useCache) {
    return withCache(
      CACHE_KEYS.userPermissions(userId, personId),
      fetcher,
      CACHE_TTL.USER_PERMISSIONS
    );
  }

  return fetcher();
}

// System defaults fetching function
export async function fetchSystemDefaults(useCache: boolean) {
  if (useCache) {
    return withCache(
      CACHE_KEYS.systemConfig(),
      getSystemLayoutTheme,
      CACHE_TTL.SYSTEM_CONFIG
    );
  }
  
  return getSystemLayoutTheme();
}

// Main data loading function that orchestrates all fetches
export async function loadPersonPageData(
  townSlug: string,
  personSlug: string,
  useCache: boolean
): Promise<PersonDataResult | null> {
  // Fetch data in parallel where possible
  const [person, session, systemDefaults] = await Promise.all([
    fetchPersonData(townSlug, personSlug, useCache),
    getServerSession(authOptions),
    fetchSystemDefaults(useCache),
  ]);

  if (!person) {
    return null;
  }

  // Load comments separately (after we have person ID)
  const comments = await fetchPersonComments(person.id, useCache);

  // Check permissions only if user is logged in
  let permissions = {
    isSiteAdmin: false,
    isTownAdmin: false,
    isPersonAdmin: false,
    isAdmin: false,
  };

  if (session?.user?.id) {
    // Also check session roles for site admin
    const sessionIsSiteAdmin = session.user.roles?.some(role => role.name === 'site-admin') || false;
    
    const userPermissions = await fetchUserPermissions(
      session.user.id,
      person.id,
      person.townId,
      useCache
    );
    
    permissions = {
      ...userPermissions,
      isSiteAdmin: userPermissions.isSiteAdmin || sessionIsSiteAdmin,
      isAdmin: userPermissions.isAdmin || sessionIsSiteAdmin,
    };
  }

  return {
    person,
    comments,
    session,
    systemDefaults,
    permissions,
  };
}