/**
 * db test (issue #1 step 3): the health-check queries run on real Postgres. On MySQL they used
 * `information_schema.processlist`, `SHOW VARIABLES` and `SLEEP()`, none of which Postgres has.
 */
import { prisma } from '@/lib/prisma';
import {
  getConnectionCounts,
  getDatabaseSessions,
  getDatabaseVersion,
  runConcurrentSleeps,
} from '../database-health';
import { testDatabaseConnection, testDatabaseConnectionPool } from '@/app/actions/health-check';

jest.mock('@/lib/redis/redis-service', () => ({ redisHealthCheck: jest.fn() }));

afterAll(() => prisma.$disconnect());

describe('PostgreSQL health queries', () => {
  it('reads the server version', async () => {
    const [{ serverVersion }] = await prisma.$queryRaw<Array<{ serverVersion: string }>>`
      SELECT current_setting('server_version') AS "serverVersion"
    `;
    expect(await getDatabaseVersion()).toBe(`PostgreSQL ${serverVersion}`);
    expect(await getDatabaseVersion()).toMatch(/^PostgreSQL \d+\.\d+/);
  });

  it('counts this database\'s client connections and reads max_connections as numbers', async () => {
    const counts = await getConnectionCounts();
    expect(Number.isInteger(counts.activeConnections)).toBe(true);
    expect(counts.activeConnections).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(counts.maxConnections)).toBe(true);
    expect(counts.maxConnections).toBeGreaterThanOrEqual(counts.activeConnections);
  });

  it('lists this database\'s sessions with their state and wait event', async () => {
    // The transaction holds one pooled connection open while the list is read on another, so
    // that connection is listed as idle in a transaction, waiting for the client.
    const sessions = await prisma.$transaction(async tx => {
      const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
      return { pid, listed: await getDatabaseSessions(100) };
    });
    const held = sessions.listed.find(s => s.pid === sessions.pid);
    expect(held).toEqual({ pid: sessions.pid, state: 'idle in transaction', waitEvent: 'ClientRead', secondsInState: expect.any(Number) });
    expect(held?.secondsInState).toBeGreaterThanOrEqual(0);
  });

  it('limits the session list', async () => {
    expect((await getDatabaseSessions(1)).length).toBeLessThanOrEqual(1);
  });

  it('runs pg_sleep through $executeRaw: every concurrent query succeeds', async () => {
    expect(await runConcurrentSleeps(5, 0.01)).toEqual({ attempted: 5, successful: 5, failed: 0, firstError: null });
  });
});

describe('the admin health check actions', () => {
  it('testDatabaseConnection creates, reads, updates and deletes a row and reports the version', async () => {
    const result = await testDatabaseConnection();
    expect(result.error).toBeNull();
    expect(result.success).toBe(true);
    expect(result.data.databaseInfo).toMatch(/^PostgreSQL \d+/);
    expect(await prisma.healthCheck.count()).toBe(0);
  });

  it('testDatabaseConnectionPool succeeds with no failed queries', async () => {
    const result = await testDatabaseConnectionPool();
    expect(result.error).toBeNull();
    expect(result.data?.concurrentTest).toEqual(expect.objectContaining({ attempted: 20, failed: 0, firstError: null, successRate: 100 }));
    expect(result.data?.connectionPoolStatus.maxConnections).toBeGreaterThan(0);
    expect(result.data?.topProcesses.length).toBeGreaterThan(0);
  });
});
