import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { getEmail, EMAIL_TYPES } from '@/config/emails';

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
  console.log('SendGrid initialized with API key:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...' + process.env.SENDGRID_API_KEY.substring(process.env.SENDGRID_API_KEY.length - 4));
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

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, text, from }: SendEmailOptions) {
  const provider = getEmailProvider();
  const fromAddress = from || `"Bring Me Home" <${getEmail(EMAIL_TYPES.SUPPORT)}>`;
  // Better HTML to text conversion that preserves URLs
  const textContent = text || html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
    
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
        
        return { messageId: info.messageId, provider: 'smtp' };
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
        
        return { messageId: response.headers['x-message-id'], provider: 'sendgrid' };
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
        
        return { messageId: response.MessageId, provider: 'ses' };
      }
      
      case 'console':
      default: {
        logEmail();
        return { messageId: 'console-' + Date.now(), provider: 'console' };
      }
    }
  } catch (error) {
    console.error(`Error sending email via ${provider}:`, error);
    
    // Log detailed error information if SMTP logging is enabled or if it's a SendGrid error
    if (process.env.EMAIL_PROVIDER_LOG_SMTP === 'true' || (provider === 'sendgrid' && (error as Error & { code?: number })?.code === 401)) {
      const err = error as Error & { 
        code?: number; 
        response?: { 
          status?: number; 
          body?: unknown; 
          headers?: unknown; 
          text?: string; 
        } 
      };
      console.log('\n❌ Email Send Error Details:');
      console.log('-------------------');
      console.log('Provider:', provider);
      console.log('Error Type:', err?.constructor?.name);
      console.log('Error Message:', err?.message);
      console.log('Error Code:', err?.code);
      
      if (err?.response) {
        console.log('Response Status:', err.response?.status);
        console.log('Response Body:', JSON.stringify(err.response?.body, null, 2));
        console.log('Response Headers:', JSON.stringify(err.response?.headers, null, 2));
        console.log('Response Text:', err.response?.text);
      }
      
      // SendGrid specific error details
      if (provider === 'sendgrid' && err?.response?.body && typeof err.response.body === 'object' && 'errors' in err.response.body) {
        console.log('\nSendGrid Error Details:');
        const errors = err.response.body.errors as Array<{ message?: string; field?: string; help?: string }>;
        errors.forEach((error, index) => {
          console.log(`Error ${index + 1}:`, error.message);
          if (error.field) console.log('Field:', error.field);
          if (error.help) console.log('Help:', error.help);
        });
      }
      
      console.log('\nFull Error Object:', JSON.stringify(err, null, 2));
      console.log('-------------------\n');
    }
    
    // If not already using console provider, fall back to console logging
    if (provider !== 'console') {
      console.log('Falling back to console logging...');
      logEmail();
      return { messageId: 'console-fallback-' + Date.now(), provider: 'console' };
    }
    
    throw error;
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

  await sendEmail({
    to: email,
    subject: 'Reset Your Bring Me Home Password',
    html,
  });
}

// Export provider detection for use in other parts of the app
export { getEmailProvider };