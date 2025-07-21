# Email Configuration Guide

This guide explains how to configure outgoing email functionality in the Bring Me Home application. The application supports multiple email providers and can be easily switched between them using environment variables.

## Table of Contents

- [Overview](#overview)
- [Supported Email Providers](#supported-email-providers)
- [Configuration](#configuration)
  - [Console (Default)](#console-default)
  - [SMTP](#smtp)
  - [SendGrid](#sendgrid)
  - [AWS SES](#aws-ses)
- [Testing Email Functionality](#testing-email-functionality)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The Bring Me Home application uses email for:
- Password reset functionality
- Future features: Admin notifications, user communications

The email system is designed to be flexible and supports multiple providers:
- **Console**: Logs emails to console (default for development)
- **SMTP**: Traditional email servers (Gmail, Outlook, etc.)
- **SendGrid**: Cloud-based email service
- **AWS SES**: Amazon's email service

## Supported Email Providers

### Provider Comparison

| Provider | Best For | Pricing | Setup Complexity | Deliverability |
|----------|----------|---------|------------------|----------------|
| Console | Development/Testing | Free | None | N/A |
| SMTP | Small volume, existing email | Varies | Medium | Varies |
| SendGrid | Medium-high volume | Free tier available | Easy | Excellent |
| AWS SES | High volume, AWS users | Pay per use | Medium | Excellent |

## Configuration

### Setting the Email Provider

Set the `EMAIL_PROVIDER` environment variable in your `.env` file:

```env
EMAIL_PROVIDER="console"  # Options: console, smtp, sendgrid, ses
EMAIL_PROVIDER_LOG_SMTP="false"  # Set to "true" for detailed logging
```

### Enable Detailed Logging

For debugging email issues, enable detailed SMTP logging:

```env
EMAIL_PROVIDER_LOG_SMTP="true"
```

This will log:
- Complete response details from email providers
- Full error information when sending fails
- Request/response headers and metadata
- Status codes and message IDs

Example SendGrid success log:
```
📧 SendGrid Send Response:
-------------------
Status Code: 202
Message ID: <unique-message-id@sendgrid.net>
Headers: {
  "server": "nginx",
  "x-message-id": "<unique-message-id@sendgrid.net>",
  ...
}
Body: ""
-------------------
```

Example error log:
```
❌ Email Send Error Details:
-------------------
Provider: sendgrid
Error Type: BadRequestError
Error Message: The from email does not contain a valid email.
Response Status: 400
Error Code: E_BAD_REQUEST
-------------------
```

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

## Testing Email Functionality

### 1. Test Password Reset Flow

The easiest way to test email configuration:

1. Start the application: `npm run dev`
2. Navigate to http://localhost:3000/auth/signin
3. Click "Forgot Password?"
4. Enter an email address
5. Check your terminal (console) or email inbox

### 2. Test Script

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
- Common 401 errors:
  - Invalid API key
  - API key doesn't have permission for sending
  - From email not verified in SendGrid

#### AWS SES Not Sending
- Verify you're out of sandbox mode (for production)
- Check IAM permissions include ses:SendEmail
- Verify sender email/domain in SES console
- Check the correct region is configured
- **"Email address is not verified" error**: This error can mean:
  - In sandbox mode: BOTH sender AND recipient emails must be verified
  - The error message shows which email is not verified (often the recipient)
  - Example: "Email address is not verified... peter@peterkellner.net" means the recipient is not verified
  - Solution: Either verify the recipient email in SES or move out of sandbox mode

### Debug Mode

To see more detailed error messages, the email service will:
1. Log errors to console
2. Fall back to console provider if another provider fails
3. Show the full error stack trace

## Best Practices

### 1. Development vs Production

**Development:**
```env
EMAIL_PROVIDER="console"  # See emails in terminal
```

**Production:**
```env
EMAIL_PROVIDER="sendgrid"  # or "ses" for scale
SENDGRID_API_KEY="your-production-key"
```

### 2. Email Templates

Keep email templates consistent:
- Use the existing password reset template as a reference
- Include both HTML and text versions
- Test rendering in multiple email clients

### 3. Rate Limiting

The application includes built-in rate limiting:
- Password reset: 5-minute cooldown between requests
- Consider adding additional rate limiting for production

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

## Email Provider Migration

To switch providers:

1. Update `EMAIL_PROVIDER` in `.env`
2. Add required configuration for new provider
3. Test with password reset flow
4. Deploy with new configuration

The application will automatically use the new provider without code changes.

## Future Enhancements

Planned email features:
- Email templates with handlebars
- Email queue with retry logic
- Bounce handling
- Email analytics integration
- Multi-language email support

## Support

If you encounter issues:
1. Check this documentation
2. Review error logs in terminal
3. Test with console provider first
4. Verify credentials and permissions
5. Check provider-specific dashboards for errors