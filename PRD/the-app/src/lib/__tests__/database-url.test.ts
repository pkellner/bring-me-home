/**
 * Issue #1 step 2: the app runs on PostgreSQL only. A missing DATABASE_URL, or one still pointing
 * at MySQL, fails at start-up with a message that names the problem and never the URL.
 */
import { databaseUrl, requirePostgresUrl } from '../database-url';

const SECRET = 's3cr3t-Pa55';
const HOST = 'db.internal.example';

describe('requirePostgresUrl', () => {
  it.each([
    ['postgresql://app:pw@localhost:5432/bring_me_home'],
    ['postgres://app:pw@localhost:5432/bring_me_home'],
    ['postgresql://app:pw@localhost:5432/bring_me_home?connection_limit=10&pool_timeout=30'],
    ['postgresql://localhost/bring_me_home'],
  ])('accepts %s and returns it unchanged', url => {
    expect(requirePostgresUrl(url, 'DATABASE_URL')).toBe(url);
  });

  it.each([
    [undefined],
    [''],
    ['   '],
  ])('refuses a missing URL (%p), naming the variable', url => {
    expect(() => requirePostgresUrl(url, 'DATABASE_URL')).toThrow('DATABASE_URL is not set. It must be a postgresql:// URL.');
  });

  it('refuses a mysql:// URL and says the app runs on PostgreSQL only', () => {
    expect(() => requirePostgresUrl(`mysql://root:${SECRET}@${HOST}:3306/bring_me_home`, 'DATABASE_URL'))
      .toThrow('DATABASE_URL is a mysql:// URL. This app runs on PostgreSQL only and needs a postgresql:// URL.');
  });

  it.each([
    ['mariadb://u:p@h/db', 'mariadb'],
    ['sqlserver://h;database=db', 'sqlserver'],
    ['file:./dev.db', null],
    ['POSTGRESQL://u:p@h/db', 'POSTGRESQL'],
  ])('refuses %s', (url, scheme) => {
    expect(() => requirePostgresUrl(url, 'DATABASE_URL'))
      .toThrow(scheme ? `DATABASE_URL is a ${scheme}:// URL.` : 'DATABASE_URL does not start with a URL scheme.');
  });

  it('refuses a value with no scheme', () => {
    expect(() => requirePostgresUrl(`${HOST}:5432/bring_me_home`, 'DATABASE_URL'))
      .toThrow('DATABASE_URL does not start with a URL scheme. It must be a postgresql:// URL.');
  });

  it('names the variable it was given', () => {
    expect(() => requirePostgresUrl(undefined, 'LOCAL_POSTGRES_URL')).toThrow('LOCAL_POSTGRES_URL is not set.');
  });

  it.each([
    [`mysql://root:${SECRET}@${HOST}:3306/bring_me_home`],
    [`${SECRET}@${HOST}/bring_me_home`],
    [`mysql://root:${SECRET}@${HOST}/bring_me_home?password=${SECRET}`],
  ])('never puts the password or the host in the message (%s)', url => {
    let message = '';
    try {
      requirePostgresUrl(url, 'DATABASE_URL');
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toBe('');
    expect(message).not.toContain(SECRET);
    expect(message).not.toContain(HOST);
  });
});

describe('databaseUrl', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it('returns DATABASE_URL when it is a postgresql:// URL', () => {
    process.env.DATABASE_URL = 'postgresql://app:pw@localhost:5432/bring_me_home';
    expect(databaseUrl()).toBe('postgresql://app:pw@localhost:5432/bring_me_home');
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => databaseUrl()).toThrow('DATABASE_URL is not set.');
  });

  it('throws when DATABASE_URL is still the MySQL URL', () => {
    process.env.DATABASE_URL = 'mysql://root:pw@localhost:3306/bring_me_home';
    expect(() => databaseUrl()).toThrow('DATABASE_URL is a mysql:// URL.');
  });
});

describe('the app\'s Prisma client (src/lib/prisma.ts)', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = original;
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  // jest.setup.js mocks '@/lib/prisma' for every test; requireActual loads the real module.
  function loadRealPrismaModule() {
    let loaded: unknown;
    jest.isolateModules(() => {
      loaded = jest.requireActual('../prisma');
    });
    return loaded as { prisma: unknown };
  }

  it('refuses to start with a mysql:// DATABASE_URL', () => {
    process.env.DATABASE_URL = 'mysql://root:pw@localhost:3306/bring_me_home';
    expect(loadRealPrismaModule).toThrow('DATABASE_URL is a mysql:// URL.');
  });

  it('refuses to start without DATABASE_URL', () => {
    delete process.env.DATABASE_URL;
    expect(loadRealPrismaModule).toThrow('DATABASE_URL is not set.');
  });

  it('starts with a postgresql:// DATABASE_URL (it does not connect until a query runs)', () => {
    process.env.DATABASE_URL = 'postgresql://app:pw@127.0.0.1:1/bring_me_home';
    expect(loadRealPrismaModule().prisma).toBeDefined();
  });
});
