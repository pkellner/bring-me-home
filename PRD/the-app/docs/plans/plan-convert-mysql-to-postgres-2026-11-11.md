# Plan: move the app from MariaDB/MySQL to PostgreSQL, with the data

Written 2026-11-11. Status: plan only, nothing implemented.
Revised 2026-11-11 after a review raised five issues; all five were checked
against the code and confirmed. See "Review findings" at the end.

## In plain English

The app moves from the shared MariaDB server to the shared Postgres server. All
existing data is copied across, because a real person's page has many comments.
The code change is small, since almost everything goes through Prisma. The main
risk is not the copy: MariaDB ignores letter case when comparing text and
Postgres does not, so logins and comment-to-user matching must be made
case-exact first.

## Rules from the operator (2026-11-11)

- **The MySQL/MariaDB databases are never dropped, truncated or overwritten.**
  The server will be stopped one day; the data and its dumps are kept forever.
  (Also at the top of `CLAUDE.md`.)
- The new database lives on the existing shared Postgres server, beside the
  other apps' databases, with its own database and role.
- Casing is handled the way the photo album project did it: normalise in code
  (trim + lowercase), no `citext`.
- Login names may be fixed (lowercased).

## What the exploration established

- Production is **MariaDB**, not MySQL: Coolify resource
  `mariadb-database-production`. MariaDB stores `Json` columns as text.
- The Postgres server is Coolify resource `postgres-database-production`
  (uuid `l0w19ohgfcovh2fsms7vp0cq`, renamed 2026-11-11 from
  `photo-album-postgres`), `postgres:18-alpine`. Dev is Postgres.app on
  `localhost:5432`, labelled `postgres-database-dev`.
- Prisma 6.19, provider `mysql`, 31 MySQL-dialect migrations, 35 models.
- All ids are cuid strings: no sequences to reset.
- `mysql2` is in `package.json` but nothing imports it.
- Raw SQL exists in five files only:
  - `src/app/actions/health-check.ts` (`VERSION()`, `information_schema.processlist`,
    `SHOW VARIABLES`, `DATABASE()`, `SLEEP()`)
  - `src/app/api/debug/connection-stats/route.ts`
  - `scripts/monitor-db-connections.ts`, `scripts/test-connection-usage.ts`,
    `scripts/test-prisma-logging.ts`
- **Search is affected** (an earlier version of this plan said it was not;
  the search that claimed so was wrong). Three Prisma `contains` filters exist:
  - `src/app/actions/detention-centers.ts:420-422` (name, city, state)
  - `src/lib/email-suppression.ts:165-166` (email, reasonDetails)
  - `src/app/api/webhooks/ses/route.ts:214` (partial `messageId`)
  On MariaDB `texas` finds `Texas`; on Postgres it does not.
- **Not measured:** row counts, database size, image bytes in `image_storage`.
  Local MySQL was not running and production was not queried. Step 0 does this.

## The main risk: case sensitivity

- Login: `src/lib/auth.ts:46` looks up `username` as typed.
- Comment-to-user linking: `src/app/actions/comments.ts:278`, `:444`, `:760`,
  `:878`, `:988`, `:1105` look up `email` without lowercasing.
- Unique columns that stop catching case variants: `users.email`,
  `users.username`, `email_suppressions.email`,
  `comment_verification_tokens.email`.
- Lowercasing alone cannot create duplicates among existing unique values,
  because MariaDB's unique indexes already ignore case.
- **Trimming can.** `src/schemas/user.ts:4` accepts a username with leading
  spaces, and MariaDB's unique index treats `" alice"` and `"alice"` as
  different. Both collapse to `alice` under trim + lowercase. Trimming login
  input before the stored value is fixed would also lock out `" alice"`.
  So collisions are checked with the exact normalisation function (step 0),
  not assumed away.

## Steps

### 0. Measure production (read-only)

- Row counts per table, database size, size of `image_storage.data`.
- **Collision report, read-only, using the exact `normalizeEmail()` and
  `normalizeUsername()` functions from step 1** (the same code the copy uses):
  for `users.email`, `users.username`, `email_suppressions.email` and
  `comment_verification_tokens.email`, list every value the function changes
  and every group of rows that collapse to one value.
- Each collision is resolved by the operator before rollout (rename or merge
  the account through the admin user screen). The copy refuses to run while
  the report is not empty of collisions.
- NUL bytes in text columns (Postgres rejects them).
- `email_notifications` rows by status, to size the drain in step 7.

### 1. Case-exact lookups (ships first, still on MariaDB)

