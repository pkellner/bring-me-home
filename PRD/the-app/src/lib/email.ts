import nodemailer from 'nodemailer';
import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getEmail, EMAIL_TYPES } from '@/config/emails';
import { isEmailSuppressed } from '@/lib/email-suppression';

// Email provider types
export type EmailProvider = 'smtp' | 'sendgrid' | 'ses' | 'console';

// Get the configured email provider
const getEmailProvider = (): EmailProvider => {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase();
  
  // If no provider is set, default to console in development
  if (!provider) {
    return 'console';
  }
  
  // Validate provider
  if (!['smtp', 'sendgrid', 'ses', 'console'].includes(provider)) {
    console.warn(`Invalid EMAIL_PROVIDER: ${provider}. Defaulting to console.`);
    return 'console';
  }
  
  return provider as EmailProvider;
};

// Initialize SendGrid if using it
if (getEmailProvider() === 'sendgrid' && process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize AWS SES client if using it
const createSESClient = () => {
  if (getEmailProvider() !== 'ses') return null;
  
  return new SESClient({
    region: process.env.AWS_SES_REGION || process.env.AWS_S3_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
  });
};

// Create SMTP transporter for nodemailer
const createSMTPTransporter = () => {
  const emailConfig = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  };

  return nodemailer.createTransport(emailConfig);
};

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  emailId?: string; // Optional ID for tracking in batch operations
}

// Update return type to include error details
export interface SendEmailResult {
  messageId?: string;
  provider: string;
  error?: string;
  errorDetails?: unknown;
  emailId?: string; // Echo back the emailId if provided
}

export interface BatchEmailResult {
  succeeded: SendEmailResult[];
  failed: SendEmailResult[];
  provider: string;
}

