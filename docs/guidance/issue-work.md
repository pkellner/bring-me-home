# Issue work: this repo's mechanics

The commands `~/repos/agent-guidance/shared/issues-and-prs.md` asks each repo for. Written
2026-11-11 for issue #1 from the op's answers that day (base branch `dev`, prefix `macbookm4`).
Paths are from the repo root; the app is `PRD/the-app/`, and every `npm` command runs there.

## Machines and prefixes

| Machine | Prefix | Chip |
| --- | --- | --- |
| MacBookM4 | `macbookm4` | Apple M4 Max |

Another machine asks the op for its prefix and adds its row here.

## Worktrees

- Primary checkout: `~/repos/bring-me-home-wt/bring-me-home` (stays on `main`). Worktrees sit
  beside it: `~/repos/bring-me-home-wt/<prefix>-issue-<N>-<part>-<slug>`.
- Setup of a new worktree, from its root:
  1. `cp ../bring-me-home/PRD/the-app/.env PRD/the-app/.env` (untracked; never committed).
  2. `cd PRD/the-app && npm ci && npx prisma generate`.
  3. Its own port base (below).

## Local database

- One local database (op, 2026-11-11: "this is a rarely used site. I want to keep it simple ...
  one local db is enough"): `bring_me_home` on Postgres.app, `localhost:5432`, owned by role
  `bring_me_home` (generated password). Its URL is `LOCAL_POSTGRES_URL` in the primary checkout's
  `PRD/the-app/.env`. Read the name, never print the value. Tests, the rehearsal and the preview
  all use it, one at a time; each starts by resetting it.
- Production data reaches this Mac only as a dump the op takes (op, 2026-11-11). Dumps are kept
  gzipped with SHA-256 files in `~/backups/bring-me-home` (mode 600), never in a repo.
  Hosted credentials (Coolify's `DATABASE_URL` for each app) stay in Coolify, never in a local file.

## Test ports

Jest opens no ports. The app server and Playwright use one base per worktree:
`PORT=<base> npm run dev` (or `npm run start`) and `PLAYWRIGHT_BASE_URL=http://localhost:<base>`.
The primary checkout uses 3000; worktree number *n* (in creation order on this machine) uses
`3100 + 10*n`. The worktree's Started comment names its base.

## Tests

Kinds: **unit** and **component** (Jest, `*.test.ts(x)`, jsdom, Prisma mocked), **db** (Jest
against the local Postgres in `LOCAL_POSTGRES_URL`, `*.db.test.ts`, added by issue #1),
**browser** (Playwright, `e2e/`, desktop and phone projects).

- Targeted run: `npx jest <files>` for the touched test files, then `npm run build` (the app's
  rule: zero warnings) and `npx tsc --noEmit` when types changed.
- Fast suite: `npm run test:unit` plus `npm run build`. Duration on MacBookM4: not measured yet;
  record it here after its first run.
- Smoke set: `npm run build`.
- Lock: `mkdir /private/tmp/claude-501/bring-me-home-tests.lock` (remove in a trap); log of holds
  in `/private/tmp/claude-501/bring-me-home-tests.lock.log`, one JSON line per hold.
- No per-change measurement check exists in this repo yet.

## Preview

The base branch's future, on sample data, beside the live app: in the merge-test worktree,
`DATABASE_URL=$LOCAL_POSTGRES_URL`, `npx prisma migrate reset --force` (local Postgres only), `npm run db:seed`, `npm run build`,
`PORT=3900 npm run start`, email worker not started, `EMAIL_PROVIDER=log` and
`EMAIL_CHECK_INTERVAL=0`. Address: http://localhost:3900. It never points at a hosted database.

## Live steps

`dev` deploys nowhere, so merging into `dev` has no live step. Production is a `dev` → `main` merge
on the op's go; Coolify then builds `main`. Database changes on production are applied by hand
with `npx prisma migrate deploy` against the production URL held in Coolify, on the op's go.
Issue #1's cutover has its own runbook (`PRD/the-app/docs/POSTGRES_CUTOVER.md`, added by that issue).
