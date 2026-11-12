/**
 * db test (issue #1 steps 1 and 2): login, registration and comment linking on real Postgres,
 * which compares text byte for byte. Each case runs through the app's own functions; only the
 * outside services (reCAPTCHA, email, Next's request and cache) are mocked.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { registerUser } from '@/app/actions/auth';
import { submitComment } from '@/app/actions/comments';
import { emptyAllTables } from '@/test-utils/local-postgres';

jest.mock('next/headers', () => ({ headers: jest.fn(async () => new Map([['user-agent', 'jest']])) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/app/actions/email-verification', () => ({ sendVerificationEmail: jest.fn(async () => ({ success: true })) }));
// Reached only when an email template exists (none here); it loads the ESM-only nanoid.
jest.mock('@/lib/email-opt-out-tokens', () => ({ generateOptOutToken: jest.fn(async () => 'opt-out') }));

type Authorize = (credentials: Record<string, string>) => Promise<{ id: string } | null>;
const authorize = (authOptions.providers[0] as unknown as { options: { authorize: Authorize } }).options.authorize;

beforeEach(async () => {
  await emptyAllTables(prisma);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.RECAPTCHA_SECRET_KEY = 'test-secret';
  // reCAPTCHA is an outside service: its answer is mocked.
  global.fetch = jest.fn(async () => ({ json: async () => ({ success: true, score: 0.9 }) })) as unknown as typeof fetch;
});
afterEach(() => jest.restoreAllMocks());
afterAll(() => prisma.$disconnect());

async function storeUser(username: string, email: string | null, password = 'secret-pass') {
  return prisma.user.create({ data: { username, email, password: await bcrypt.hash(password, 4), isActive: true } });
}

async function storePerson() {
  const town = await prisma.town.create({ data: { name: 'Borrego Springs', slug: 'borrego-springs', state: 'CA', fullAddress: 'Borrego Springs, CA' } });
  return prisma.person.create({
    data: { firstName: 'Ana', lastName: 'Lopez', slug: 'ana-lopez', townId: town.id, lastKnownAddress: 'Borrego Springs, CA' },
  });
}

function commentForm(personId: string, email: string) {
  const fd = new FormData();
  const fields: Record<string, string> = {
    recaptchaToken: 'captcha', personId, firstName: 'Joe', lastName: 'Smith', email,
    phone: '', occupation: '', birthdate: '', streetAddress: '', city: '', state: '', zipCode: '',
    content: 'Thinking of you', privateNoteToFamily: '', showComment: 'true', keepMeUpdated: 'on',
  };
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

function registrationForm(username: string, email: string) {
  const fd = new FormData();
  Object.entries({ username, email, password: 'long-enough-1', firstName: 'Alice', lastName: 'Ng' })
    .forEach(([k, v]) => fd.append(k, v));
  return fd;
}

describe('login', () => {
  it('finds the stored "peter" when "Peter " is typed', async () => {
    const peter = await storeUser('peter', 'peter@example.com');
    expect((await authorize({ username: 'Peter ', password: 'secret-pass' }))?.id).toBe(peter.id);
  });

  it('finds it for " PETER" and "peter" too, and still checks the password', async () => {
    const peter = await storeUser('peter', null);
    expect((await authorize({ username: ' PETER', password: 'secret-pass' }))?.id).toBe(peter.id);
    expect((await authorize({ username: 'peter', password: 'secret-pass' }))?.id).toBe(peter.id);
    expect(await authorize({ username: 'Peter ', password: 'wrong-pass' })).toBeNull();
  });

  it('does not find a user who does not exist', async () => {
    await storeUser('peter', null);
    expect(await authorize({ username: 'petra', password: 'secret-pass' })).toBeNull();
  });
});

describe('comments link to the user by email', () => {
  it('links a comment by "Joe@Example.com " to the user joe@example.com without creating a second user', async () => {
    const joe = await storeUser('joe', 'joe@example.com');
    const person = await storePerson();

    const result = await submitComment({}, commentForm(person.id, 'Joe@Example.com '));

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(await prisma.user.count()).toBe(1);
    const comments = await prisma.comment.findMany({ select: { userId: true, email: true } });
    expect(comments).toEqual([{ userId: joe.id, email: 'joe@example.com' }]);
  });

  it('creates one user for a new commenter and links their next comment, typed differently, to it', async () => {
    const person = await storePerson();

    await submitComment({}, commentForm(person.id, ' New.Person@Example.com'));
    await submitComment({}, commentForm(person.id, 'NEW.PERSON@example.COM '));

    const users = await prisma.user.findMany({ select: { id: true, username: true, email: true } });
    expect(users).toEqual([{ id: expect.any(String), username: 'new.person@example.com', email: 'new.person@example.com' }]);
    const comments = await prisma.comment.findMany({ select: { userId: true, email: true } });
    expect(comments).toEqual([
      { userId: users[0].id, email: 'new.person@example.com' },
      { userId: users[0].id, email: 'new.person@example.com' },
    ]);
  });
});

describe('unique email and username after normalising', () => {
  it('registration stores the normal form and refuses a case or space variant of a taken username', async () => {
    expect(await registerUser(registrationForm(' Alice', 'Alice@Example.com '))).toEqual(expect.objectContaining({ success: true }));
    expect(await registerUser(registrationForm('ALICE ', 'other@example.com'))).toEqual({ error: 'Username already exists' });

    const users = await prisma.user.findMany({ select: { username: true, email: true } });
    expect(users).toEqual([{ username: 'alice', email: 'alice@example.com' }]);
  });

  it('registration refuses a case or space variant of a taken email', async () => {
    await registerUser(registrationForm('alice', 'alice@example.com'));
    expect(await registerUser(registrationForm('alice2', ' ALICE@example.com'))).toEqual({ error: 'Email already exists' });
    expect(await prisma.user.count()).toBe(1);
  });

  it('the database itself refuses a second row with the same normalised username or email', async () => {
    await storeUser('alice', 'alice@example.com');
    await expect(storeUser('alice', 'second@example.com')).rejects.toMatchObject({ code: 'P2002' });
    await expect(storeUser('alice2', 'alice@example.com')).rejects.toMatchObject({ code: 'P2002' });
  });
});
