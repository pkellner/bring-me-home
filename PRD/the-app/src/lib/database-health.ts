/**
 * PostgreSQL health queries, shared by the admin health check, the System page, the
 * connection-stats route and the connection scripts. Connections are counted for this database
 * only (`current_database()`); `max_connections` is the whole server's limit, which the shared
 * server's other databases also use.
 */
import { prisma } from './prisma';

/** One server session connected to this database, from `pg_stat_activity`. */
export type DatabaseSession = {
  pid: number;
  /** active, idle, idle in transaction, ...; null for another role's session. */
  state: string | null;
  /** What it is waiting on (ClientRead, Lock, ...), or null. */
  waitEvent: string | null;
  /** Seconds since its state last changed, or null when the server does not say. */
  secondsInState: number | null;
};

export type ConnectionCounts = {
  /** Client sessions connected to this database, every pool and tool included. */
  activeConnections: number;
  /** The server's `max_connections`, shared by every database on it. */
  maxConnections: number;
};

export type ConcurrentQueryResult = {
  attempted: number;
  successful: number;
  failed: number;
  /** The first failure's message, so a failing pool is visible, not just counted. */
  firstError: string | null;
};

/** "PostgreSQL 18.6", from the server the app is connected to. */
export async function getDatabaseVersion(): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ version: string }>>`
    SELECT current_setting('server_version') AS version
  `;
  return `PostgreSQL ${rows[0].version}`;
}

export async function getConnectionCounts(): Promise<ConnectionCounts> {
  const rows = await prisma.$queryRaw<Array<ConnectionCounts>>`
    SELECT
      (SELECT COUNT(*)::int FROM pg_stat_activity
        WHERE datname = current_database() AND backend_type = 'client backend') AS "activeConnections",
      current_setting('max_connections')::int AS "maxConnections"
  `;
  return rows[0];
}

/** This database's sessions, longest in their current state first. */
export async function getDatabaseSessions(limit: number): Promise<DatabaseSession[]> {
  return prisma.$queryRaw<Array<DatabaseSession>>`
    SELECT
      pid,
      state,
      wait_event AS "waitEvent",
      FLOOR(EXTRACT(EPOCH FROM (now() - state_change)))::int AS "secondsInState"
    FROM pg_stat_activity
    WHERE datname = current_database() AND backend_type = 'client backend'
    ORDER BY state_change ASC NULLS LAST
    LIMIT ${limit}
  `;
}

/**
 * Runs `count` queries of `pg_sleep(seconds)` at once, so they need that many pooled connections
 * together. `pg_sleep` returns `void`, which `$queryRaw` cannot read, so it runs as `$executeRaw`.
 * Every failure is logged; the first one's message is returned.
 */
export async function runConcurrentSleeps(count: number, seconds: number): Promise<ConcurrentQueryResult> {
  const outcomes = await Promise.all(
    Array.from({ length: count }, () =>
      prisma.$executeRaw`SELECT pg_sleep(${seconds})`.then(
        () => null,
        (error: unknown) => {
          console.error('Connection pool test: a concurrent query failed:', error);
          return error instanceof Error ? error.message : String(error);
        },
      ),
    ),
  );
  const errors = outcomes.filter((outcome): outcome is string => outcome !== null);
  return {
    attempted: count,
    successful: count - errors.length,
    failed: errors.length,
    firstError: errors[0] ?? null,
  };
}

/** `connection_limit` / `pool_timeout` from DATABASE_URL, or null when the URL does not set them. */
export function poolSettingsFromUrl(url: string | undefined): { connectionLimit: number | null; poolTimeout: number | null } {
  const read = (name: string) => {
    const match = url?.match(new RegExp(`[?&]${name}=(\\d+)`));
    return match ? parseInt(match[1], 10) : null;
  };
  return { connectionLimit: read('connection_limit'), poolTimeout: read('pool_timeout') };
}
