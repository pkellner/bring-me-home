/**
 * A commenter's email is stored, matched to a user and used for the verification token in one
 * normal form (issue #1 step 1). The mocked database matches bytes, as Postgres does: a lookup that
 * skips normalisation misses "joe@example.com" and creates a second user.
 */
import { submitComment, approveComment, approveBulkComments } from '../comments';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn(() => true),
  hasPersonAccess: jest.fn(() => true),
  isSiteAdmin: jest.fn(() => true),
}));
jest.mock('next/headers', () => ({ headers: jest.fn(async () => new Map([['user-agent', 'jest']])) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'hashed') }));
jest.mock('@/lib/email-opt-out-tokens', () => ({ generateOptOutToken: jest.fn(async () => 'opt-out') }));
jest.mock('@/lib/comment-verification', () => ({
  generateVerificationToken: jest.fn(() => 'plain-token'),
  hashToken: jest.fn(() => 'token-hash'),
  generateVerificationUrls: jest.fn(() => ({ verificationUrl: 'v', hideUrl: 'h', manageUrl: 'm' })),
}));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    person: { findFirst: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    comment: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    commentVerificationToken: { upsert: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    emailTemplate: { findUnique: jest.fn() },
    emailNotification: { create: jest.fn() },
    emailOptOut: { deleteMany: jest.fn() },
    personAccess: { findMany: jest.fn(async () => []) },
  },
}));

const findUser = prisma.user.findUnique as jest.Mock;
const createUser = prisma.user.create as jest.Mock;
const storedJoe = { id: 'user-1', allowAnonymousComments: true, emailVerified: new Date(), optOutOfAllEmail: false };

function storeUserByEmail(email: string) {
  findUser.mockImplementation(async ({ where }: { where: { email?: string } }) =>
    where.email === email ? storedJoe : null);
}

function commentForm(email: string) {
  const fd = new FormData();
  const fields: Record<string, string> = {
    recaptchaToken: 'captcha', personId: 'person-1', firstName: 'Joe', lastName: 'Smith', email,
    phone: '', occupation: '', birthdate: '', streetAddress: '', city: '', state: '', zipCode: '',
    content: 'Thinking of you', privateNoteToFamily: '', showComment: 'true', keepMeUpdated: 'on',
  };
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
  global.fetch = jest.fn(async () => ({ json: async () => ({ success: true, score: 0.9 }) })) as unknown as typeof fetch;
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'admin-1' } });
  (prisma.person.findFirst as jest.Mock).mockResolvedValue({ id: 'person-1' });
  (prisma.person.findUnique as jest.Mock).mockResolvedValue({
    firstName: 'Ana', lastName: 'Lopez', slug: 'ana-lopez', town: { name: 'Town', slug: 'town' },
  });
  (prisma.emailTemplate.findUnique as jest.Mock).mockImplementation(async ({ where }: { where: { name: string } }) =>
    where.name.startsWith('comment_submission')
      ? { id: 'tpl', isActive: true, subject: 'Thanks', htmlContent: '<p>Thanks</p>', textContent: 'Thanks' }
      : null);
  createUser.mockImplementation(async ({ data }: { data: object }) => ({ ...data, id: 'new-user' }));
});

afterEach(() => jest.restoreAllMocks());

describe('submitComment', () => {
  it('links "Joe@Example.com " to the existing user joe@example.com and creates no second user', async () => {
    storeUserByEmail('joe@example.com');
    const result = await submitComment({}, commentForm('Joe@Example.com '));

    expect(result.success).toBe(true);
    expect(findUser).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'joe@example.com' } }));
    expect(createUser).not.toHaveBeenCalled();
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'joe@example.com', userId: 'user-1' }),
    });
  });

  it('keys the verification token on the normalised email', async () => {
    storeUserByEmail('joe@example.com');
    await submitComment({}, commentForm('  JOE@example.com'));
    expect(prisma.commentVerificationToken.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'joe@example.com' },
      create: { email: 'joe@example.com', tokenHash: 'token-hash' },
    }));
  });

  it('creates a new commenter with username and email in normal form', async () => {
    storeUserByEmail('someone-else@example.com');
    await submitComment({}, commentForm(' New.Person@Example.com '));
    expect(createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: 'new.person@example.com', email: 'new.person@example.com' }),
    });
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ email: 'new.person@example.com', userId: 'new-user' }),
    });
  });

  it('stores no email, and looks up no user, when the email field is blank', async () => {
    await submitComment({}, commentForm(''));
    expect(findUser).not.toHaveBeenCalled();
    expect(prisma.comment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: null, userId: null }) });
  });
});

describe('approving a comment links it by the normalised email', () => {
  const storedComment = {
    id: 'comment-1', personId: 'person-1', userId: null, email: 'Joe@Example.com ',
    firstName: 'Joe', lastName: 'Smith', person: { id: 'person-1' },
  };

  it('approveComment links a comment stored as "Joe@Example.com " to user joe@example.com', async () => {
    storeUserByEmail('joe@example.com');
    (prisma.comment.findUnique as jest.Mock).mockResolvedValue(storedComment);

    await approveComment('comment-1', '');
    expect(findUser).toHaveBeenCalledWith({ where: { email: 'joe@example.com' }, select: { id: true } });
    expect(createUser).not.toHaveBeenCalled();
    expect(prisma.comment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'user-1' }),
    }));
  });

  it('approveComment creates the missing user in normal form', async () => {
    storeUserByEmail('someone-else@example.com');
    (prisma.comment.findUnique as jest.Mock).mockResolvedValue(storedComment);

    await approveComment('comment-1', '');
    expect(createUser).toHaveBeenCalledWith({
      data: expect.objectContaining({ username: 'joe@example.com', email: 'joe@example.com' }),
    });
  });

  it('approveBulkComments links the user and looks up and creates the token by the normalised email', async () => {
    storeUserByEmail('joe@example.com');
    (prisma.comment.findMany as jest.Mock).mockResolvedValue([
      { ...storedComment, person: { id: 'person-1', slug: 'ana', town: { slug: 'town' } }, personHistory: null },
    ]);
    (prisma.commentVerificationToken.findFirst as jest.Mock).mockResolvedValue(null);

    await approveBulkComments(['comment-1']);
    expect(createUser).not.toHaveBeenCalled();
    expect(prisma.commentVerificationToken.findFirst).toHaveBeenCalledWith({
      where: { email: 'joe@example.com', isActive: true },
    });
    expect(prisma.commentVerificationToken.create).toHaveBeenCalledWith({
      data: { email: 'joe@example.com', tokenHash: 'token-hash' },
    });
  });
});
