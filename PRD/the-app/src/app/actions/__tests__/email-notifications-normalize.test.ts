/**
 * createUsersFromCommentEmails makes one user per normalised commenter email (issue #1 step 1):
 * "Joe@Example.com" and "joe@example.com " are one person, and an existing user stored in any case
 * is not created again.
 */
import { createUsersFromCommentEmails } from '../email-notifications';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({ isSiteAdmin: jest.fn(() => true) }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'hashed') }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    comment: { findMany: jest.fn() },
    user: { findMany: jest.fn(), createMany: jest.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })) },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'admin-1' } });
});

describe('createUsersFromCommentEmails', () => {
  it('creates one user per normalised email and skips users stored in another case', async () => {
    (prisma.comment.findMany as jest.Mock).mockResolvedValue([
      { email: 'Joe@Example.com', firstName: 'Joe', lastName: 'Smith' },
      { email: 'joe@example.com ', firstName: 'Joe', lastName: 'Smith' },
      { email: 'ann@example.com', firstName: 'Ann', lastName: 'Lee' },
    ]);
    // A user that predates normalisation, stored with capitals.
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ email: 'Ann@Example.com' }]);

    const result = await createUsersFromCommentEmails();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { email: { in: ['joe@example.com', 'ann@example.com'] } },
      select: { email: true },
    });
    expect(prisma.user.createMany).toHaveBeenCalledWith({
      data: [{
        username: 'joe@example.com', email: 'joe@example.com', password: 'hashed',
        firstName: 'Joe', lastName: 'Smith', isActive: true,
      }],
      skipDuplicates: true,
    });
    expect(result).toEqual({ success: true, created: 1, skipped: 1 });
  });
});
