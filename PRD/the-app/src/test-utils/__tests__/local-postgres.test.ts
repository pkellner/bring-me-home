/**
 * The db tests' guard (issue #1 step 2): they touch only `bring_me_home` on localhost, and say why
 * any other URL is refused without printing it.
 */
import type { PrismaClient } from '@prisma/client';
import { emptyAllTables, requireLocalTestDatabaseUrl } from '../local-postgres';

const SECRET = 'pw-Zx91';

describe('requireLocalTestDatabaseUrl', () => {
  it.each([
    [`postgresql://bring_me_home:${SECRET}@localhost:5432/bring_me_home`],
    [`postgresql://bring_me_home:${SECRET}@127.0.0.1:5432/bring_me_home`],
    [`postgres://bring_me_home:${SECRET}@[::1]:5432/bring_me_home`],
    [`postgresql://bring_me_home:${SECRET}@localhost/bring_me_home?schema=public`],
  ])('accepts %s', url => {
    expect(requireLocalTestDatabaseUrl(url, 'LOCAL_POSTGRES_URL')).toBe(url);
  });

  it.each([
    [`postgresql://app:${SECRET}@db.example.com:5432/bring_me_home`, 'does not point at localhost'],
    [`postgresql://app:${SECRET}@10.0.0.5:5432/bring_me_home`, 'does not point at localhost'],
    [`postgresql://app:${SECRET}@localhost.example.com/bring_me_home`, 'does not point at localhost'],
    [`postgresql://app:${SECRET}@localhost:5432/photo_album_dev`, 'does not name the database bring_me_home'],
    [`postgresql://app:${SECRET}@localhost:5432/bring_me_home_copy`, 'does not name the database bring_me_home'],
    [`postgresql://app:${SECRET}@localhost:5432/`, 'does not name the database bring_me_home'],
    [`mysql://root:${SECRET}@localhost:3306/bring_me_home`, 'is a mysql:// URL'],
    [undefined, 'is not set'],
  ])('refuses %s', (url, reason) => {
    let message = '';
    try {
      requireLocalTestDatabaseUrl(url, 'LOCAL_POSTGRES_URL');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain(`LOCAL_POSTGRES_URL ${reason}`);
    expect(message).not.toContain(SECRET);
  });
});

describe('emptyAllTables', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  function fakeClient(tables: string[]) {
    return {
      $queryRaw: jest.fn(async () => tables.map(tablename => ({ tablename }))),
      $executeRawUnsafe: jest.fn(async () => 0),
    };
  }

  it('refuses to run unless DATABASE_URL is the local test database', async () => {
    process.env.DATABASE_URL = `postgresql://app:${SECRET}@db.example.com/bring_me_home`;
    const client = fakeClient(['users']);
    await expect(emptyAllTables(client as unknown as PrismaClient)).rejects.toThrow('DATABASE_URL does not point at localhost');
    expect(client.$queryRaw).not.toHaveBeenCalled();
    expect(client.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('truncates every table in one statement, leaving the migration history', async () => {
    process.env.DATABASE_URL = 'postgresql://bring_me_home:pw@localhost:5432/bring_me_home';
    const client = fakeClient(['users', 'comments']);
    await emptyAllTables(client as unknown as PrismaClient);
    expect(client.$executeRawUnsafe).toHaveBeenCalledWith('TRUNCATE TABLE "public"."users", "public"."comments" CASCADE');
  });

  it('fails when the migrations were never applied (no tables)', async () => {
    process.env.DATABASE_URL = 'postgresql://bring_me_home:pw@localhost:5432/bring_me_home';
    await expect(emptyAllTables(fakeClient([]) as unknown as PrismaClient)).rejects.toThrow('has no tables');
  });
});
