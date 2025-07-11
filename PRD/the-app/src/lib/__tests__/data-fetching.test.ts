/**
 * Testing extracted data fetching logic
 * This is the RIGHT way to test server component logic!
 */

import { getActiveTowns, getRecentPersons, getTotalDetainedCount } from '../data-fetching';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    town: {
      findMany: jest.fn(),
    },
    person: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  },
}));

describe('Data Fetching Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActiveTowns', () => {
    it('should fetch active towns with correct query', async () => {
      const mockTowns = [
        {
          id: '1',
          name: 'Springfield',
          state: 'IL',
          _count: { persons: 10 },
        },
      ];

      (prisma.town.findMany as jest.Mock).mockResolvedValue(mockTowns);

      const result = await getActiveTowns();

      expect(result).toEqual(mockTowns);
      expect(prisma.town.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          state: true,
          _count: {
            select: {
              persons: {
                where: {
                  isActive: true,
                  status: 'missing',
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getRecentPersons', () => {
    it('should fetch recent detained persons', async () => {
      const mockPersons = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          imageUrl: '/images/john.jpg',
          slug: 'john-doe',
          town: {
            name: 'Springfield',
            slug: 'springfield',
          },
        },
      ];

      (prisma.person.findMany as jest.Mock).mockResolvedValue(mockPersons);

      const result = await getRecentPersons(3);

      expect(result).toEqual(mockPersons);
      expect(prisma.person.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: 'missing',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          town: {
            select: {
              name: true,
              state: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });
    });
  });

  describe('getTotalDetainedCount', () => {
    it('should count total detained persons', async () => {
      (prisma.person.count as jest.Mock).mockResolvedValue(42);

      const result = await getTotalDetainedCount();

      expect(result).toBe(42);
      expect(prisma.person.count).toHaveBeenCalledWith({
        where: {
          status: 'missing',
          isActive: true,
        },
      });
    });
  });
});