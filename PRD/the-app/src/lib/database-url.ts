/**
 * The app runs on PostgreSQL only (issue #1, step 2). Every PrismaClient in the app, the scripts
 * and the seed gets its URL from here, so a missing URL or one left pointing at the old MySQL
 * server fails at start-up with a message naming the problem. The URL itself is never put in a
 * message: it carries the database password.
 */

const POSTGRES_SCHEMES = new Set(['postgresql', 'postgres']);

/** Returns `url` when it is a postgresql:// or postgres:// URL; otherwise throws, naming `envName`. */
export function requirePostgresUrl(url: string | undefined, envName: string): string {
  if (url === undefined || url.trim() === '') {
    throw new Error(`${envName} is not set. It must be a postgresql:// URL.`);
  }
  // Only the scheme is read and named: the rest of the URL holds the password.
  const scheme = /^([a-z][a-z0-9+.-]{0,20}):\/\//i.exec(url)?.[1];
  if (scheme === undefined) {
    throw new Error(`${envName} does not start with a URL scheme. It must be a postgresql:// URL.`);
  }
  if (!POSTGRES_SCHEMES.has(scheme)) {
    throw new Error(`${envName} is a ${scheme}:// URL. This app runs on PostgreSQL only and needs a postgresql:// URL.`);
  }
  return url;
}

/** `DATABASE_URL`, checked: the URL every PrismaClient in the app and the scripts connects with. */
export function databaseUrl(): string {
  return requirePostgresUrl(process.env.DATABASE_URL, 'DATABASE_URL');
}
