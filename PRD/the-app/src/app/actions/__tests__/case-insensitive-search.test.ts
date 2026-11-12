/**
 * Issue #1 step 2a: Postgres compares text by bytes, so the admin searches ask for a
 * case-insensitive match (`mode: 'insensitive'`, ILIKE). The real matching ("texas" finds "Texas")
 * runs against the local Postgres in case-insensitive-search.db.test.ts.
 */
import { searchDetentionCenters } from '../detention-centers';
import { getSuppressionList } from '@/lib/email-suppression';
import { prisma } from '@/lib/prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn(async () => ({ user: { id: 'admin' } })) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({ hasPermission: jest.fn(() => true) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/image-utils', () => ({ validateImageBuffer: jest.fn() }));
jest.mock('@/lib/image-storage', () => ({ processAndStoreImage: jest.fn() }));
jest.mock('@/lib/cache/person-cache', () => ({ invalidatePersonCache: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    detentionCenter: { findMany: jest.fn(async () => []) },
    emailSuppression: { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) },
  },
}));

const insensitive = (value: string) => ({ contains: value, mode: 'insensitive' });

describe('searchDetentionCenters', () => {
  it('matches name, city and state ignoring case', async () => {
    await searchDetentionCenters('texas');
    expect(prisma.detentionCenter.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [{ name: insensitive('texas') }, { city: insensitive('texas') }, { state: insensitive('texas') }],
        isActive: true,
      },
    }));
  });
});

describe('getSuppressionList', () => {
  it('matches email and reason details ignoring case, for the list and the count', async () => {
    await getSuppressionList({ searchTerm: 'Example.COM' });
    const where = { OR: [{ email: insensitive('Example.COM') }, { reasonDetails: insensitive('Example.COM') }] };
    expect(prisma.emailSuppression.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(prisma.emailSuppression.count).toHaveBeenCalledWith({ where });
  });

  it('adds no text filter without a search term', async () => {
    await getSuppressionList({ reason: 'manual' });
    expect(prisma.emailSuppression.count).toHaveBeenCalledWith({ where: { reason: 'manual' } });
  });
});
