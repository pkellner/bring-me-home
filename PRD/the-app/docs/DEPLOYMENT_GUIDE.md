# Production Deployment Guide

## Database Migration Strategy

### For Fresh Production Deployment

If deploying to a new production database:

```bash
# 1. Set production DATABASE_URL in environment
export DATABASE_URL="mysql://user:password@host:port/database"

# 2. Deploy all migrations
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate
```

### For Existing Production Database

If you already have data in production:

```bash
# 1. Create a backup first!
mysqldump -u user -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql

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
# MySQL backup
mysqldump -u root -p bring_me_home > backup_before_migration.sql
```

### 2. Test Migrations Locally
```bash
# Create a test database with production-like data
mysql -u root -p -e "CREATE DATABASE bring_me_home_test"
mysql -u root -p bring_me_home_test < production_backup.sql

# Test migrations
DATABASE_URL="mysql://root:password@localhost:3306/bring_me_home_test" npx prisma migrate deploy
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
MySQL doesn't support default values for TEXT columns. Use nullable columns instead:
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