- Add `normalizeEmail()` and `normalizeUsername()` (trim + lowercase), tests first.
- The inventory is every file that reads or writes a user or a value-matched
  email, not a hand-picked list. Files that write users today:
  - `src/lib/auth.ts`
  - `src/app/actions/auth.ts`, `users.ts`, `comments.ts`,
    `email-notifications.ts` (`createMany` with `skipDuplicates`, `distinct: ['email']`),
    `email-verification.ts`, `update-user-email.ts`, `user-comments.ts`,
    `user-cleanup.ts`
  - **`src/app/api/profile/email/route.ts:63-78`**: checks uniqueness and
    stores the email exactly as submitted. Missed by the first version of
    this plan.
  - `src/app/api/profile/anonymous-comments/route.ts`,
    `src/app/api/auth/reset-password/request/route.ts`,
    `src/app/api/webhooks/email/route.ts`, `src/app/verify/comments/page.tsx`
  - `src/lib/email-suppression.ts`, `src/lib/email-opt-out-tokens.ts`
- A test fails the build if a new `prisma.user` write or email lookup appears
  outside the helpers' choke points.
- Order matters for trimming: login input is trimmed only after step 0's
  report shows no stored username or email with surrounding spaces.
  Lowercasing is harmless on MariaDB and can ship at once.
- Profile email updates, registration, login and comment linking are tested
  against a real local Postgres with mixed-case and space-padded input, not
  only against mocks.

### 2. Postgres only

- `prisma/schema.prisma` and `migration_lock.toml`: provider `postgresql`.
- Replace the 31 MySQL migrations with one Postgres baseline
  (`prisma migrate diff --from-empty`).
- Remove `mysql2`. A missing or non-`postgresql://` `DATABASE_URL` fails with a
  message that names the problem, never the URL.
- Stay on Prisma 6 for this change; a Prisma 7 upgrade is separate work.
- Lower `connection_limit` (the URL uses 100, which equals Postgres's default
  `max_connections`; the web app and the email processor each open a pool, and
  the server is shared).

### 2a. Case-insensitive search

- Add `mode: 'insensitive'` to the detention-center and suppression-list
  filters. Prisma only accepts `mode` on the `postgresql` provider, so this
  lands with step 2, not before.
- `src/app/api/webhooks/ses/route.ts:214`: confirm against stored
  `messageId` values whether case can differ; make it insensitive if it can.
- Tests: mixed-case searches (`texas` finds `Texas`) against real Postgres.
- Reference: https://docs.prisma.io/docs/orm/v6/prisma-client/queries/case-sensitivity

### 3. Raw SQL

- Health check and connection stats: `pg_stat_activity`,
  `current_setting('max_connections')`, `current_database()`, `pg_sleep()`.
- Port or delete the three scripts.

### 4. Admin interfaces

- Port the photo album project's `/admin/postgres` pages: overview (masked
  connection string, version, size, connections, per-table stats) and a
  per-table row browser.
- Site-admin only. Mask on the server, never send to the browser: password
  hashes, tokens and token hashes, `ssn`, `alienIdNumber`, sensitive
  `system_config` values.
- Fix existing screens: hardcoded "MySQL 8.0" at
  `src/app/admin/system/SystemDashboard.tsx:351` (show the live version); the
  pool panel in `src/components/configs/HealthCheckSection.tsx`.
- Walk every admin screen against converted data: comments, persons, users,
  roles, themes, towns, detention centers, email (queue, send, templates,
  suppression), system, person export/import.
- Check sorting on nullable columns: Postgres puts NULLs last ascending,
  MariaDB first.

### 5. Data copy

- One-off script, two Prisma clients: reads MariaDB through a **read-only
  database user**, writes Postgres table by table in foreign-key order.
- Applies the same `normalizeEmail()` / `normalizeUsername()` functions as the
  app (imported, not re-implemented); refuses to start if step 0's collision
  report is not clean.
- Refuses to start if any `email_notifications` row is `SENDING` (see step 7).
- Parses text-stored JSON; strips NUL bytes; copies images in small batches;
  keeps original `createdAt` / `updatedAt`.
- Verification: row counts per table, plus content hashes for comments,
  persons, stories and images on both sides.
- Re-runnable against an empty target; refuses a non-empty one.

### 6. Rehearsal

- Full copy into local Postgres, then Jest, Playwright and the admin
  walk-through. Repeat until it runs clean with no manual steps.
- Gives the measured downtime figure for the cutover.

### 7. Cutover (each live write is its own go from the operator)

**Before the day**

- Operator creates the `bring_me_home` database and its role on
  `postgres-database-production`; confirm backups cover it.
- Record the image tag of the last MariaDB build of the app and keep that
  image. Rehearse redeploying it with the MariaDB `DATABASE_URL`: this is the
  rollback, and it is tested before it is needed.

