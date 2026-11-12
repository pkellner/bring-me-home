# AGENTS.md

General guidance for every repo: `~/repos/agent-guidance/shared/`, read in place (the op keeps that
checkout current with `git pull`; nothing is copied here). This repo's own guidance: this file and
`docs/guidance/`; edit it here. The app lives in `PRD/the-app/`, whose `CLAUDE.md` holds the app's
own working notes. Read "Branches and environments" below before any git, PR or deploy step.

## Branches and environments

- **Base branch for issue work: `dev`** (op, 2026-11-11, issue #1). Issue PRs merge into `dev`
  through an integration branch; `dev` deploys nowhere.
- **`main` is production.** Coolify app `pkellner/bring-me-home:main` builds `main` from
  `/PRD/the-app` (Dockerfile) and serves https://bring-me-home.com. A push to `main` is a production
  deploy: only on the op's go in the current task. Migrations are not applied by the build.
- `cache-2` is the Coolify app at https://cache2.bring-me-home.com (stopped as of 2026-11-11).
- Machine prefix and the commands for issue work: `docs/guidance/issue-work.md`.

## Rules for this repo

- Never drop, truncate, delete from or overwrite the MySQL/MariaDB databases (rule and the op's
  words at the top of `PRD/the-app/CLAUDE.md`). They are read only, by a read-only user.
- Live systems: `mariadb-database-production` and `postgres-database-production` on Coolify, the
  Coolify apps above, AWS S3/CloudFront/SES/SNS, SendGrid, Redis on the host. Tests mock all of
  them; local Postgres (Postgres.app, `localhost:5432`) is not live.
