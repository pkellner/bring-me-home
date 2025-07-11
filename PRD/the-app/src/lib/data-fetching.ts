/**
 * Extracted data fetching functions that can be easily tested
 */

import { prisma } from '@/lib/prisma';

export async function getActiveTowns() {
  return prisma.town.findMany({
    where: {
      isActive: true,
    },
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
    orderBy: {
      name: 'asc',
    },
  });
}

export async function getRecentPersons(limit = 6) {
  return prisma.person.findMany({
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
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

export async function getTotalDetainedCount() {
  return prisma.person.count({
    where: {
      status: 'missing',
      isActive: true,
    },
  });
}