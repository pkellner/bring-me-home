# Cutover from MySQL to PostgreSQL (issue #1)

The production app moves from the MySQL 8.0 server to a new database `bring_me_home` on the
Coolify resource `postgres-database-production`. The data comes from the op's final dump of
2026-11-11 (the op: "this is the final dump. there are no files changing"), so there is no write
freeze, no second dump and no email drain: load, check, switch.

**Every step marked LIVE is a write to a live system and is done only on the op's own go for that
step.** No URL, address or password goes into this file, a commit, an issue or a log. The MySQL
server and its data are never dropped, truncated or written (rule at the top of `CLAUDE.md`).

## Before the day

- `dev` holds the Postgres code (steps 1-6 of issue #1) and has passed the preview. Nothing is
  merged into `main` yet: a push to `main` is the production deploy.
- The dump is on the op's Mac; check it against its kept SHA-256 (`shasum -a 256 <dump.sql>`).
- Measured on MacBookM4 with this dump and the local Postgres (2026-11-12): empty the database
  0.3 s, `prisma migrate deploy` 0.8 s, copy 0.2 s, verification 0.1 s, the whole command 0.5 s.
  Over the network to production expect seconds (about 100 round trips and 4 MB); not measured.
  The site keeps running on MySQL during steps 1-3, so they cost no downtime. The downtime is the
  build and switch of step 5; not measured.

## 1. Create the role and the database (LIVE, the op)

On `postgres-database-production`, as its superuser, with a newly generated password stored only
in Coolify:

```sql
CREATE ROLE bring_me_home LOGIN PASSWORD '<generated>';
CREATE DATABASE bring_me_home OWNER bring_me_home TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'und';
```

Check it, connected to `bring_me_home` (`docs/POSTGRES.md` explains why ICU):

```sql
SELECT datlocprovider, datlocale FROM pg_database WHERE datname = current_database();  -- i | und
SELECT string_agg(v, ', ' ORDER BY v) FROM (VALUES ('cherry'), ('Banana'), ('apple')) AS t(v);  -- apple, Banana, cherry
```

The URL is `postgresql://bring_me_home:<password>@<host>:5432/bring_me_home?connection_limit=10&pool_timeout=30&connect_timeout=30`.
Steps 2 and 3 run from the op's Mac, which needs a route to the server: an SSH tunnel to the
Coolify host, or Coolify's public port for the database turned on for these steps and off after
(the op's choice; LIVE if the port is changed).

## 2. Apply the schema (LIVE, the op)

On the op's Mac, in a checkout of `dev` at the commit that will be merged, from `PRD/the-app`.
Put the URL in the shell's environment without echoing it or saving it in the history:

```sh
read -rs PROD_POSTGRES_URL && export PROD_POSTGRES_URL
DATABASE_URL="$PROD_POSTGRES_URL" npx prisma migrate deploy
```

Expected: one migration applied, `..._postgres_baseline`.

## 3. Copy the dump and verify it (LIVE, the op)

```sh
npx tsx scripts/postgres-move/copy-dump-to-postgres.ts <dump.sql> --target-url-env PROD_POSTGRES_URL
```

The script refuses, writing nothing (exit 2), when the dump was cut off, when an email or username
would collide once normalised, when an email is `QUEUED` or `SENDING`, when text holds a NUL byte,
when the tables differ from the schema, or when the target already has rows. It writes every
table in one transaction (a failure leaves the database empty, and the same command runs again),
then compares every row of every table with the dump. It prints counts only.

Expected, for the 2026-11-11 dump: `Copied 1349 rows into 31 tables`, then
`Verified: 31 tables, 1349 rows, every row equal to the dump`, exit 0. `audit_log` (165 rows),
`email_processor_logs` (779) and `health_checks` (0) stay empty (the op: log rows are not copied),
and `_prisma_migrations` keeps only the baseline row. Any other result: stop; the site is still on
MySQL and nothing has changed for it.

Emails: the dump holds no `QUEUED` or `SENDING` email and no `FAILED` email with retries left
(step 0), so the new email worker sends nothing old.

## 4. Record the rollback image (the op)

In Coolify, app `pkellner/bring-me-home:main`: note the image tag of the deployment running now
(the last MySQL build), from the app's Rollback list. Keep the current MySQL `DATABASE_URL`
value somewhere private: the rollback needs it.

## 5. Switch and deploy (LIVE, the op)

1. In Coolify, set the app's `DATABASE_URL` to the Postgres URL of step 1. It must be set
   **before** the build: Coolify passes it at build time, and the Postgres build refuses a MySQL
   URL. Do not restart the running app: the MySQL build refuses a Postgres URL, so steps 1 and 2
   follow each other without a pause.
2. Merge `dev` into `main` and push. Coolify builds `main` and deploys it.

## 6. Check the site (the op)

On https://bring-me-home.com:

- the home page lists the towns; a town page lists its people;
- a person's page shows its comments and photos; an image loads (`/api/images/<id>`);
- `/admin` shows the sign-in page; after signing in, the admin lists (users, comments, emails)
  show the same counts as before; `/admin/system` names PostgreSQL;
- `/configs` → Test Connection Pool reports the pool against `max_connections`;
- the app's logs show no database errors, and the email worker starts without sending.

## Rollback (LIVE, the op)

In Coolify, set `DATABASE_URL` back to the MySQL URL, then roll back to the image tag of step 4.
The MySQL data was never touched. Anything written on Postgres after step 5 (a new comment, a
new user) is not in MySQL: rolling back drops it from the site, while it stays in Postgres.
