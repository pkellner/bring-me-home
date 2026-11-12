/**
 * Hiding a comment is authorised by matching the commenter's email to a verification token or the
 * signed-in user's email. The match compares normal forms (issue #1 step 1), and a comment with no
 * email matches no one.
 */
import type { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { verifyToken } from '@/lib/comment-verification';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({ hasPermission: jest.fn(() => false) }));
jest.mock('@/lib/comment-verification', () => ({ verifyToken: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { comment: { findUnique: jest.fn(), update: jest.fn(async () => ({ hideRequested: true })) } },
}));

const hide = (headers: Record<string, string> = {}) => POST(
  // jest.setup.js's Request stand-in; the route reads only headers.get() and json().
  new Request('http://localhost/api/comments/c1/hide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ hideRequested: true }),
  }) as unknown as NextRequest,
  { params: Promise.resolve({ id: 'c1' }) },
);

const storeComment = (email: string | null) =>
  (prisma.comment.findUnique as jest.Mock).mockResolvedValue({ email });

beforeEach(() => {
  jest.clearAllMocks();
  (getServerSession as jest.Mock).mockResolvedValue(null);
  (verifyToken as jest.Mock).mockResolvedValue(null);
});

describe('POST /api/comments/[id]/hide', () => {
  it('accepts a token for joe@example.com on a comment stored as "Joe@Example.com "', async () => {
    storeComment('Joe@Example.com ');
    (verifyToken as jest.Mock).mockResolvedValue({ email: 'joe@example.com' });
    expect((await hide({ 'x-verification-token': 'tok' })).status).toBe(200);
    expect(prisma.comment.update).toHaveBeenCalled();
  });

  it('accepts the signed-in owner when the stored and session emails differ only in case', async () => {
    storeComment('joe@example.com');
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', email: 'Joe@Example.com' } });
    expect((await hide()).status).toBe(200);
  });

  it('refuses a token for another address', async () => {
    storeComment('joe@example.com');
    (verifyToken as jest.Mock).mockResolvedValue({ email: 'ann@example.com' });
    expect((await hide({ 'x-verification-token': 'tok' })).status).toBe(401);
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });

  it('refuses a signed-in user with no email on a comment with no email', async () => {
    storeComment(null);
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'u1', email: null } });
    expect((await hide()).status).toBe(401);
    expect(prisma.comment.update).not.toHaveBeenCalled();
  });
});
