/**
 * The one form an email or username takes before it is stored or looked up.
 *
 * MySQL (utf8mb4_unicode_ci) compares text ignoring case and trailing spaces; Postgres compares
 * bytes. Storing and matching every email and username in this form makes both databases give
 * the same answer (issue #1, step 1). `src/lib/__tests__/normalize-identity-guard.test.ts` fails when a Prisma
 * call writes or matches an email or username without going through these functions.
 *
 * `trim()` removes every Unicode whitespace character at either end (spaces, tabs, newlines,
 * no-break spaces); `toLowerCase()` is locale-independent ("É" becomes "é"). Accents are kept:
 * "josé" and "jose" stay different, although MySQL's `utf8mb4_unicode_ci` treats them as equal.
 */

function requireString(value: unknown, functionName: string): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${functionName} expects a string, got ${value === null ? 'null' : typeof value}`);
  }
  return value;
}

/** Trim and lowercase. "" stays "": callers that store an optional email use normalizeOptionalEmail. */
export function normalizeEmail(email: string): string {
  return requireString(email, 'normalizeEmail').trim().toLowerCase();
}

/**
 * For optional email columns (`users.email`, `comments.email`): null, undefined, "" and
 * whitespace-only input all become null, so an empty form field never stores "".
 */
export function normalizeOptionalEmail(email: string | null | undefined): string | null {
  if (email === null || email === undefined) {
    return null;
  }
  const normalized = normalizeEmail(email);
  return normalized === '' ? null : normalized;
}

/** Trim and lowercase, for every username that is written. "" stays "" (validation rejects it). */
export function normalizeUsername(username: string): string {
  return requireString(username, 'normalizeUsername').trim().toLowerCase();
}

/**
 * For looking up an existing user by a typed username (login, the admin scripts): lowercase only.
 * Trimming waits until issue #1 step 0 shows that no stored username has surrounding spaces;
 * then this function's body becomes `normalizeUsername(username)`.
 */
export function normalizeUsernameForLookup(username: string): string {
  return requireString(username, 'normalizeUsernameForLookup').toLowerCase();
}
