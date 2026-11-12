/**
 * db test (issue #1 step 2a): on Postgres, the admin searches still match across case, as they did
 * on MySQL: "texas" finds "Texas".
 */
import { prisma } from '@/lib/prisma';
import { searchDetentionCenters } from '../detention-centers';
import { getSuppressionList } from '@/lib/email-suppression';
import { emptyAllTables } from '@/test-utils/local-postgres';

jest.mock('next-auth', () => ({ getServerSession: jest.fn(async () => ({ user: { id: 'admin' } })) }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({ hasPermission: jest.fn(() => true) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/image-utils', () => ({ validateImageBuffer: jest.fn() }));
jest.mock('@/lib/image-storage', () => ({ processAndStoreImage: jest.fn() }));
jest.mock('@/lib/cache/person-cache', () => ({ invalidatePersonCache: jest.fn() }));

beforeEach(() => emptyAllTables(prisma));
afterAll(() => prisma.$disconnect());

function center(name: string, city: string, state: string, isActive = true) {
  return prisma.detentionCenter.create({
    data: { name, city, state, isActive, facilityType: 'ICE', address: `1 Main St, ${city}`, zipCode: '00000' },
  });
}

describe('searchDetentionCenters', () => {
  beforeEach(async () => {
    await center('Houston Processing Center', 'Houston', 'Texas');
    await center('Otay Mesa Detention Center', 'San Diego', 'California');
    await center('Closed Texas Facility', 'El Paso', 'Texas', false);
  });

  const names = async (query: string) => (await searchDetentionCenters(query)).map(c => c.name).sort();

  it('"texas" finds the center in Texas', async () => {
    expect(await names('texas')).toEqual(['Houston Processing Center']);
  });

  it('matches the city and the name across case too', async () => {
    expect(await names('SAN DIEGO')).toEqual(['Otay Mesa Detention Center']);
    expect(await names('processing')).toEqual(['Houston Processing Center']);
    expect(await names('DETENTION center')).toEqual(['Otay Mesa Detention Center']);
  });

  it('still leaves out inactive centers and centers that do not match', async () => {
    expect(await names('el paso')).toEqual([]);
    expect(await names('arizona')).toEqual([]);
  });
});

describe('getSuppressionList', () => {
  beforeEach(async () => {
    await prisma.emailSuppression.create({
      data: { email: 'joe@example.com', reason: 'bounce_permanent', source: 'ses_webhook', reasonDetails: '550 5.1.1 User Unknown' },
    });
    await prisma.emailSuppression.create({
      data: { email: 'ana@other.org', reason: 'manual', source: 'admin_action', reasonDetails: null },
    });
  });

  it('matches the email ignoring case, in the list and the total', async () => {
    const result = await getSuppressionList({ searchTerm: 'EXAMPLE.COM' });
    expect(result.suppressions.map(s => s.email)).toEqual(['joe@example.com']);
    expect(result.total).toBe(1);
  });

  it('matches the reason details ignoring case', async () => {
    const result = await getSuppressionList({ searchTerm: 'user unknown' });
    expect(result.suppressions.map(s => s.email)).toEqual(['joe@example.com']);
  });

  it('combines the search with the reason filter', async () => {
    expect((await getSuppressionList({ searchTerm: 'ANA@', reason: 'manual' })).total).toBe(1);
    expect((await getSuppressionList({ searchTerm: 'ANA@', reason: 'bounce_permanent' })).total).toBe(0);
  });
});
