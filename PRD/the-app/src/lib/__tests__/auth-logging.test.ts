import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../auth';

jest.mock('next-auth', () => ({}));

type CredentialsAuthorize = (
  credentials: Record<string, string> | undefined
) => Promise<unknown>;

const authorize = (authOptions.providers[0] as unknown as {
  options: { authorize: CredentialsAuthorize };
}).options.authorize;

const USERNAME = 'login-name-under-test';
const EMAIL = 'login-owner@example.com';
const PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

const consoleMethods = ['log', 'info', 'debug', 'warn', 'error'] as const;
let spies: jest.SpyInstance[] = [];

function loggedText(): string {
  return spies
    .flatMap(spy => spy.mock.calls)
    .map((args: unknown[]) =>
      args.map((arg: unknown) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ')
    )
    .join('\n');
}

function expectNothingPersonalLogged() {
  const text = loggedText();
  expect(text).not.toContain(USERNAME);
  expect(text).not.toContain(EMAIL);
  expect(text).not.toContain(PASSWORD);
  expect(text).not.toContain(PASSWORD_HASH.substring(0, 10));
}

beforeEach(() => {
  jest.clearAllMocks();
  spies = consoleMethods.map(method => jest.spyOn(console, method).mockImplementation(() => {}));
  mockUpdate.mockResolvedValue({});
});

afterEach(() => {
  spies.forEach(spy => spy.mockRestore());
});

function storedUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: USERNAME,
    email: EMAIL,
    password: PASSWORD_HASH,
    isActive: true,
    firstName: null,
    lastName: null,
    userRoles: [],
    townAccess: [],
    personAccess: [],
    ...overrides,
  };
}

describe('credentials authorize logging', () => {
  it('logs nothing about the user on a successful sign-in', async () => {
    mockFindUnique.mockResolvedValue(storedUser());

    const user = await authorize({ username: USERNAME, password: PASSWORD });

    expect(user).toEqual(expect.objectContaining({ id: 'user-1', email: EMAIL }));
    expectNothingPersonalLogged();
  });

  it('logs nothing about the user on a wrong password', async () => {
    mockFindUnique.mockResolvedValue(storedUser());

    const user = await authorize({ username: USERNAME, password: 'wrong password' });

    expect(user).toBeNull();
    expectNothingPersonalLogged();
  });

  it('logs nothing about the typed username when no user matches', async () => {
    mockFindUnique.mockResolvedValue(null);

    const user = await authorize({ username: USERNAME, password: PASSWORD });

    expect(user).toBeNull();
    expectNothingPersonalLogged();
  });

  it('still refuses an inactive account without logging it', async () => {
    mockFindUnique.mockResolvedValue(storedUser({ isActive: false }));

    await expect(authorize({ username: USERNAME, password: PASSWORD })).rejects.toThrow(
      'Account is inactive'
    );
    expectNothingPersonalLogged();
  });
});
