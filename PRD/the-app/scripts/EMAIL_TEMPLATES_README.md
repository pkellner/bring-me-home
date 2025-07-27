# Email Templates Management

This directory contains scripts for managing email templates independently from the main database seeding process.

## Overview

Email templates are now centrally managed in `/src/config/email-templates.ts`. This allows for:
- Consistent template definitions across the application
- Easy updates without modifying the main seed file
- Independent seeding of email templates
- Version control of email template changes

## Available Scripts

### 1. Seed Email Templates
```bash
npx tsx scripts/seed-email-templates.ts
```
This script:
- Reads email templates from the configuration file
- Creates new templates that don't exist in the database
- Updates existing templates with any changes
- Shows a summary of created/updated templates

### 2. Verify Email Templates
```bash
npx tsx scripts/verify-email-templates.ts
```
This script:
- Compares templates in the configuration with those in the database
- Identifies missing templates in the database
- Finds orphaned templates (in DB but not in config)
- Detects differences in existing templates
- Provides actionable feedback

### 3. Check Email Templates (existing)
```bash
npx tsx scripts/check-email-templates.ts
```
Lists all email templates currently in the database.

### 4. List Email Templates (existing)
```bash
npx tsx scripts/list-email-templates.ts
```
Simple script to list email template names.

## Email Template Structure

Each email template in `/src/config/email-templates.ts` contains:
- `name`: Unique identifier for the template
- `subject`: Email subject with variable placeholders (e.g., `{{personName}}`)
- `htmlContent`: HTML version of the email
- `textContent`: Plain text version of the email
- `variables`: Object documenting available template variables
- `isActive`: Whether the template is active (optional, defaults to true)
- `trackingEnabled`: Whether to track email opens (optional, defaults to false)
- `webhookUrl`: Optional webhook URL for email events
- `webhookHeaders`: Optional webhook headers

## Adding a New Email Template

1. Add the template to `/src/config/email-templates.ts`:
```typescript
{
  name: 'new_template_name',
  subject: 'Email Subject with {{variables}}',
  htmlContent: `<html>...</html>`,
  textContent: `Plain text version...`,
  variables: {
    variableName: 'Description of variable',
    // ... other variables
  },
  isActive: true
}
```

2. Run the seed script to add it to the database:
```bash
npx tsx scripts/seed-email-templates.ts
```

3. Verify it was added correctly:
```bash
npx tsx scripts/verify-email-templates.ts
```

## Updating Email Templates

1. Modify the template in `/src/config/email-templates.ts`
2. Run the seed script to update the database:
```bash
npx tsx scripts/seed-email-templates.ts
```
3. Changes will be automatically applied to the database

## Best Practices

1. **Always verify after changes**: Run the verify script to ensure database and config are in sync
2. **Test locally first**: Update templates in development before production
3. **Document variables**: Clearly document all template variables in the `variables` object
4. **Maintain both versions**: Always provide both HTML and plain text versions
5. **Use consistent naming**: Follow the existing naming convention (snake_case)

## Troubleshooting

If templates are out of sync:
1. Run `npx tsx scripts/verify-email-templates.ts` to identify differences
2. Run `npx tsx scripts/seed-email-templates.ts` to sync templates
3. For orphaned templates in the database, manually remove them if needed

## Integration with Main Seed

The main database seed (`prisma/seed.ts`) now imports templates from the configuration file, ensuring consistency across all seeding operations.