# Production Migration Fix Guide

## Issue Summary
When restoring a production database to local development, the `20250720152821_add_password_reset_tokens` migration fails because the `password_reset_tokens` table already exists in the production database, but the migration is not marked as applied in the `_prisma_migrations` table.

## Steps to Fix on Production

### 1. First, check the current state on production:

```bash
# Check if the password_reset_tokens table exists
mysql -u[username] -p -h [host] [database_name] -e "SHOW TABLES LIKE 'password_reset_tokens';"

# Check the migration status in _prisma_migrations
mysql -u[username] -p -h [host] [database_name] -e "SELECT * FROM _prisma_migrations WHERE migration_name = '20250720152821_add_password_reset_tokens'\G"

# Check current migration status
npx prisma migrate status
```

### 2. Based on what you find:

#### Scenario A: Table exists but migration shows as failed (most likely)
If the table exists and the migration shows `finished_at: NULL` with an error, run:

```bash
npx prisma migrate resolve --applied "20250720152821_add_password_reset_tokens"
```

This tells Prisma that the migration has already been applied (the table exists).

#### Scenario B: Table doesn't exist (unlikely)
If the table doesn't exist, simply run:

```bash
npx prisma migrate deploy
```

This will create the table normally.

### 3. Verify everything is working:

```bash
# Check migration status
npx prisma migrate status

# Run deploy to ensure no pending migrations
npx prisma migrate deploy
```

## Important Notes

- **No data loss**: This process doesn't drop or recreate any tables
- **Safe operation**: We're only updating Prisma's migration tracking
- **Idempotent**: Running `migrate deploy` multiple times is safe
- **Always backup**: Even though this is safe, always have a recent backup before production changes

## Local Development Fix (Already Completed)

For reference, here's what was done locally:
1. Ran `npx prisma migrate resolve --applied "20250720152821_add_password_reset_tokens"`
2. Verified with `npx prisma migrate status` - showed "Database schema is up to date!"
3. Tested with `npx prisma migrate deploy` - showed "No pending migrations to apply"

## Root Cause
This issue occurs when:
1. A migration was created and applied manually or through a different deployment
2. The production database has the table, but the migration wasn't properly tracked
3. When restoring to local, Prisma tries to create a table that already exists

## Prevention
To prevent this in the future:
1. Always use `npx prisma migrate deploy` for production deployments
2. Never manually create tables that should be managed by Prisma
3. Keep migration history synchronized across environments