// Helper function to convert HTML to text
const htmlToText = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Single email sending function (internal)
async function sendSingleEmail(options: SendEmailOptions, provider: EmailProvider): Promise<SendEmailResult> {
  const { to, subject, html, text, from, emailId } = options;
  const fromAddress = from || `"Bring Me Home" <${getEmail(EMAIL_TYPES.SUPPORT)}>`;
  const textContent = text || htmlToText(html);
  
  // Check if email is suppressed
  const isSuppressed = await isEmailSuppressed(to);
  if (isSuppressed) {
    console.log(`📧 Email to ${to} is suppressed - not sending`);
    return {
      provider,
      error: 'Email address is suppressed',
      errorDetails: { reason: 'suppressed', email: to },
      emailId
    };
  }
  
  // Debug logging
  console.log(`\n🔧 Email Debug: Provider=${provider}, LOG_SMTP=${process.env.EMAIL_PROVIDER_LOG_SMTP}`);
  
  // Log email details in development or when using console provider
  const logEmail = () => {
    console.log('\n========================================');
    console.log(`📧 EMAIL LOG (Provider: ${provider})`);
    console.log('========================================');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', fromAddress);
    console.log('========================================');
    console.log('Email HTML Content:');
    console.log('========================================');
    console.log(html);
    console.log('========================================');
    console.log('Text Version:');
    console.log(textContent);
    console.log('========================================\n');
  };

  try {
    switch (provider) {
      case 'smtp': {
        if (!process.env.SMTP_HOST) {
          throw new Error('SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
        }
        
        const transporter = createSMTPTransporter();
        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          subject,
          html,
          text: textContent,
        });
        
        console.log('Email sent via SMTP:', info.messageId);
        
        // Log SMTP response details if enabled
        if (process.env.EMAIL_PROVIDER_LOG_SMTP === 'true') {
          console.log('\n📧 SMTP Send Response:');
          console.log('-------------------');
          console.log('Message ID:', info.messageId);
          console.log('Response:', info.response);
          console.log('Accepted:', info.accepted);
          console.log('Rejected:', info.rejected);
          console.log('Envelope:', info.envelope);
          console.log('-------------------\n');
        }
        
        return { messageId: info.messageId, provider: 'smtp', emailId };
      }
      
      case 'sendgrid': {
        if (!process.env.SENDGRID_API_KEY) {
          throw new Error('SendGrid API key missing. Please set SENDGRID_API_KEY.');
        }
        
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || getEmail(EMAIL_TYPES.SUPPORT);
        
        const msg = {
          to,
          from: fromEmail,
          subject,
          text: textContent,
          html,
        };
        
        console.log('📤 Sending email via SendGrid...');
        console.log('To:', msg.to);
        console.log('From:', msg.from);
        console.log('Subject:', msg.subject);
        console.log('API Key prefix:', process.env.SENDGRID_API_KEY?.substring(0, 7));
        
        const [response] = await sgMail.send(msg);
        console.log('✅ Email sent via SendGrid:', response.headers['x-message-id']);
        
        // Log SendGrid response details if enabled
        if (process.env.EMAIL_PROVIDER_LOG_SMTP === 'true') {
          console.log('\n📧 SendGrid Send Response:');
          console.log('-------------------');
          console.log('Status Code:', response.statusCode);
          console.log('Message ID:', response.headers['x-message-id']);
          console.log('Headers:', JSON.stringify(response.headers, null, 2));
          console.log('Body:', response.body);
          console.log('-------------------\n');
        }
        
        return { messageId: response.headers['x-message-id'], provider: 'sendgrid', emailId };
      }
      
      case 'ses': {
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
          throw new Error('AWS credentials missing. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
        }
        
        const sesClient = createSESClient();
        if (!sesClient) {
          throw new Error('Failed to create SES client');
        }
        
        const command = new SendEmailCommand({
          Source: process.env.AWS_SES_FROM_EMAIL || fromAddress,
          Destination: {
            ToAddresses: [to],
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Text: {
                Data: textContent,
                Charset: 'UTF-8',
              },
              Html: {
                Data: html,
                Charset: 'UTF-8',
              },
            },
          },
          // Add Configuration Set to enable event notifications
          ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET,
          // Add custom headers for correlation
          ReplyToAddresses: [fromAddress],
          Tags: emailId ? [
            {
              Name: 'EmailId',
              Value: emailId,
            },
          ] : undefined,
        });
        
        const response = await sesClient.send(command);
        console.log('Email sent via AWS SES:', response.MessageId);
        
        // Log AWS SES response details if enabled
        if (process.env.EMAIL_PROVIDER_LOG_SMTP === 'true') {
          console.log('\n📧 AWS SES Send Response:');
          console.log('-------------------');
          console.log('Message ID:', response.MessageId);
          console.log('Request ID:', response.$metadata.requestId);
          console.log('HTTP Status:', response.$metadata.httpStatusCode);
          console.log('Attempts:', response.$metadata.attempts);
          console.log('Total Retry Delay:', response.$metadata.totalRetryDelay);
          console.log('Full Metadata:', JSON.stringify(response.$metadata, null, 2));
          console.log('-------------------\n');
        }
        
        return { messageId: response.MessageId, provider: 'ses', emailId };
      }
      
      case 'console':
      default: {
        logEmail();
        return { messageId: 'console-' + Date.now(), provider: 'console', emailId };
      }
    }
  } catch (error) {
    console.error(`Error sending email via ${provider}:`, error);
    
    // Extract error details for returning to caller
    let errorMessage = 'Unknown error';
    let errorDetails: unknown = undefined;
    
    const err = error as Error & { 
      code?: number | string; 
      response?: { 
        status?: number; 
        body?: unknown; 
        headers?: unknown; 
        text?: string; 
      };
      statusCode?: number;
      message?: string;
      $metadata?: {
        httpStatusCode?: number;
        requestId?: string;
        extendedRequestId?: string;
        cfId?: string;
      };
    };
    
    // Build error message based on provider
    if (provider === 'ses' && err.$metadata) {
      // AWS SES error format
      errorMessage = `AWS SES Error: ${err.message || 'Unknown'}`;
      if (err.$metadata.httpStatusCode) {
        errorMessage += ` (HTTP ${err.$metadata.httpStatusCode})`;
      }
      if (err.$metadata.requestId) {
        errorMessage += ` [RequestID: ${err.$metadata.requestId}]`;
      }
      errorDetails = {
        provider: 'ses',
        code: err.code,
        statusCode: err.$metadata.httpStatusCode,
        requestId: err.$metadata.requestId,
        message: err.message,
        metadata: err.$metadata
      };
    } else if (provider === 'sendgrid' && err.response?.body) {
      // SendGrid error format
      const sgErrors = (err.response.body as { errors?: Array<{ message?: string; field?: string }> })?.errors;
      if (sgErrors && sgErrors.length > 0) {
        errorMessage = `SendGrid Error: ${sgErrors.map(e => e.message).join(', ')}`;
      } else {
        errorMessage = `SendGrid Error: ${err.message || 'Unknown'} (HTTP ${err.response.status || 'unknown'})`;
      }
      errorDetails = {
        provider: 'sendgrid',
        code: err.code,
        statusCode: err.response.status,
        errors: sgErrors,
        response: err.response.body
      };
    } else if (provider === 'smtp') {
      // SMTP/Nodemailer error format
      errorMessage = `SMTP Error: ${err.message || 'Unknown'}`;
      if (err.code) {
        errorMessage += ` (Code: ${err.code})`;
      }
      errorDetails = {
        provider: 'smtp',
        code: err.code,
        message: err.message
      };
    } else {
      // Generic error format
      errorMessage = `${provider} Error: ${err.message || 'Unknown error'}`;
      errorDetails = {
        provider,
        code: err.code,
        message: err.message
      };
    }
    
    // Log detailed error information if SMTP logging is enabled
    if (process.env.EMAIL_PROVIDER_LOG_SMTP === 'true') {
      console.log('\n❌ Email Send Error Details:');
      console.log('-------------------');
      console.log('Provider:', provider);
      console.log('Error Type:', err?.constructor?.name);
      console.log('Error Message:', errorMessage);
      console.log('Error Details:', JSON.stringify(errorDetails, null, 2));
      console.log('Full Error Object:', JSON.stringify(err, null, 2));
      console.log('-------------------\n');
    }
    
    return { 
      provider,
      error: errorMessage,
      errorDetails,
      emailId
    };
  }
}

