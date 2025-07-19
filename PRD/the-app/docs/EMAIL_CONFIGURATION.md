# Email Configuration Guide

## Overview

All email addresses in the Bring Me Home application are centrally managed through a TypeScript-safe configuration system. This ensures consistency and makes it easy to update email addresses without searching through the codebase.

## Email Types

The application uses four types of email addresses:

| Type | Environment Variable | Default Value | Purpose |
|------|---------------------|---------------|---------|
| `SUPPORT` | `ADMIN_EMAIL` | `support@example.com` | General support and admin contact |
| `HELP` | `HELP_EMAIL` | `help-me-list-someone@bring-me-home.com` | Families requesting profile listings |
| `PRIVACY` | `PRIVACY_EMAIL` | `privacy@bring-me-home.com` | Privacy-related inquiries |
| `CONDUCT` | `CONDUCT_EMAIL` | `conduct@bring-me-home.com` | Code of conduct violations |

## Configuration Files

### Core Configuration
- **Location**: `/src/config/emails.ts`
- **Purpose**: Central source of truth for all email configurations
- **Features**:
  - TypeScript-safe email types
  - Default values
  - Environment variable mappings
  - Helper functions

### Usage in Server Components

```typescript
import { EMAIL_TYPES, getEmail } from '@/config/emails';

// Get a specific email
const supportEmail = getEmail(EMAIL_TYPES.SUPPORT);
const helpEmail = getEmail(EMAIL_TYPES.HELP);

// Get all emails
const allEmails = getAllEmails();
```

### Usage in Client Components

```typescript
import { getEmailConfig, EMAIL_TYPES, getEmailFromConfig } from '@/lib/email-config';

// In an async component or useEffect
const emailConfig = await getEmailConfig();
const supportEmail = getEmailFromConfig(emailConfig, EMAIL_TYPES.SUPPORT);
```

## Setting Email Addresses

### Environment Variables

Add these to your `.env` file:

```env
# Contact Email Addresses
ADMIN_EMAIL="your-support@yourdomain.com"
HELP_EMAIL="help@yourdomain.com"
PRIVACY_EMAIL="privacy@yourdomain.com"
CONDUCT_EMAIL="conduct@yourdomain.com"
```

### Default Values

If environment variables are not set, the system will use the default values defined in `/src/config/emails.ts`.

## Adding New Email Types

To add a new email type:

1. Add the type to `EMAIL_TYPES` in `/src/config/emails.ts`:
   ```typescript
   export const EMAIL_TYPES = {
     // ... existing types
     NEW_TYPE: 'newtype',
   } as const;
   ```

2. Add the default value:
   ```typescript
   const DEFAULT_EMAILS: Record<EmailType, string> = {
     // ... existing emails
     [EMAIL_TYPES.NEW_TYPE]: 'newtype@bring-me-home.com',
   };
   ```

3. Add the environment variable name:
   ```typescript
   const ENV_VAR_NAMES: Record<EmailType, string> = {
     // ... existing mappings
     [EMAIL_TYPES.NEW_TYPE]: 'NEW_TYPE_EMAIL',
   };
   ```

4. Add a description:
   ```typescript
   export const EMAIL_DESCRIPTIONS: Record<EmailType, string> = {
     // ... existing descriptions
     [EMAIL_TYPES.NEW_TYPE]: 'Description of what this email is for',
   };
   ```

5. Update the public config in `/src/app/actions/config.ts` if needed.

## Testing Email Configuration

Run the test script to verify email configuration:

```bash
npx tsx scripts/test-email-config.ts
```

## Generating .env.example Content

To generate the email section for `.env.example`:

```bash
npx tsx scripts/generate-email-env-example.ts
```

## Best Practices

1. **Always use the centralized configuration** - Never hardcode email addresses
2. **Use TypeScript types** - Always use `EMAIL_TYPES` constants instead of strings
3. **Document new emails** - Add descriptions for any new email types
4. **Test changes** - Run the test script after making changes
5. **Update .env.example** - Keep the example file up to date

## Migration from Hardcoded Emails

If you find any hardcoded email addresses in the codebase:

1. Add the email type to the central configuration
2. Replace the hardcoded value with `getEmail(EMAIL_TYPES.YOUR_TYPE)`
3. Update any client components to use the email config helpers
4. Test the changes
5. Update documentation