# Email Configuration Guide

This comprehensive guide covers all aspects of email configuration in the Bring Me Home application, including email addresses, providers, and batch processing.

## Table of Contents

- [Overview](#overview)
- [Email Address Configuration](#email-address-configuration)
  - [Email Types](#email-types)
  - [Configuration Files](#configuration-files)
  - [Setting Email Addresses](#setting-email-addresses)
  - [Adding New Email Types](#adding-new-email-types)
- [Email Provider Configuration](#email-provider-configuration)
  - [Supported Email Providers](#supported-email-providers)
  - [Provider Setup](#provider-setup)
    - [Console (Default)](#console-default)
    - [SMTP](#smtp)
    - [SendGrid](#sendgrid)
    - [AWS SES](#aws-ses)
- [Batch Email Processing](#batch-email-processing)
  - [Configuration](#configuration)
  - [Docker Integration](#docker-integration)
  - [Monitoring](#monitoring)
  - [Email Processor Control and Logging](#email-processor-control-and-logging)
- [Testing Email Functionality](#testing-email-functionality)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Migration Guide](#migration-guide)

## Overview

The Bring Me Home application uses email for:
- Password reset functionality
- Admin notifications and user communications
- Contact emails displayed throughout the site

The email system features:
- **Centralized Configuration**: All email addresses managed in one place
- **Multiple Provider Support**: Console, SMTP, SendGrid, AWS SES
- **Batch Processing**: Efficient handling of multiple emails
- **TypeScript Safety**: Type-safe email configuration
- **Flexible Deployment**: Works in development and production

## Email Address Configuration

### Email Types

The application uses four types of email addresses:

| Type | Environment Variable | Default Value | Purpose |
|------|---------------------|---------------|---------|
| `SUPPORT` | `ADMIN_EMAIL` | `support@example.com` | General support and admin contact |
| `HELP` | `HELP_EMAIL` | `help-me-list-someone@bring-me-home.com` | Families requesting profile listings |
| `PRIVACY` | `PRIVACY_EMAIL` | `privacy@bring-me-home.com` | Privacy-related inquiries |
| `CONDUCT` | `CONDUCT_EMAIL` | `conduct@bring-me-home.com` | Code of conduct violations |

### Configuration Files

#### Core Configuration
- **Location**: `/src/config/emails.ts`
- **Purpose**: Central source of truth for all email configurations
- **Features**:
  - TypeScript-safe email types
  - Default values
  - Environment variable mappings
  - Helper functions

#### Usage in Server Components

```typescript
import { EMAIL_TYPES, getEmail } from '@/config/emails';

// Get a specific email
const supportEmail = getEmail(EMAIL_TYPES.SUPPORT);
const helpEmail = getEmail(EMAIL_TYPES.HELP);

// Get all emails
const allEmails = getAllEmails();
```

#### Usage in Client Components

```typescript
import { getEmailConfig, EMAIL_TYPES, getEmailFromConfig } from '@/lib/email-config';

// In an async component or useEffect
const emailConfig = await getEmailConfig();
const supportEmail = getEmailFromConfig(emailConfig, EMAIL_TYPES.SUPPORT);
```

### Setting Email Addresses

#### Environment Variables

Add these to your `.env` file:

```env
# Contact Email Addresses
ADMIN_EMAIL="your-support@yourdomain.com"
HELP_EMAIL="help@yourdomain.com"
PRIVACY_EMAIL="privacy@yourdomain.com"
CONDUCT_EMAIL="conduct@yourdomain.com"
```

#### Default Values

If environment variables are not set, the system will use the default values defined in `/src/config/emails.ts`.

### Adding New Email Types

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

## Email Provider Configuration

### Supported Email Providers

| Provider | Best For | Pricing | Setup Complexity | Deliverability |
|----------|----------|---------|------------------|----------------|
| Console | Development/Testing | Free | None | N/A |
| SMTP | Small volume, existing email | Varies | Medium | Varies |
| SendGrid | Medium-high volume | Free tier available | Easy | Excellent |
| AWS SES | High volume, AWS users | Pay per use | Medium | Excellent |

### Provider Setup

#### Setting the Email Provider

Set the `EMAIL_PROVIDER` environment variable in your `.env` file:

```env
EMAIL_PROVIDER="console"  # Options: console, smtp, sendgrid, ses
EMAIL_PROVIDER_LOG_SMTP="false"  # Set to "true" for detailed logging
```

#### Enable Detailed Logging

For debugging email issues, enable detailed SMTP logging:

```env
EMAIL_PROVIDER_LOG_SMTP="true"
```

This will log:
- Complete response details from email providers
- Full error information when sending fails
- Request/response headers and metadata
- Status codes and message IDs

### Console (Default)

The console provider logs all emails to the terminal instead of sending them. This is perfect for development and testing.

```env
EMAIL_PROVIDER="console"
```

When using the console provider, you'll see output like:
```
========================================
📧 EMAIL LOG (Provider: console)
========================================
To: user@example.com
Subject: Reset Your Bring Me Home Password
From: "Bring Me Home" <support@example.com>
========================================
Email Content Preview:
Password Reset Request You requested to reset...
========================================

🔑 Password Reset URL: http://localhost:3000/auth/reset-password?token=...
```

### SMTP

SMTP works with traditional email servers and services like Gmail, Outlook, or custom email servers.

#### Gmail Configuration

1. Create an App Password (not your regular Gmail password):
   - Go to https://myaccount.google.com/security
   - Enable 2-factor authentication
   - Search for "App passwords"
   - Generate a new app password for "Mail"

2. Configure your `.env`:
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-16-char-app-password"  # The app password you generated
```

#### Other SMTP Providers

**Outlook/Office 365:**
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@outlook.com"
SMTP_PASS="your-password"
```

**Custom SMTP Server:**
```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="mail.yourdomain.com"
SMTP_PORT="465"  # or 587 for TLS
SMTP_SECURE="true"  # true for port 465, false for 587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="your-password"
```

### SendGrid

SendGrid is a cloud-based email service that's easy to set up and offers excellent deliverability.

1. Sign up at https://sendgrid.com (free tier available)
2. Create an API key:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Give it "Full Access" permissions
   - Copy the key (you won't see it again!)

3. Verify a sender email:
   - Go to Settings → Sender Authentication
   - Verify a single sender email address

4. Configure your `.env`:
```env
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="SG.xxxxxxxxxxxx"  # Your API key
SENDGRID_FROM_EMAIL="verified-email@yourdomain.com"  # Optional, uses ADMIN_EMAIL if not set
```

### AWS SES

Amazon Simple Email Service (SES) is cost-effective for high-volume email sending.

**⚠️ IMPORTANT: AWS SES Sandbox Mode ⚠️**
By default, new AWS SES accounts are in sandbox mode with these restrictions:
- You can only send emails TO verified email addresses
- You can only send FROM verified email addresses
- Daily sending limit of 200 emails
- Maximum send rate of 1 email per second

1. Set up AWS SES:
   - Log into AWS Console
   - Go to Amazon SES
   - Verify your domain or email addresses (for sending FROM)
   - **For sandbox mode**: Also verify recipient emails (for sending TO)
   - **For production**: Request to move out of sandbox mode

2. Create IAM credentials with SES permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

3. Configure your `.env`:
```env
EMAIL_PROVIDER="ses"
AWS_ACCESS_KEY_ID="AKIAXXXXXXXX"  # Can be shared with S3 config
AWS_SECRET_ACCESS_KEY="xxxxxxxxxxxx"  # Can be shared with S3 config
AWS_SES_REGION="us-east-1"  # Your SES region
AWS_SES_FROM_EMAIL="noreply@yourdomain.com"  # Must be verified in SES
```

## Batch Email Processing

The email system supports batch processing for improved performance when sending multiple emails.

### Key Features

1. **Smart Batch Handling**: Automatically detects single vs. array inputs
   - Single email: Sends immediately
   - Array of emails: Processes in batches

2. **Provider-Specific Optimization**:
   - **SendGrid**: Supports up to 1000 emails per API call
   - **AWS SES**: Processes in parallel (recommended: 10-50 per batch)
   - **SMTP/Console**: Falls back to sequential sending

3. **Automatic Grouping**: Efficient processing based on provider capabilities

### Configuration

#### Email Processing Environment Variables

```env
# EMAIL_CHECK_INTERVAL - How often to check for new emails (in seconds)
# Default: 0 (disabled)
# Examples:
#   0     - Disabled (processor exits immediately)
#   30    - Check every 30 seconds
#   300   - Check every 5 minutes (recommended for production)
#   3600  - Check every hour
EMAIL_CHECK_INTERVAL=300

# EMAIL_BATCH_SIZE - Number of emails to send in each batch
# Default: 10
# Notes:
#   - SendGrid can handle up to 1000 per batch
#   - AWS SES processes in parallel (recommended: 10-50)
#   - SMTP should use smaller batches (5-25) to avoid timeouts
#   - Larger batches are more efficient but may hit rate limits
EMAIL_BATCH_SIZE=10

# EMAIL_MAX_PER_RUN - Maximum emails to process in one run
# Default: 1000
# Notes:
#   - Prevents processing too many emails at once
#   - Helps manage memory usage and API rate limits
#   - Set lower for testing (e.g., 50-100)
#   - Set higher for high-volume production (e.g., 5000)
EMAIL_MAX_PER_RUN=1000
```

#### Provider-Specific Recommendations

**SendGrid:**
```env
EMAIL_PROVIDER=sendgrid
EMAIL_BATCH_SIZE=50      # SendGrid handles large batches well
EMAIL_MAX_PER_RUN=5000   # Can process many emails efficiently
EMAIL_CHECK_INTERVAL=60  # Check every minute for responsive sending
```

**AWS SES:**
```env
EMAIL_PROVIDER=ses
EMAIL_BATCH_SIZE=25      # SES processes in parallel, not true batches
EMAIL_MAX_PER_RUN=1000   # Respect SES sending limits
EMAIL_CHECK_INTERVAL=300 # Check every 5 minutes
```

**SMTP:**
```env
EMAIL_PROVIDER=smtp
EMAIL_BATCH_SIZE=5       # SMTP is slower, use small batches
EMAIL_MAX_PER_RUN=100    # Limit to avoid connection issues
EMAIL_CHECK_INTERVAL=600 # Check every 10 minutes
```

**Development/Testing:**
```env
EMAIL_PROVIDER=console
EMAIL_BATCH_SIZE=2       # Small batches for easy debugging
EMAIL_MAX_PER_RUN=10     # Process just a few emails
EMAIL_CHECK_INTERVAL=10  # Quick checks for testing
```

### Usage Examples

#### Sending a Single Email
```typescript
const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Welcome to our service!</p>'
});
```

#### Sending Multiple Emails
```typescript
const emails = [
  { to: 'user1@example.com', subject: 'Update', html: '<p>...</p>' },
  { to: 'user2@example.com', subject: 'Update', html: '<p>...</p>' },
  // ... more emails
];

const result = await sendEmail(emails, 25); // Process in batches of 25
```

### Email Queue Processing

The application includes scripts for processing queued emails:

```bash
# Run the continuous processor
npm run wait-for-email-all-accounts

# Or run a one-time process
npm run process:emails
```

These scripts:
- Fetch emails with `SENDING` status from the database
- Group them by provider for efficient batch processing
- Update the database with success/failure results
- Automatically retry failed emails (up to 3 attempts)
- Only log when emails are actually sent

### Docker Integration

When running in Docker, the email processor runs as a continuous service:

1. Set `EMAIL_CHECK_INTERVAL` in your environment (seconds)
2. The Docker container runs the processor continuously
3. The processor checks for new emails at the specified interval
4. Graceful shutdown on SIGTERM/SIGINT signals

**In Docker:**
```bash
# The Dockerfile automatically runs the processor
docker build -t myapp .
docker run -e EMAIL_CHECK_INTERVAL=300 myapp
```

### Monitoring

The processor logs summary information:
```
[2024-01-15T10:30:00Z] Email Queue Processed: 45 sent, 2 failed, 3 retried
```

No logs are generated if no emails are processed, keeping logs clean.

### Email Processor Control and Logging

The email processor includes comprehensive monitoring and control features accessible from the admin interface at `/admin/email`.

#### Features

1. **Real-time Status Monitoring**
   - Running/stopped status with last check timestamp
   - Paused/aborted state with user attribution
   - Visual indicators for processor state

2. **Process Control**
   - **Pause**: Temporarily stop processing new emails
   - **Resume**: Continue processing after pause
   - **Abort**: Stop the processor completely
   - **Reset**: Clear abort state to allow restart
   - All actions require confirmation and are logged

3. **Comprehensive Logging**
   - All processor activities are logged to the database
   - Log levels: info, warning, error
   - Categories: startup, shutdown, batch, email, error, control
   - Structured metadata stored as JSON for detailed debugging

4. **Log Viewer**
   - View the last 1000 logs (configurable via `EMAIL_PROCESSOR_LOG_LIMIT`)
   - Filter by level, category, or process ID
   - Expandable details for each log entry
   - Clear old logs functionality (with confirmation)
   - Real-time refresh button

#### Log Categories

- **startup**: Processor initialization and configuration
- **shutdown**: Graceful shutdown events
- **batch**: Batch processing start/completion with statistics
- **email**: Individual email send success/failure
- **error**: Error conditions and exceptions
- **control**: Pause/resume/abort actions by users

#### Database Tables

**EmailProcessorLog**
```prisma
model EmailProcessorLog {
  id          String   @id @default(cuid())
  timestamp   DateTime @default(now())
  level       String   // info, warning, error
  category    String   // startup, shutdown, batch, email, error, control
  message     String   @db.Text
  metadata    Json?    // Additional structured data
  emailId     String?  // Reference to specific email
  batchId     String?  // Group related log entries
  processId   String?  // Identify the processor instance
}
```

**EmailProcessorControl**
```prisma
model EmailProcessorControl {
  id          String   @id @default("control")
  isPaused    Boolean  @default(false)
  isAborted   Boolean  @default(false)
  pausedBy    String?  // User who paused
  pausedAt    DateTime?
  abortedBy   String?  // User who aborted
  abortedAt   DateTime?
  lastCheckAt DateTime? // When processor last checked
}
```

#### Usage

1. **Viewing Logs**: Navigate to `/admin/email` and scroll to the "Processor Logs" section
2. **Controlling the Processor**: Use the control buttons in the "Email Processor Control" section
3. **Filtering Logs**: Click "Filters" to show filtering options
4. **Clearing Old Logs**: Click "Clear Old" to remove logs older than 7 days

#### Configuration

```env
# Maximum number of logs to display in the UI
EMAIL_PROCESSOR_LOG_LIMIT=1000
```

### Environment Variables Summary

| Variable | Default | Description | Example Values |
|----------|---------|-------------|----------------|
| `EMAIL_CHECK_INTERVAL` | 0 | Seconds between email checks (0=disabled) | 0, 30, 300, 3600 |
| `EMAIL_BATCH_SIZE` | 10 | Emails per batch | 5, 10, 25, 50 |
| `EMAIL_MAX_PER_RUN` | 1000 | Max emails per processing run | 100, 1000, 5000 |
| `EMAIL_PROVIDER` | console | Email service provider | console, smtp, sendgrid, ses |
| `EMAIL_PROVIDER_LOG_SMTP` | false | Enable detailed logging | true, false |

### Database Schema

Emails are tracked in the `EmailNotification` table with these statuses:
- `QUEUED`: Initial state, not ready to send
- `SENDING`: Ready for processing
- `SENT`: Successfully delivered
- `FAILED`: Delivery failed (will retry up to 3 times)

## Testing Email Functionality

### Test Password Reset Flow

The easiest way to test email configuration:

1. Start the application: `npm run dev`
2. Navigate to http://localhost:3000/auth/signin
3. Click "Forgot Password?"
4. Enter an email address
5. Check your terminal (console) or email inbox

### Test Scripts

**Test email configuration:**
```bash
npx tsx scripts/test-email-config.ts
```

**Test email sending:**
Create a test script `test-email.ts`:

```typescript
import { sendEmail } from './src/lib/email';

async function testEmail() {
  try {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<h1>Test Email</h1><p>This is a test email from Bring Me Home.</p>',
    });
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Email failed:', error);
  }
}

testEmail();
```

Run with: `npx tsx test-email.ts`

### Generate .env.example Content

To generate the email section for `.env.example`:

```bash
npx tsx scripts/generate-email-env-example.ts
```

## Troubleshooting

### Common Issues

#### Console Provider Not Showing Logs
- Make sure `EMAIL_PROVIDER` is not set or set to "console"
- Check the terminal where `npm run dev` is running (not browser console)
- Logs appear in the server-side terminal

#### SMTP Connection Failed
- Check firewall settings (ports 587, 465)
- Verify credentials are correct
- For Gmail, ensure you're using an App Password
- Try toggling `SMTP_SECURE` based on your port

#### SendGrid Not Sending
- Verify API key has full access permissions
- Check sender email is verified in SendGrid (Settings → Sender Authentication)
- API key should start with "SG." followed by the key
- Look for errors in SendGrid dashboard
- Ensure you're not in sandbox mode

#### AWS SES Not Sending
- Verify you're out of sandbox mode (for production)
- Check IAM permissions include ses:SendEmail
- Verify sender email/domain in SES console
- Check the correct region is configured
- **"Email address is not verified" error**: In sandbox mode, BOTH sender AND recipient emails must be verified

### Debug Mode

To see more detailed error messages:
1. Enable `EMAIL_PROVIDER_LOG_SMTP="true"`
2. Check console logs for detailed provider responses
3. The email service will fall back to console provider if another provider fails

## Best Practices

### 1. Email Address Management
- **Always use the centralized configuration** - Never hardcode email addresses
- **Use TypeScript types** - Always use `EMAIL_TYPES` constants instead of strings
- **Document new emails** - Add descriptions for any new email types
- **Keep .env.example updated** - Help others configure the system

### 2. Development vs Production

**Development:**
```env
EMAIL_PROVIDER="console"  # See emails in terminal
EMAIL_CHECK_INTERVAL=0    # Disable automatic processing
```

**Production:**
```env
EMAIL_PROVIDER="sendgrid"  # or "ses" for scale
SENDGRID_API_KEY="your-production-key"
EMAIL_CHECK_INTERVAL=300   # Process every 5 minutes
```

### 3. Email Templates
- Use the existing password reset template as a reference
- Include both HTML and text versions
- Test rendering in multiple email clients

### 4. Security
- Never commit API keys or passwords to git
- Use environment variables for all credentials
- Rotate API keys regularly
- Monitor for unusual sending patterns

### 5. Sender Reputation
- Use a consistent "from" address
- Set up SPF, DKIM, and DMARC records
- Monitor bounce rates and complaints
- Warm up new sending domains gradually

### 6. Batch Processing Best Practices

1. **Batch Size Selection**:
   - SendGrid: Use larger batches (50-100) for better performance
   - AWS SES: Keep at 25-50 for optimal parallel processing
   - SMTP: Use smaller batches (5-25) to avoid timeouts

2. **Error Handling**:
   - Failed batches automatically fall back to individual sending
   - Each email's result is tracked separately
   - Temporary failures are retried automatically

3. **Performance Tips**:
   - Process emails during off-peak hours
   - Monitor provider rate limits
   - Adjust batch sizes based on your volume

4. **Testing Batch Processing**:
   ```bash
   # Test with small batch
   EMAIL_BATCH_SIZE=2 npm run process:emails
   
   # Test with specific provider
   EMAIL_PROVIDER=console EMAIL_BATCH_SIZE=5 npm run process:emails
   ```

## Migration Guide

### Migrating from Hardcoded Emails

If you find any hardcoded email addresses in the codebase:

1. Add the email type to the central configuration
2. Replace the hardcoded value with `getEmail(EMAIL_TYPES.YOUR_TYPE)`
3. Update any client components to use the email config helpers
4. Test the changes
5. Update documentation

### Email Provider Migration

To switch providers:

1. Update `EMAIL_PROVIDER` in `.env`
2. Add required configuration for new provider
3. Test with password reset flow
4. Deploy with new configuration

The application will automatically use the new provider without code changes.

## AWS SES Bounce and Complaint Handling

The application includes comprehensive bounce and complaint handling through AWS SES webhooks, automatically managing email deliverability and compliance.

### Overview

When using AWS SES as your email provider, the system automatically:
- Processes bounce notifications to identify invalid email addresses
- Handles spam complaints by suppressing the complainant's email
- Updates user opt-out status with detailed tracking
- Maintains a suppression list to prevent sending to problematic addresses

### Email Suppression System

#### How It Works

1. **Automatic Suppression**: Emails are automatically suppressed for:
   - Permanent bounces (invalid email addresses)
   - Spam complaints (recipient marked email as spam)
   - Manual admin action
   - User unsubscribe requests

2. **Suppression Check**: Before sending any email, the system checks if the recipient is suppressed
   - Suppressed emails are marked as FAILED with reason "Email address is suppressed"
   - No retry attempts are made for suppressed addresses

3. **Management Interface**: Admins can manage suppressions at `/admin/email/suppression`
   - View all suppressed emails with reasons
   - Manually add/remove suppressions
   - Filter by reason or search by email

### Setting Up AWS SES Webhooks

#### Prerequisites
- AWS SES configured and verified
- Domain or email addresses verified in SES
- Application deployed with a public URL

#### Step 1: Create SNS Topic

1. Go to AWS SNS Console
2. Create a new topic:
   ```
   Name: ses-notifications
   Type: Standard
   ```
3. Copy the Topic ARN for later use

#### Step 2: Create SNS Subscription

1. In the SNS topic, create a subscription:
   ```
   Protocol: HTTPS
   Endpoint: https://yourdomain.com/api/webhooks/ses
   ```
2. SNS will send a confirmation request to your endpoint
3. The webhook will automatically confirm the subscription

#### Step 3: Configure SES Notifications

1. Go to AWS SES Console
2. Under Configuration → Configuration Sets, create or select a set
3. Add event destinations:
   - **Event types**: Bounce, Complaint, Delivery (optional)
   - **Destination**: SNS
   - **Topic**: Select your SNS topic

4. Update your email sending configuration to use this configuration set

#### Step 4: Environment Variables

Add to your `.env`:
```env
# AWS SES Webhook Configuration (optional)
EMAIL_WEBHOOK_SECRET=your-secret-for-verification
AWS_SNS_TOPIC_ARN=arn:aws:sns:region:account:topic-name

# Temporary - Remove after testing
# SKIP_SNS_SIGNATURE_VERIFICATION=true  # Only use during initial setup
```

### Bounce Types and Handling

#### Permanent Bounces
- **Action**: Automatically suppress email and opt-out user
- **Reasons**: Invalid email, domain doesn't exist, mailbox doesn't exist
- **User Impact**: 
  - `optOutOfAllEmail = true`
  - `optOutNotes = "Opted out by permanent bounce: [diagnostic]"`
  - Email added to suppression list

#### Transient Bounces
- **Action**: Track but don't suppress (unless repeated)
- **Reasons**: Mailbox full, temporary server issues
- **User Impact**: Email marked as BOUNCED, can be retried

#### Complaints (Spam)
- **Action**: Always suppress and opt-out user
- **Reasons**: User marked email as spam
- **User Impact**:
  - `optOutOfAllEmail = true`
  - `optOutNotes = "Opted out by spam complaint via SES"`
  - Email added to suppression list
  - All future emails blocked

### Opt-Out Tracking

The system tracks how users were opted out:

| Opt-Out Method | `optOutNotes` Value | Triggered By |
|----------------|---------------------|--------------|
| Profile Settings | "Opted out by menu choice" | User toggles setting |
| Unsubscribe Link | "Opted out by unsubscribe link" | Click unsubscribe in email |
| Spam Complaint | "Opted out by spam complaint via SES" | Mark as spam in email client |
| Hard Bounce | "Opted out by permanent bounce: [details]" | Invalid email address |
| Admin Action | "Opted out by admin action" | Manual suppression |

### Webhook Security

The SES webhook endpoint includes:
- SNS signature verification (when EMAIL_WEBHOOK_SECRET is set)
- Automatic subscription confirmation
- Request validation
- Comprehensive error logging

### Testing SES Integration

#### Using SES Simulator (Sandbox Mode)

AWS SES provides simulator addresses for testing:
```
bounce@simulator.amazonses.com      # Generates hard bounce
complaint@simulator.amazonses.com   # Generates complaint  
success@simulator.amazonses.com     # Successful delivery
```

#### Testing Webhooks Locally

1. Use ngrok or similar to expose local endpoint:
   ```bash
   ngrok http 3000
   ```

2. Update SNS subscription with ngrok URL:
   ```
   https://abc123.ngrok.io/api/webhooks/ses
   https://93632c708af0.ngrok-free.app/api/webhooks/ses
   
   ```

3. Send test emails to simulator addresses

### Monitoring and Troubleshooting

#### Email Grid Indicators
- **BOUNCED** status with bounce type/subtype
- **Suppressed** indicator for blocked emails
- **Spam: [type]** for complaint notifications
- Diagnostic codes in hover tooltips

#### Common Issues

1. **"Email address is suppressed" errors**
   - Check suppression list at `/admin/email/suppression`
   - Verify if legitimate user needs to be unsuppressed

2. **Webhooks not received**
   - Verify SNS subscription is confirmed
   - Check endpoint URL is publicly accessible
   - Review AWS CloudWatch logs for SNS

3. **High bounce rates**
   - Review suppression reasons
   - Check for data quality issues
   - Consider email validation before sending

### Best Practices

1. **Regular Maintenance**
   - Review suppression list monthly
   - Remove old suppressions for re-engagement
   - Monitor bounce/complaint rates

2. **User Communication**
   - Inform users why they were opted out (visible in profile)
   - Provide clear re-subscription process
   - Include easy unsubscribe in all emails

3. **Compliance**
   - Honor all unsubscribe requests immediately
   - Never remove spam complaints from suppression
   - Keep suppression records for audit

## Future Enhancements

Planned email features:
- Email templates with handlebars
- ~~Email queue with retry logic~~ ✅ Implemented with batch processing
- ~~Bounce handling~~ ✅ Implemented with SES webhooks
- Email analytics integration
- Multi-language email support
- ~~Webhook support for delivery notifications~~ ✅ Implemented
- Email preview in admin interface

## Support

If you encounter issues:
1. Check this documentation
2. Review error logs in terminal
3. Test with console provider first
4. Verify credentials and permissions
5. Check provider-specific dashboards for errors