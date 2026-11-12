/**
 * @jest-environment node
 *
 * Issue #1: the /admin/postgres overview queries, with the database mocked.
 */
import { prisma } from '@/lib/prisma';
import { getDatabaseInfo, getPostgresOverview, getTableStats, rowCountQuery } from '../postgres-overview';

jest.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: jest.fn() } }));

const queryRaw = prisma.$queryRaw as unknown as jest.Mock;

describe('rowCountQuery', () => {
  it('rejects a table that is not in the pg_tables list', () => {
    expect(() => rowCountQuery(['users', 'users; DROP TABLE users'], ['users'])).toThrow(
      'Not a table in pg_tables: users; DROP TABLE users',
    );
  });

  it('counts each known table, quoting its name as an identifier and passing it as a value', () => {
    const query = rowCountQuery(['users', 'odd"name'], ['users', 'odd"name']);
    expect(query.sql).toBe(
      'SELECT ?::text AS name, count(*)::bigint AS "rowCount" FROM "public"."users"' +
        ' UNION ALL SELECT ?::text AS name, count(*)::bigint AS "rowCount" FROM "public"."odd""name"',
    );
    expect(query.values).toEqual(['users', 'odd"name']);
  });
});

describe('getTableStats', () => {
  beforeEach(() => queryRaw.mockReset());

  it('joins each table size with its row count, in pg_tables order', async () => {
    queryRaw
      .mockResolvedValueOnce([{ name: 'persons', sizePretty: '216 kB' }, { name: 'users', sizePretty: '112 kB' }])
      .mockResolvedValueOnce([{ name: 'users', rowCount: BigInt(65) }, { name: 'persons', rowCount: BigInt(18) }]);
    expect(await getTableStats()).toEqual([
      { name: 'persons', rowCount: 18, sizePretty: '216 kB' },
      { name: 'users', rowCount: 65, sizePretty: '112 kB' },
    ]);
    const countQuery = queryRaw.mock.calls[1][0];
    expect(countQuery.values).toEqual(['persons', 'users']);
  });

  it('runs no count query when there are no tables', async () => {
    queryRaw.mockResolvedValueOnce([]);
    expect(await getTableStats()).toEqual([]);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });
});

describe('getDatabaseInfo', () => {
  beforeEach(() => queryRaw.mockReset());

  it('names the locale provider', async () => {
    queryRaw.mockResolvedValueOnce([{ name: 'bring_me_home', sizePretty: '13 MB', provider: 'i', locale: 'und' }]);
    expect(await getDatabaseInfo()).toEqual({
      name: 'bring_me_home', sizePretty: '13 MB', localeProvider: 'icu', locale: 'und',
    });
  });
});

describe('getPostgresOverview', () => {
  const savedUrl = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = savedUrl;
  });

  it('puts every part together and reads only connection_limit from the URL', async () => {
    process.env.DATABASE_URL = 'postgresql://u:secret@h/db?connection_limit=10&pool_timeout=30';
    const finishedAt = new Date('2026-11-12T02:51:25Z');
    queryRaw.mockReset();
    queryRaw.mockImplementation((strings: TemplateStringsArray | { sql: string }) => {
      const sql = Array.isArray(strings) ? strings.join('?') : (strings as { sql: string }).sql;
      if (sql.includes('server_version')) return Promise.resolve([{ version: '18.6' }]);
      if (sql.includes('pg_database_size')) {
        return Promise.resolve([{ name: 'db', sizePretty: '13 MB', provider: 'c', locale: 'en_US.UTF-8' }]);
      }
      if (sql.includes('max_connections')) return Promise.resolve([{ activeConnections: 5, maxConnections: 300 }]);
      if (sql.includes('_prisma_migrations')) {
        return Promise.resolve([{ name: '20261112025125_postgres_baseline', finishedAt }]);
      }
      if (sql.includes('pg_tables')) return Promise.resolve([{ name: 'users', sizePretty: '112 kB' }]);
      if (sql.includes('count(*)')) return Promise.resolve([{ name: 'users', rowCount: BigInt(65) }]);
      return Promise.reject(new Error(`unexpected query: ${sql}`));
    });

    const overview = await getPostgresOverview();
    expect(overview).toEqual({
      version: 'PostgreSQL 18.6',
      database: { name: 'db', sizePretty: '13 MB', localeProvider: 'libc', locale: 'en_US.UTF-8' },
      connections: { activeConnections: 5, maxConnections: 300 },
      connectionLimit: 10,
      migrations: [{ name: '20261112025125_postgres_baseline', finishedAt }],
      tables: [{ name: 'users', rowCount: 65, sizePretty: '112 kB' }],
    });
    expect(JSON.stringify(overview)).not.toContain('secret');
  });
});
