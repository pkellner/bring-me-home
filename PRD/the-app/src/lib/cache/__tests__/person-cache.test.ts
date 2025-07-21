import { jest } from '@jest/globals';
import { getCachedPersonData, invalidatePersonCache } from '../person-cache';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { getSystemLayoutTheme } from '@/app/actions/systemConfig';
import { generateImageUrlServerWithCdn } from '@/lib/image-url-server';
import { GeolocationService } from '@/lib/geolocation';
import * as cacheManager from '../cache-manager';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    person: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/app/actions/systemConfig', () => ({
  getSystemLayoutTheme: jest.fn(),
}));

jest.mock('@/lib/image-url-server', () => ({
  generateImageUrlServerWithCdn: jest.fn(),
}));

jest.mock('@/lib/geolocation', () => ({
  GeolocationService: {
    getProcessedLocations: jest.fn(),
    hasAnyIpAddresses: jest.fn(),
  },
}));

// Mock cache manager
const mockMemoryCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

const mockRedisCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

jest.spyOn(cacheManager, 'getMemoryCache').mockResolvedValue(mockMemoryCache);
jest.spyOn(cacheManager, 'getRedisCache').mockResolvedValue(mockRedisCache);

describe('PersonCache', () => {
  const mockPerson = {
    id: 'person-1',
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    slug: 'john-doe',
    townId: 'town-1',
    town: {
      id: 'town-1',
      name: 'Test Town',
      slug: 'test-town',
      layout: null,
      theme: null,
    },
    layout: null,
    theme: null,
    detentionCenter: null,
    personImages: [],
    comments: [],
    stories: [],
    alienIdNumber: null,
    ssn: null,
    dateOfBirth: null,
    placeOfBirth: null,
    height: null,
    weight: null,
    eyeColor: null,
    hairColor: null,
    lastKnownAddress: '123 Main St',
    currentAddress: null,
    phoneNumber: null,
    emailAddress: null,
    story: null,
    detentionStory: null,
    familyMessage: null,
    lastSeenDate: null,
    lastSeenLocation: null,
    isActive: true,
    isFound: false,
    status: 'missing',
    detentionCenterId: null,
    detentionDate: null,
    lastHeardFromDate: null,
    notesFromLastContact: null,
    releaseDate: null,
    detentionStatus: null,
    caseNumber: null,
    bondAmount: null,
    bondStatus: null,
    representedByLawyer: false,
    representedByNotes: null,
    legalRepName: null,
    legalRepPhone: null,
    legalRepEmail: null,
    legalRepFirm: null,
    nextCourtDate: null,
    courtLocation: null,
    internationalAddress: null,
    countryOfOrigin: null,
    layoutId: null,
    themeId: null,
    showDetentionInfo: true,
    showLastHeardFrom: true,
    showDetentionDate: true,
    showCommunitySupport: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockSystemDefaults = {
    layout: { id: 'default-layout' },
    theme: { id: 'default-theme' },
  };

  const mockSession = {
    user: {
      id: 'user-1',
      roles: [],
    },
  };

  const mockGeolocationData = {
    hasIpAddresses: true,
    messageLocationCount: 5,
    supportLocationCount: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (prisma.person.findFirst as jest.Mock).mockResolvedValue(mockPerson);
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (getSystemLayoutTheme as jest.Mock).mockResolvedValue(mockSystemDefaults);
    (generateImageUrlServerWithCdn as jest.Mock).mockResolvedValue('https://cdn.example.com/image.jpg');
    (GeolocationService.getProcessedLocations as jest.Mock).mockResolvedValue({
      messages: Array(5).fill({}),
      support: Array(10).fill({}),
    });
    (GeolocationService.hasAnyIpAddresses as jest.Mock).mockResolvedValue(true);
  });

  describe('getCachedPersonData', () => {
    it('should return data from memory cache when available', async () => {
      const cachedData = {
        person: mockPerson,
        systemDefaults: mockSystemDefaults,
        permissions: { isAdmin: false, isSiteAdmin: false, isTownAdmin: false, isPersonAdmin: false },
        supportMapMetadata: mockGeolocationData,
      };
      
      mockMemoryCache.get.mockResolvedValue(cachedData);
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result).toEqual({
        data: cachedData,
        source: 'memory',
        latency: expect.any(Number),
      });
      
      expect(mockMemoryCache.get).toHaveBeenCalledWith('person:test-town:john-doe:v1');
      expect(mockRedisCache.get).not.toHaveBeenCalled();
      expect(prisma.person.findFirst).not.toHaveBeenCalled();
    });

    it('should return data from Redis when memory cache misses', async () => {
      const cachedData = {
        person: mockPerson,
        systemDefaults: mockSystemDefaults,
        permissions: { isAdmin: false, isSiteAdmin: false, isTownAdmin: false, isPersonAdmin: false },
        supportMapMetadata: mockGeolocationData,
      };
      
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(cachedData);
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result).toEqual({
        data: cachedData,
        source: 'redis',
        latency: expect.any(Number),
      });
      
      expect(mockMemoryCache.get).toHaveBeenCalled();
      expect(mockRedisCache.get).toHaveBeenCalled();
      expect(mockMemoryCache.set).toHaveBeenCalledWith('person:test-town:john-doe:v1', cachedData, undefined);
      expect(prisma.person.findFirst).not.toHaveBeenCalled();
    });

    it('should fetch from database when both caches miss', async () => {
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(null);
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result.source).toBe('database');
      expect(result.data).toBeTruthy();
      
      expect(mockMemoryCache.get).toHaveBeenCalled();
      expect(mockRedisCache.get).toHaveBeenCalled();
      expect(prisma.person.findFirst).toHaveBeenCalled();
      
      // Should populate both caches
      expect(mockMemoryCache.set).toHaveBeenCalled();
      expect(mockRedisCache.set).toHaveBeenCalled();
    });

    it('should return null when person not found', async () => {
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(null);
      (prisma.person.findFirst as jest.Mock).mockResolvedValue(null);
      
      const result = await getCachedPersonData('test-town', 'non-existent');
      
      expect(result).toEqual({
        data: null,
        source: 'database',
        latency: expect.any(Number),
      });
    });

    it('should force refresh when requested', async () => {
      const cachedData = { person: mockPerson };
      mockMemoryCache.get.mockResolvedValue(cachedData);
      
      const result = await getCachedPersonData('test-town', 'john-doe', { forceRefresh: true });
      
      expect(result.source).toBe('database');
      expect(mockMemoryCache.get).not.toHaveBeenCalled();
      expect(mockRedisCache.get).not.toHaveBeenCalled();
      expect(prisma.person.findFirst).toHaveBeenCalled();
    });

    it('should handle custom TTL', async () => {
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(null);
      
      await getCachedPersonData('test-town', 'john-doe', { ttl: 600 });
      
      expect(mockMemoryCache.set).toHaveBeenCalledWith(
        'person:test-town:john-doe:v1',
        expect.any(Object),
        600
      );
      expect(mockRedisCache.set).toHaveBeenCalledWith(
        'person:test-town:john-doe:v1',
        expect.any(Object),
        600
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockMemoryCache.get.mockRejectedValue(new Error('Memory cache error'));
      mockRedisCache.get.mockRejectedValue(new Error('Redis cache error'));
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result.source).toBe('database');
      expect(result.data).toBeTruthy();
    });

    it('should include support map metadata', async () => {
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(null);
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result.data?.supportMapMetadata).toEqual({
        hasIpAddresses: true,
        messageLocationCount: 5,
        supportLocationCount: 10,
      });
    });

    it('should handle person with comments and stories', async () => {
      const personWithContent = {
        ...mockPerson,
        comments: [
          {
            id: 'comment-1',
            content: 'Test comment',
            firstName: 'Jane',
            lastName: 'Smith',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            birthdate: new Date('1990-01-01'),
            approvedAt: new Date('2024-01-16'),
            email: null,
            phone: null,
            occupation: null,
            streetAddress: null,
            city: null,
            state: null,
            zipCode: null,
            showOccupation: true,
            showBirthdate: true,
            showComment: true,
            showCityState: true,
            wantsToHelpMore: false,
            displayNameOnly: false,
            requiresFamilyApproval: true,
            privacyRequiredDoNotShowPublicly: false,
            isApproved: true,
            isActive: true,
            personId: 'person-1',
            type: 'support',
            visibility: 'public',
            familyVisibilityOverride: null,
            moderatorNotes: null,
            approvedBy: 'admin-1',
          },
        ],
        stories: [
          {
            id: 'story-1',
            language: 'en',
            storyType: 'personal',
            content: 'Test story',
            isActive: true,
            personId: 'person-1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      };
      
      (prisma.person.findFirst as jest.Mock).mockResolvedValue(personWithContent);
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(null);
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result.data?.person.comments).toHaveLength(1);
      expect(result.data?.person.stories).toHaveLength(1);
      expect(result.data?.person.comments[0].createdAt).toBe('2024-01-15T00:00:00.000Z');
    });
  });

  describe('invalidatePersonCache', () => {
    it('should delete from both caches', async () => {
      await invalidatePersonCache('test-town', 'john-doe');
      
      expect(mockMemoryCache.del).toHaveBeenCalledWith('person:test-town:john-doe:v1');
      expect(mockRedisCache.del).toHaveBeenCalledWith('person:test-town:john-doe:v1');
    });

    it('should handle cache deletion errors', async () => {
      mockMemoryCache.del.mockRejectedValue(new Error('Delete error'));
      mockRedisCache.del.mockRejectedValue(new Error('Delete error'));
      
      // Should not throw
      await expect(invalidatePersonCache('test-town', 'john-doe')).resolves.toBeUndefined();
    });
  });

  describe('Permissions', () => {
    it('should detect site admin permissions', async () => {
      const adminSession = {
        user: {
          id: 'user-1',
          roles: [{ name: 'site-admin' }],
        },
      };
      
      (getServerSession as jest.Mock).mockResolvedValue(adminSession);
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(null);
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result.data?.permissions).toEqual({
        isAdmin: true,
        isSiteAdmin: true,
        isTownAdmin: false,
        isPersonAdmin: false,
      });
    });

    it('should handle no session', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      mockMemoryCache.get.mockResolvedValue(null);
      mockRedisCache.get.mockResolvedValue(null);
      
      const result = await getCachedPersonData('test-town', 'john-doe');
      
      expect(result.data?.permissions).toEqual({
        isAdmin: false,
        isSiteAdmin: false,
        isTownAdmin: false,
        isPersonAdmin: false,
      });
    });
  });
});