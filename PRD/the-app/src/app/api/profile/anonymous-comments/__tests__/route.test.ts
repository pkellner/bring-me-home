/**
 * POST /api/profile/anonymous-comments: the submitted email is normalised before it is compared
 * with the session's or token's email and before it is matched (issue #1 step 1).
 */
import type { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { verifyToken } from '@/lib/comment-verification';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/comment-verification', () => ({ verifyToken: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { updateMany: jest.fn(async () => ({ count: 1 })) } },
}));

const post = (body: unknown, headers: Record<string, string> = {}) => POST(
  // jest.setup.js's Request stand-in; the route reads only headers.get() and json().
  new Request('http://localhost/api/profile/anonymous-comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest,
);

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue(null);
  (verifyToken as jest.Mock).mockResolvedValue(null);
});

describe('POST /api/profile/anonymous-comments', () => {
  it('lets the signed-in owner change the setting when the typed email differs in case and spaces', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'joe@example.com' } });
    const response = await post({ allowAnonymousComments: false, email: ' Joe@Example.com ' });
    expect(response.status).toBe(200);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { email: 'joe@example.com' }, data: { allowAnonymousComments: false },
    });
  });

  it('accepts a token whose email matches in normal form', async () => {
    (verifyToken as jest.Mock).mockResolvedValue({ email: 'joe@example.com' });
    const response = await post({ allowAnonymousComments: true, email: 'JOE@example.com' }, { 'x-verification-token': 't' });
    expect(response.status).toBe(200);
  });

  it('refuses a session for another address', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'ann@example.com' } });
    expect((await post({ allowAnonymousComments: true, email: 'joe@example.com' })).status).toBe(401);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
