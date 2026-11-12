/**
 * comment_verification_tokens.email is unique and compared by bytes on Postgres, so every lookup
 * and write of it uses the normalised email (issue #1 step 1).
 */
import { issueVerificationToken, findTokensWithoutUser, hashToken } from '../comment-verification';
import { sendAnonymousVerificationEmail } from '@/app/actions/email-verification';
import { prisma } from '../prisma';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/email-opt-out-tokens', () => ({ generateOptOutToken: jest.fn(async () => 'opt-out') }));
jest.mock('../prisma', () => ({
  prisma: {
    commentVerificationToken: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    emailTemplate: { findUnique: jest.fn() },
    comment: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    emailNotification: { create: jest.fn() },
  },
}));

const token = prisma.commentVerificationToken;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

// PR #3 replaced getOrCreateVerificationToken (unused) with issueVerificationToken; these two tests
// carried the same normalisation contract over to the function that replaced it.
describe('issueVerificationToken', () => {
  it('matches the existing token by the normalised email', async () => {
    (token.upsert as jest.Mock).mockResolvedValue({ id: 't1' });
    const issued = await issueVerificationToken(' Joe@Example.com ');
    expect(token.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'joe@example.com' } }));
    expect(token.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ tokenHash: hashToken(issued) }),
    }));
  });

  it('creates the token under the normalised email', async () => {
    (token.upsert as jest.Mock).mockResolvedValue({ id: 't2' });
    const issued = await issueVerificationToken('JOE@example.com');
    expect(token.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: { email: 'joe@example.com', tokenHash: hashToken(issued) },
    }));
  });
});

describe('sendAnonymousVerificationEmail', () => {
  beforeEach(() => {
    (prisma.emailTemplate.findUnique as jest.Mock).mockResolvedValue({
      id: 'tpl', isActive: true, subject: 'Verify', htmlContent: '<p>Verify</p>', textContent: 'Verify',
    });
    (prisma.comment.findUnique as jest.Mock).mockResolvedValue({ personId: 'p1', person: { slug: 'p', town: { slug: 't' } } });
  });

  it('reuses the token stored for the normalised email instead of creating a second one', async () => {
    (token.findUnique as jest.Mock).mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email === 'joe@example.com' ? { id: 't1', email: 'joe@example.com' } : null);

    const result = await sendAnonymousVerificationEmail('c1', ' Joe@Example.com ', 'Ana Lopez', 'Joe');
    expect(result.success).toBe(true);
    expect(token.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 't1' } }));
    expect(token.create).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'joe@example.com' }, select: { id: true } });
  });

  it('creates a missing token under the normalised email', async () => {
    (token.findUnique as jest.Mock).mockResolvedValue(null);
    (token.create as jest.Mock).mockResolvedValue({ id: 't2' });

    await sendAnonymousVerificationEmail('c1', 'NEW@Example.com', 'Ana Lopez');
    expect(token.create).toHaveBeenCalledWith({ data: { email: 'new@example.com', tokenHash: expect.any(String) } });
  });
});

describe('findTokensWithoutUser (used by the orphaned-token scripts)', () => {
  const tokens = [
    { id: 't1', email: 'joe@example.com' },
    { id: 't2', email: 'Ann@Example.com ' },
    { id: 't3', email: 'gone@example.com' },
  ];

  it('keeps a token whose user is stored in another case or with spaces', () => {
    const orphans = findTokensWithoutUser(tokens, ['JOE@example.com', 'ann@example.com', null]);
    expect(orphans.map(t => t.id)).toEqual(['t3']);
  });

  it('returns every token when no user has an email', () => {
    expect(findTokensWithoutUser(tokens, [null, null]).map(t => t.id)).toEqual(['t1', 't2', 't3']);
  });

  it('returns nothing when every token has a user', () => {
    expect(findTokensWithoutUser(tokens, ['joe@example.com', 'ann@example.com', 'Gone@Example.com'])).toEqual([]);
  });
});
