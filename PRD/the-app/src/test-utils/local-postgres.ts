/**
 * The db tests (`*.db.test.ts`, `npm run test:db`) run real queries against the one local
 * Postgres database, `bring_me_home` on this machine (docs/guidance/issue-work.md). Before anything
 * touches a database, the URL must point at localhost and that database name: a hosted or
 * production URL is refused, whatever its scheme. Messages never include the URL (it holds the
 * password).
 */
import { execFileSync } from 'child_process';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import { requirePostgresUrl } from '../lib/database-url';

export const LOCAL_TEST_DATABASE = 'bring_me_home';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const APP_ROOT = path.resolve(__dirname, '../..');

/** Returns `url` when it is a postgresql:// URL to `bring_me_home` on this machine; else throws, naming `envName`. */
export function requireLocalTestDatabaseUrl(url: string | undefined, envName: string): string {
  requirePostgresUrl(url, envName);
  let parsed: URL;
  try {
    parsed = new URL(url as string);
  } catch {
    throw new Error(`${envName} cannot be parsed as a URL; the db tests need the local ${LOCAL_TEST_DATABASE} database.`);
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(`${envName} does not point at localhost; the db tests run only against the local ${LOCAL_TEST_DATABASE} database.`);
  }
  if (decodeURIComponent(parsed.pathname.replace(/^\//, '')) !== LOCAL_TEST_DATABASE) {
    throw new Error(`${envName} does not name the database ${LOCAL_TEST_DATABASE}; the db tests run only against it.`);
  }
  return url as string;
}

/**
 * Applies every migration the local database lacks (`prisma migrate deploy`, which never drops
 * anything). Prisma refuses `migrate reset` when an AI agent runs it, so the tests do not reset the
 * schema; a database that has drifted from the migrations makes this fail, and is reset by hand.
 */
export function applyMigrations(url: string): void {
  const localUrl = requireLocalTestDatabaseUrl(url, 'LOCAL_POSTGRES_URL');
  try {
    execFileSync(process.execPath, [path.join(APP_ROOT, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: APP_ROOT,
      env: { ...process.env, DATABASE_URL: localUrl, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
      stdio: 'pipe',
    });
  } catch (error) {
    const output = error as { stdout?: Buffer; stderr?: Buffer };
    throw new Error(
      `prisma migrate deploy failed on the local ${LOCAL_TEST_DATABASE} database:\n` +
      `${output.stdout?.toString() ?? ''}${output.stderr?.toString() ?? ''}`,
    );
  }
}

/** Empties every table except Prisma's migration history, so each test starts from no rows. */
export async function emptyAllTables(prisma: PrismaClient): Promise<void> {
  requireLocalTestDatabaseUrl(process.env.DATABASE_URL, 'DATABASE_URL');
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) {
    throw new Error(`The local ${LOCAL_TEST_DATABASE} database has no tables: the migrations were not applied.`);
  }
  const list = tables.map(({ tablename }) => `"public"."${tablename.replace(/"/g, '""')}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}
