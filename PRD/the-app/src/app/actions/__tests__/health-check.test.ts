/**
 * Issue #1 step 3: the admin pool check is built from the PostgreSQL helpers (mocked here; the
 * real queries run in database-health.db.test.ts) and reports a failure instead of hiding it.
 */
import { testDatabaseConnectionPool } from '../health-check';
import * as health from '@/lib/database-health';

jest.mock('@/lib/redis/redis-service', () => ({ redisHealthCheck: jest.fn() }));
jest.mock('@/lib/database-health', () => ({
  ...jest.requireActual('@/lib/database-health'),
  getConnectionCounts: jest.fn(),
  getDatabaseSessions: jest.fn(),
  getDatabaseVersion: jest.fn(),
  runConcurrentSleeps: jest.fn(),
}));

const mocked = health as jest.Mocked<typeof health>;

describe('testDatabaseConnectionPool', () => {
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    mocked.getConnectionCounts.mockResolvedValue({ activeConnections: 25, maxConnections: 100 });
    mocked.getDatabaseSessions.mockResolvedValue([{ pid: 9, state: 'active', waitEvent: null, secondsInState: 0 }]);
    mocked.runConcurrentSleeps.mockResolvedValue({ attempted: 20, successful: 19, failed: 1, firstError: 'pool timeout' });
  });
  afterEach(() => {
    process.env.DATABASE_URL = originalUrl;
    jest.restoreAllMocks();
  });

  it('reports the counts, the sessions and the concurrent test with its first error', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost/db?connection_limit=10&pool_timeout=30';
    const result = await testDatabaseConnectionPool();
    expect(result.success).toBe(true);
    expect(result.data?.connectionPoolStatus).toEqual({
      activeConnections: 25, maxConnections: 100, utilizationPercent: 25, connectionLimit: 10, poolTimeout: 30,
    });
    expect(result.data?.concurrentTest).toEqual({
      attempted: 20, successful: 19, failed: 1, firstError: 'pool timeout', successRate: 95,
    });
    expect(result.data?.topProcesses).toEqual([{ pid: 9, state: 'active', waitEvent: null, secondsInState: 0 }]);
    expect(mocked.getDatabaseSessions).toHaveBeenCalledWith(5);
    expect(mocked.runConcurrentSleeps).toHaveBeenCalledWith(20, 0.1);
  });

  it('names Prisma\'s defaults when DATABASE_URL sets no pool options', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost/db';
    const result = await testDatabaseConnectionPool();
    expect(result.data?.connectionPoolStatus.connectionLimit).toBe('Default (2 × CPU cores + 1)');
    expect(result.data?.connectionPoolStatus.poolTimeout).toBe('Default (10s)');
  });

  it('returns the error and logs it when a query fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mocked.getConnectionCounts.mockRejectedValue(new Error('permission denied for pg_stat_activity'));
    const result = await testDatabaseConnectionPool();
    expect(result).toEqual({ success: false, data: null, error: 'permission denied for pg_stat_activity' });
    expect(console.error).toHaveBeenCalledWith('Connection pool test failed:', expect.any(Error));
  });
});