**Quiesce: stop writes and drain email**

Stopping the container is not enough. The worker marks rows `SENDING`, sends,
then records `SENT` (`src/email-processing-listen-for-new/main.ts:111-132`,
`:255`), and its shutdown handler exits without waiting for the batch in
flight (`:409-416`). A row can be delivered and still say `SENDING`; copied
as is, it would be sent again.

1. Close the site to public writes (comments, support, registration, profile
   edits). The mechanism is chosen and tested in the rehearsal.
2. Pause the email processor through its control row (`isPaused`), and stop
   every other sender: the admin send button, `scripts/process-email-queue.ts`,
   and the `/api/cron/send-emails` cron in `vercel.json` if it is live.
3. Wait for the batch in flight to finish: no `SENDING` row changes for a full
   check interval, and the processor log shows the batch completed.
4. Reconcile every row still `SENDING`: look its `messageId` and recipient up
   in the provider's records (SES/SendGrid). Delivered rows are marked `SENT`;
   undelivered rows go back to `QUEUED`. A row that cannot be proven either
   way is listed for the operator, who decides; the default is not to resend.
5. Only then stop the app container.

**Copy**

6. Final MariaDB dump, kept forever, stored off the database server.
7. Run the copy and its verification.

**Validate with writes and email still off**

8. Deploy the Postgres build with public writes closed and the email
   processor disabled (`EMAIL_CHECK_INTERVAL=0`, control row paused).
9. Check public pages, the admin walk-through and `/admin/postgres`.

**Open, which is the rollback cutoff**

10. Open public writes, then enable email.

**Rollback**

- **Before step 10:** redeploy the kept MariaDB image with the MariaDB
  `DATABASE_URL`. Nothing is lost, because Postgres has accepted no comment
  and sent no mail. Switching `DATABASE_URL` alone does not work: the Postgres
  build rejects a MySQL URL (step 2).
- **After step 10:** going back to the unchanged MariaDB loses every comment
  written since, and resends any mail sent since. Rollback after this point
  is fix-forward on Postgres, unless the operator accepts that loss or the
  new rows are first copied back by a reverse script that does not exist yet.

### 8. Clean up MySQL references (code, config and docs only)

- `.env.example`, `.env.production.example`, `jest.setup.js:90`.
- `CLAUDE.md`, `README.md`, `docs/DEPLOYMENT_GUIDE.md`,
  `docs/PRODUCTION_MIGRATION_FIX.md`, `docs/MY_SQL_NOTES.md`.
- `PRD/PRD.md`, `PRD/DATABASE_SCHEMA.md`, `PRD/CODE_EXAMPLES.md`,
  `PRD/IMPLEMENTATION_PLAN.md`, `PRD/IMPLEMENTATION_PLAN_UPDATE.md`.
- The MariaDB server, its data and the dumps stay.

## Problems found along the way (separate from the conversion)

- **`/api/debug/connection-stats` is public on production.** Checked
  2026-11-11: HTTP 200 without a login. The route has no session check and
  `src/proxy.ts` excludes `/api/`. It returns connection counts and the last 20
  tracked queries. Fix: require a site-admin session, or delete the route.
- `/api/test-env` has no session check in the code; it lists the names (not
  values) of AWS environment variables. Not tested live.
- `scripts/test-prisma-logging.ts:59` queries `FROM Person`; the table is `persons`.
- `prisma/seed.ts:3388` and `scripts/seed-email-templates.ts:26` pass
  `JSON.stringify(...)` into a `Json` column, storing a quoted string.

## Review findings, 2026-11-11 (all confirmed against the code)

| # | Finding | Where it is handled |
| --- | --- | --- |
| 1 (P1) | Rollback by switching `DATABASE_URL` cannot work on a Postgres-only build; no cutoff was defined | Step 7: kept image, rehearsed redeploy, cutoff at step 10 |
| 2 (P1) | Stopping the container does not prevent duplicate email | Step 7: pause, drain, reconcile `SENDING`; step 5 refuses `SENDING` rows |
| 3 (P1) | `/api/profile/email` missing from the normalisation inventory | Step 1: full inventory and a guard test |
| 4 (P2) | "Search is unaffected" was wrong | Exploration section corrected; step 2a |
| 5 (P2) | Trim can create collisions that case-insensitive uniqueness does not prevent | Step 0 collision report; steps 1 and 5 |

## Open decisions

- Whether the public debug route is fixed in step 1 or separately.
- The downtime window, once the rehearsal has measured it. It is longer than
  first described: it now covers the email drain and the validation with
  writes closed.
- How public writes are closed during the cutover (step 7.1).
- What to do with a `SENDING` email that cannot be proven delivered or not
  (default: do not resend).