// Batch sending for SendGrid
async function sendBatchSendGrid(emails: SendEmailOptions[], batchSize: number): Promise<BatchEmailResult> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || getEmail(EMAIL_TYPES.SUPPORT);
  const succeeded: SendEmailResult[] = [];
  const failed: SendEmailResult[] = [];

  // Process in batches
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    try {
      // Prepare batch messages
      const messages: MailDataRequired[] = batch.map(email => ({
        to: email.to,
        from: fromEmail,
        subject: email.subject,
        text: email.text || htmlToText(email.html),
        html: email.html,
      }));

      console.log(`📤 Sending batch of ${messages.length} emails via SendGrid...`);
      
      // Send batch
      const response = await sgMail.send(messages);
      
      // SendGrid returns an array of responses for batch sends
      const responses = Array.isArray(response[0]) ? response : [response];
      
      // Process responses
      responses.forEach((res, index) => {
        const email = batch[index];
        // Type assertion for SendGrid response
        const sgResponse = res as { statusCode: number; headers: Record<string, string> };
        if (sgResponse.statusCode >= 200 && sgResponse.statusCode < 300) {
          succeeded.push({
            messageId: sgResponse.headers?.['x-message-id'] || `sg-${Date.now()}-${index}`,
            provider: 'sendgrid',
            emailId: email.emailId
          });
        } else {
          failed.push({
            provider: 'sendgrid',
            error: `HTTP ${sgResponse.statusCode}`,
            emailId: email.emailId
          });
        }
      });
    } catch (error) {
      // If batch fails, try individual sends
      console.error('Batch send failed, falling back to individual sends:', error);
      
      for (const email of batch) {
        const result = await sendSingleEmail(email, 'sendgrid');
        if (result.error) {
          failed.push(result);
        } else {
          succeeded.push(result);
        }
      }
    }
  }

  return { succeeded, failed, provider: 'sendgrid' };
}

// Batch sending for AWS SES
async function sendBatchSES(emails: SendEmailOptions[], batchSize: number): Promise<BatchEmailResult> {
  const sesClient = createSESClient();
  if (!sesClient) {
    throw new Error('Failed to create SES client');
  }

  const succeeded: SendEmailResult[] = [];
  const failed: SendEmailResult[] = [];

  // AWS SES doesn't have a true batch API like SendGrid
  // We'll process emails in parallel for better performance
  const sesMaxBatch = Math.min(batchSize, 10); // Process up to 10 in parallel

  for (let i = 0; i < emails.length; i += sesMaxBatch) {
    const batch = emails.slice(i, i + sesMaxBatch);
    
    // Process batch in parallel
    const promises = batch.map(email => sendSingleEmail(email, 'ses'));
    
    try {
      const results = await Promise.all(promises);
      
      results.forEach((result) => {
        if (result.error) {
          failed.push(result);
        } else {
          succeeded.push(result);
        }
      });
      
      console.log(`✅ Batch of ${batch.length} emails processed via AWS SES`);
    } catch (error) {
      // If parallel processing fails, try sequential
      console.error('Parallel processing failed, falling back to sequential:', error);
      
      for (const email of batch) {
        try {
          const result = await sendSingleEmail(email, 'ses');
          if (result.error) {
            failed.push(result);
          } else {
            succeeded.push(result);
          }
        } catch (err) {
          failed.push({
            provider: 'ses',
            error: err instanceof Error ? err.message : 'Unknown error',
            emailId: email.emailId
          });
        }
      }
    }
  }

  return { succeeded, failed, provider: 'ses' };
}

