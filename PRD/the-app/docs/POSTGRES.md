# PostgreSQL

The app runs on PostgreSQL only (issue #1, step 2). Prisma 6, provider `postgresql`, one baseline
migration (`prisma/migrations/*_postgres_baseline`). The MySQL databases are never dropped or
written (rule at the top of `CLAUDE.md`); the cutover runbook is `docs/POSTGRES_CUTOVER.md`
(issue #1 step 6).

## Creating the database (production and local)

Create the database with an ICU collation. MySQL's `utf8mb4_unicode_ci` sorted `apple, Banana,
cherry`; a Postgres database with a byte-order collation (`C`, or libc on `postgres:18-alpine`,
which uses musl) sorts `Banana, apple, cherry`, so every ascending sort on `name`, `firstName` or
`state` would put capitals first. ICU's root locale (`und`) sorts like MySQL did. Equality stays
byte-exact (a database's default collation is always deterministic), which is why emails and
usernames are normalised in code (`src/lib/normalize-identity.ts`), and why the admin searches use
`mode: 'insensitive'`.

As a superuser on the server (for production: `postgres-database-production` on Coolify, on the
op's go; the role's password is generated and stored only in Coolify's `DATABASE_URL`):

```sql
CREATE ROLE bring_me_home LOGIN PASSWORD '<generated>';
CREATE DATABASE bring_me_home OWNER bring_me_home TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'und';
```

`TEMPLATE template0` is required: a database can take a locale provider different from its
template's only when copied from `template0`. `LC_COLLATE` / `LC_CTYPE` come from the server's
defaults and are not used for sorting once the provider is ICU. On PostgreSQL 15 and later the
`public` schema belongs to the database owner, so `bring_me_home` can create its tables.

Check it (connected to `bring_me_home`):

```sql
SELECT datlocprovider, datlocale FROM pg_database WHERE datname = current_database();
-- i | und
SELECT string_agg(v, ', ' ORDER BY v) FROM (VALUES ('cherry'), ('Banana'), ('apple')) AS t(v);
-- apple, Banana, cherry
```

Then apply the schema: `DATABASE_URL=<that URL> npx prisma migrate deploy`.

## DATABASE_URL

- It must be a `postgresql://` or `postgres://` URL. The app (`src/lib/prisma.ts`), every script
  with its own client, the seed and the load tests take it through `databaseUrl()`
  (`src/lib/database-url.ts`): a missing URL or a `mysql://` one stops them at start-up with a
  message that names the problem and never prints the URL.
- `connection_limit=10` per pool (see `.env.example`). The server is shared with other apps'
  databases and its `max_connections` is 100 by default; the web app and the email worker
  (`npm run wait-for-email-all-accounts`, started beside `npm start` in the Dockerfile) each open
  their own pool. The old MySQL setting of 100 per pool could take every connection on the server.
  `/configs` → Test Connection Pool shows the live count against `max_connections`.

## The local database

One local database, `bring_me_home` on Postgres.app (`localhost:5432`), owned by the role
`bring_me_home`; its URL is `LOCAL_POSTGRES_URL` in `.env` (docs/guidance/issue-work.md in the repo
root). It was created with the statement above on 2026-11-11.

## db tests

`npm run test:db` (from `PRD/the-app`) runs the `*.db.test.ts` files against `LOCAL_POSTGRES_URL`
(`jest.db.config.mjs`: node environment, one file at a time, no Prisma mock). Before anything runs,
`src/test-utils/local-postgres.ts` refuses any URL that is not `bring_me_home` on localhost. The
global setup applies the migrations with `prisma migrate deploy` (it never drops anything), and each
test empties the tables. A local database that has drifted from the migrations makes the setup fail;
reset it by hand. Prisma refuses `prisma migrate reset` when an AI agent runs it, which is why the
tests do not reset the schema themselves.
