# Production Deployment Guide

## Database Migration Strategy

### For Fresh Production Deployment

If deploying to a new production database:

```bash
# 1. Set production DATABASE_URL in environment
export DATABASE_URL="postgresql://user:password@host:5432/bring_me_home"

# 2. Deploy all migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate
```

### For Existing Production Database

If you already have data in production:

```bash
# 1. Create a backup first!
pg_dump -Fc -U user database_name > backup.dump

# 2. Check what migrations need to be applied
npx prisma migrate status

# 3. Deploy pending migrations
npx prisma migrate deploy
```

## Recent Schema Changes

The following changes were made:
1. Added `privateNoteToFamily` TEXT column to comments table (nullable)
2. Changed `showCityState` default from false to true

## Safe Deployment Practices

### 1. Always Backup First
```bash
# Postgres backup
pg_dump -Fc -U postgres bring_me_home > backup_before_migration.dump
```

### 2. Test Migrations Locally
```bash
# Create a test database with production-like data
createdb -U postgres bring_me_home_test
pg_restore -U postgres -d bring_me_home_test production_backup.dump

# Test migrations
DATABASE_URL="postgresql://postgres:password@localhost:5432/bring_me_home_test" npx prisma migrate deploy
```

### 3. Use Prisma Migrate in Production
```bash
# Never use `prisma migrate dev` in production
# Always use `prisma migrate deploy`
npx prisma migrate deploy
```

### 4. Handle Failed Migrations

If a migration fails in production:

```bash
# Option 1: Rollback and fix
# Restore from backup, fix migration file, redeploy

# Option 2: Manual fix (like we did in development)
# Apply fixes manually, then mark as resolved:
npx prisma migrate resolve --applied "migration_name"
```

## Environment Variables

Ensure these are set in production:
- `DATABASE_URL` - Production database connection
- `COMMENT_DELETE_DAYS_THRESHOLD` - Days before person admin can delete (default: 1)
- All other required environment variables from `.env.example`

## Verification Steps

After deployment:
1. Check migration status: `npx prisma migrate status`
2. Verify schema: `npx prisma db pull` (compares database to schema)
3. Test application functionality
4. Monitor error logs

## Rollback Plan

If issues occur:
1. Restore database from backup
2. Revert code deployment
3. Investigate and fix issues
4. Redeploy with fixes

## Common Issues

### TEXT Column Default Values
Keep optional text columns nullable rather than relying on an empty-string default:
```prisma
// ❌ Wrong
privateNoteToFamily String @default("") @db.Text

// ✅ Correct
privateNoteToFamily String? @db.Text
```

### Migration Drift
If schema drift occurs:
1. Use `prisma db pull` to see actual database state
2. Use `prisma migrate diff` to see differences
3. Create corrective migration if needed