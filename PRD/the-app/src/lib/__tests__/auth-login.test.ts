import bcrypt from 'bcryptjs';
import { authOptions } from '../auth';
import { prisma } from '../prisma';

jest.mock('../prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

type Authorize = (credentials: Record<string, string>) => Promise<{ id: string; username: string } | null>;

// CredentialsProvider keeps the app's authorize() in `options`.
const authorize = (authOptions.providers[0] as unknown as { options: { authorize: Authorize } }).options.authorize;
const findUnique = prisma.user.findUnique as jest.Mock;

describe('login looks up the username in lowercase (issue #1 step 1)', () => {
  let storedUser: Record<string, unknown>;

  beforeAll(async () => {
    storedUser = {
      id: 'user-1',
      username: 'peter',
      email: 'peter@example.com',
      password: await bcrypt.hash('secret-pass', 4),
      isActive: true,
      firstName: null,
      lastName: null,
      userRoles: [],
      townAccess: [],
      personAccess: [],
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    // The database matches bytes, as Postgres does.
    findUnique.mockImplementation(async ({ where }: { where: { username: string } }) =>
      where.username === storedUser.username ? storedUser : null);
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs in "Peter" as the stored "peter"', async () => {
    const user = await authorize({ username: 'Peter', password: 'secret-pass' });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { username: 'peter' } }));
    expect(user?.id).toBe('user-1');
  });

  it('logs in "PETER" too', async () => {
    expect((await authorize({ username: 'PETER', password: 'secret-pass' }))?.id).toBe('user-1');
  });

  // Contract changed in issue #1 step 2 (was "does not trim"): step 0 found no stored username with
  // surrounding spaces, so login trims as well as lowercasing.
  it('logs in " Peter " as the stored "peter"', async () => {
    const user = await authorize({ username: ' Peter ', password: 'secret-pass' });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { username: 'peter' } }));
    expect(user?.id).toBe('user-1');
  });

  it('still rejects a wrong password', async () => {
    expect(await authorize({ username: 'Peter', password: 'wrong' })).toBeNull();
  });
});
