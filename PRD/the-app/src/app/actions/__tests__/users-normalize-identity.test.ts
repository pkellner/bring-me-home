/**
 * Registration and the admin user screens store usernames and emails in one normal form and
 * check uniqueness against that form (issue #1 step 1). The mocked database matches bytes, as
 * Postgres does, so a lookup that skips normalisation misses the stored row.
 */
import { registerUser } from '../auth';
import { createUser, updateUser } from '../users';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/permissions', () => ({ hasPermission: jest.fn(() => true) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('../email-verification', () => ({ sendVerificationEmail: jest.fn(async () => ({ success: true })) }));
jest.mock('../user-cleanup', () => ({ cleanupDeletedUserData: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'hashed') }));

jest.mock('@/lib/prisma', () => {
  const user = { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() };
  const tx = {
    user,
    userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
    townAccess: { deleteMany: jest.fn(), createMany: jest.fn() },
    personAccess: { deleteMany: jest.fn(), createMany: jest.fn() },
  };
  return {
    prisma: {
      ...tx,
      role: { findUnique: jest.fn(async () => ({ id: 'role-viewer' })) },
      userRole: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});

type StoredUser = { id: string; username: string; email: string | null };
const findUnique = prisma.user.findUnique as jest.Mock;
const create = prisma.user.create as jest.Mock;
const update = prisma.user.update as jest.Mock;

// updateUser reads these relations for its audit log.
const withRelations = (u: StoredUser) => ({ ...u, userRoles: [], townAccess: [], personAccess: [] });

function storeUsers(users: StoredUser[]) {
  findUnique.mockImplementation(async ({ where }: { where: Partial<StoredUser> }) => {
    const found = users.find(u =>
      (where.id !== undefined && u.id === where.id) ||
      (where.username !== undefined && u.username === where.username) ||
      (where.email !== undefined && u.email === where.email));
    return found ? withRelations(found) : null;
  });
}

// The registration and user forms always send these fields; a missing one reaches zod as null.
function form(fields: Record<string, string>) {
  const fd = new FormData();
  Object.entries({ email: '', firstName: '', lastName: '', ...fields }).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'admin-1' } });
  create.mockImplementation(async ({ data }: { data: StoredUser }) => ({ ...data, id: 'new-user' }));
  update.mockImplementation(async ({ data }: { data: StoredUser }) => ({ ...data, id: 'user-1' }));
});

afterEach(() => jest.restoreAllMocks());

describe('registerUser', () => {
  it('stores " Peter " / " Peter@Example.COM " as peter / peter@example.com and checks those', async () => {
    storeUsers([]);
    const result = await registerUser(form({
      username: ' Peter ', email: ' Peter@Example.COM ', password: 'long-enough-1', firstName: '', lastName: '',
    }));

    expect(result).toEqual({ success: true, user: { id: 'new-user', username: 'peter' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { username: 'peter' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'peter@example.com' } });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ username: 'peter', email: 'peter@example.com' }) });
  });

  it('rejects a case variant of an existing username', async () => {
    storeUsers([{ id: 'user-1', username: 'peter', email: null }]);
    expect(await registerUser(form({ username: 'PETER', password: 'long-enough-1' })))
      .toEqual({ error: 'Username already exists' });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a case variant of an existing email', async () => {
    storeUsers([{ id: 'user-1', username: 'someone', email: 'joe@example.com' }]);
    expect(await registerUser(form({ username: 'joe2', email: 'Joe@Example.com ', password: 'long-enough-1' })))
      .toEqual({ error: 'Email already exists' });
    expect(create).not.toHaveBeenCalled();
  });

  it('stores no email when the field is blank', async () => {
    storeUsers([]);
    await registerUser(form({ username: 'peter', email: '', password: 'long-enough-1' }));
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: null }) });
  });
});

describe('createUser (admin)', () => {
  it('stores and checks the normal form', async () => {
    storeUsers([]);
    const result = await createUser(form({ username: 'New_Admin ', email: 'New@Example.com', password: 'long-enough-1' }));
    expect(result.success).toBe(true);
    expect(findUnique).toHaveBeenCalledWith({ where: { username: 'new_admin' } });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'new@example.com' } });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ username: 'new_admin', email: 'new@example.com' }) });
  });

  it('rejects a case variant of an existing email', async () => {
    storeUsers([{ id: 'user-1', username: 'joe', email: 'joe@example.com' }]);
    const result = await createUser(form({ username: 'joe2', email: 'JOE@example.com', password: 'long-enough-1' }));
    expect(result).toEqual({ success: false, errors: { email: ['Email already exists'] } });
  });
});

describe('updateUser (admin)', () => {
  const editForm = (fields: Record<string, string>) =>
    form({ firstName: 'Joe', lastName: 'Smith', isActive: 'true', allowAnonymousComments: 'true', ...fields });

  it('writes the normal form of the username and email', async () => {
    storeUsers([{ id: 'user-1', username: 'joe', email: 'joe@example.com' }]);
    const result = await updateUser('user-1', editForm({ username: ' Joe ', email: 'Joe.New@Example.com ' }));
    expect(result).toMatchObject({ success: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        username: 'joe', email: 'joe.new@example.com',
        firstName: 'Joe', lastName: 'Smith', isActive: true, allowAnonymousComments: true,
      },
    });
  });

  it('does not report the user\'s own username or email as taken when only case differs', async () => {
    // A stored value that predates normalisation; MySQL finds it for "joe", so the lookup returns the user itself.
    const self = withRelations({ id: 'user-1', username: 'Joe', email: 'Joe@Example.com' });
    findUnique.mockImplementation(async ({ where }: { where: Partial<StoredUser> }) =>
      where.id === 'user-1' || where.username === 'joe' || where.email === 'joe@example.com' ? self : null);

    const result = await updateUser('user-1', editForm({ username: 'Joe', email: 'Joe@Example.com' }));
    expect(result).toMatchObject({ success: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ username: 'joe', email: 'joe@example.com' }),
    }));
  });

  it('rejects another user\'s email typed in a different case', async () => {
    storeUsers([
      { id: 'user-1', username: 'joe', email: 'joe@example.com' },
      { id: 'user-2', username: 'ann', email: 'ann@example.com' },
    ]);
    expect(await updateUser('user-1', editForm({ username: 'joe', email: 'ANN@example.com' })))
      .toEqual({ error: 'Email already exists' });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects another user\'s username typed in a different case', async () => {
    storeUsers([
      { id: 'user-1', username: 'joe', email: null },
      { id: 'user-2', username: 'ann', email: null },
    ]);
    expect(await updateUser('user-1', editForm({ username: 'Ann', email: '' })))
      .toEqual({ error: 'Username already exists' });
  });
});
