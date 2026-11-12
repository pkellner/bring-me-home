/**
 * PUT /api/profile/email checks uniqueness against, and stores, the normalised email (issue #1
 * step 1). The mocked database matches bytes, as Postgres does.
 */
import { PUT } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({ isSiteAdmin: jest.fn(() => false) }));
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: jest.fn(), update: jest.fn() } },
}));

const findUnique = prisma.user.findUnique as jest.Mock;
const update = prisma.user.update as jest.Mock;
const users = [
  { id: 'user-1', email: 'me@example.com' },
  { id: 'user-2', email: 'taken@example.com' },
];

const put = (body: unknown) => PUT(new Request('http://localhost/api/profile/email', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } });
  findUnique.mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) =>
    users.find(u => u.id === where.id || u.email === where.email) ?? null);
});

describe('PUT /api/profile/email', () => {
  it('stores a mixed-case, space-padded email as its normal form', async () => {
    const response = await put({ email: '  New.Address@Example.COM ' });
    expect(response.status).toBe(200);
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'new.address@example.com' } });
    expect(update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { email: 'new.address@example.com' } });
  });

  it('refuses a case variant of another account\'s address', async () => {
    const response = await put({ email: 'Taken@Example.com' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'This email is already in use' });
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts a case variant of the user\'s own address', async () => {
    const response = await put({ email: 'ME@example.com' });
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { email: 'me@example.com' } });
  });

  it('still rejects an invalid email and a non-string', async () => {
    expect((await put({ email: 'not an email' })).status).toBe(400);
    expect((await put({ email: 42 })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