// Main sendEmail function that handles both single and batch
export async function sendEmail(
  emailOrEmails: SendEmailOptions | SendEmailOptions[],
  batchSize: number = 10
): Promise<SendEmailResult | BatchEmailResult> {
  const provider = getEmailProvider();
  
  // Handle single email
  if (!Array.isArray(emailOrEmails)) {
    const result = await sendSingleEmail(emailOrEmails, provider);
    
    // If using console provider and error occurred, don't throw
    if (provider === 'console' && result.error) {
      return result;
    }
    
    // For other providers, maintain backward compatibility with fallback
    if (result.error && provider !== 'console') {
      console.log('Falling back to console logging...');
      
      // Log the email
      console.log('\n========================================');
      console.log(`📧 EMAIL LOG (Provider: console - fallback from ${provider})`);
      console.log('========================================');
      console.log('To:', emailOrEmails.to);
      console.log('Subject:', emailOrEmails.subject);
      console.log('From:', emailOrEmails.from || `"Bring Me Home" <${getEmail(EMAIL_TYPES.SUPPORT)}>`);
      console.log('========================================');
      console.log('Email HTML Content:');
      console.log('========================================');
      console.log(emailOrEmails.html);
      console.log('========================================');
      console.log('Text Version:');
      console.log(emailOrEmails.text || htmlToText(emailOrEmails.html));
      console.log('========================================\n');
      
      return { 
        messageId: 'console-fallback-' + Date.now(), 
        provider: 'console',
        error: result.error,
        errorDetails: result.errorDetails,
        emailId: emailOrEmails.emailId
      };
    }
    
    return result;
  }

  // Handle batch emails
  console.log(`\n📨 Processing batch of ${emailOrEmails.length} emails with provider: ${provider}`);
  
  switch (provider) {
    case 'sendgrid':
      return await sendBatchSendGrid(emailOrEmails, batchSize);
    
    case 'ses':
      return await sendBatchSES(emailOrEmails, batchSize);
    
    case 'smtp':
    case 'console':
    default: {
      // For providers that don't support batch, send sequentially
      const succeeded: SendEmailResult[] = [];
      const failed: SendEmailResult[] = [];
      
      for (const email of emailOrEmails) {
        const result = await sendSingleEmail(email, provider);
        if (result.error) {
          failed.push(result);
        } else {
          succeeded.push(result);
        }
      }
      
      return { succeeded, failed, provider };
    }
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
  
  // Always log the reset URL in development or when using console
  const provider = getEmailProvider();
  if (provider === 'console' || process.env.NODE_ENV === 'development') {
    console.log('\n🔑 🔑 🔑 PASSWORD RESET URL 🔑 🔑 🔑');
    console.log('Click this link to reset password:');
    console.log(resetUrl);
    console.log('🔑 🔑 🔑 🔑 🔑 🔑 🔑 🔑 🔑 🔑 🔑 🔑\n');
  }
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password for your Bring Me Home account.</p>
      <p>Click the link below to reset your password. This link will expire in 1 hour:</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p style="background-color: #F3F4F6; padding: 10px; border-radius: 4px; word-break: break-all;">
        ${resetUrl}
      </p>
      <p>If you didn't request this password reset, you can safely ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; font-size: 14px;">
        This email was sent from Bring Me Home. If you have questions, contact us at ${getEmail(EMAIL_TYPES.SUPPORT)}.
      </p>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject: 'Reset Your Bring Me Home Password',
    html,
  });

  // For backward compatibility, throw error if single email fails
  if ('error' in result && result.error && provider !== 'console') {
    throw new Error(result.error);
  }
}

// Export provider detection for use in other parts of the app
export { getEmailProvider };