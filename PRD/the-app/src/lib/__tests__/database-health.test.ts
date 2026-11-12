/**
 * Issue #1 step 3: the PostgreSQL health helpers, with the database mocked. The real queries run
 * against the local Postgres in database-health.db.test.ts.
 */
import { prisma } from '@/lib/prisma';
import { poolSettingsFromUrl, runConcurrentSleeps } from '../database-health';

jest.mock('@/lib/prisma', () => ({ prisma: { $executeRaw: jest.fn(), $queryRaw: jest.fn() } }));

const executeRaw = prisma.$executeRaw as unknown as jest.Mock;

describe('runConcurrentSleeps', () => {
  beforeEach(() => {
    executeRaw.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('counts every query as successful when none fails', async () => {
    executeRaw.mockResolvedValue(1);
    expect(await runConcurrentSleeps(4, 0.1)).toEqual({ attempted: 4, successful: 4, failed: 0, firstError: null });
    expect(executeRaw).toHaveBeenCalledTimes(4);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('logs each failure and returns the first message instead of hiding it', async () => {
    executeRaw
      .mockResolvedValueOnce(1)
      .mockRejectedValueOnce(new Error('Timed out fetching a new connection from the connection pool'))
      .mockRejectedValueOnce(new Error('second failure'));
    const result = await runConcurrentSleeps(3, 0.1);
    expect(result).toEqual({
      attempted: 3, successful: 1, failed: 2,
      firstError: 'Timed out fetching a new connection from the connection pool',
    });
    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenCalledWith('Connection pool test: a concurrent query failed:', expect.any(Error));
  });

  it('reports a non-Error rejection as text', async () => {
    executeRaw.mockRejectedValueOnce('boom');
    expect((await runConcurrentSleeps(1, 0.1)).firstError).toBe('boom');
  });
});

describe('poolSettingsFromUrl', () => {
  it('reads connection_limit and pool_timeout', () => {
    expect(poolSettingsFromUrl('postgresql://u:p@h/db?connection_limit=10&pool_timeout=30&connect_timeout=30'))
      .toEqual({ connectionLimit: 10, poolTimeout: 30 });
  });

  it('gives null for a setting the URL leaves out', () => {
    expect(poolSettingsFromUrl('postgresql://u:p@h/db?pool_timeout=20')).toEqual({ connectionLimit: null, poolTimeout: 20 });
    expect(poolSettingsFromUrl('postgresql://u:p@h/db')).toEqual({ connectionLimit: null, poolTimeout: null });
    expect(poolSettingsFromUrl(undefined)).toEqual({ connectionLimit: null, poolTimeout: null });
  });

  it('does not read a setting out of the password or the path', () => {
    expect(poolSettingsFromUrl('postgresql://u:xconnection_limit=5@h/db')).toEqual({ connectionLimit: null, poolTimeout: null });
  });
});
