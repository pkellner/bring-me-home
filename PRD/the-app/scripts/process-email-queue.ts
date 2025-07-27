#!/usr/bin/env tsx
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { EmailStatus } from '@prisma/client';
import type { SendEmailOptions } from '@/lib/email';

/**
 * Process email queue script
 * Fetches emails with SENDING status and sends them in batches
 * Respects EMAIL_BATCH_SIZE environment variable (default: 10)
 */

async function processEmailQueue() {
  const batchSize = parseInt(process.env.EMAIL_BATCH_SIZE || '10', 10);
  const maxEmailsPerRun = parseInt(process.env.EMAIL_MAX_PER_RUN || '1000', 10);
  
  try {
    // Fetch emails ready to send
    const emailsToSend = await prisma.emailNotification.findMany({
      where: {
        status: EmailStatus.SENDING,
        scheduledFor: {
          lte: new Date(),
        },
        retryCount: {
          lt: 3, // Max retries from schema default
        },
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: maxEmailsPerRun,
      orderBy: {
        createdAt: 'asc', // Process oldest first
      },
    });

    if (emailsToSend.length === 0) {
      // Don't log anything if no emails to send
      return;
    }

    // Group emails by provider for efficient batch processing
    const emailsByProvider = new Map<string, typeof emailsToSend>();
    
    for (const emailNotification of emailsToSend) {
      const recipientEmail = emailNotification.sentTo || emailNotification.user?.email;
      
      if (!recipientEmail) {
        // Mark as failed if no recipient
        await prisma.emailNotification.update({
          where: { id: emailNotification.id },
          data: {
            status: EmailStatus.FAILED,
            lastMailServerMessage: 'No recipient email address',
            lastMailServerMessageDate: new Date(),
            retryCount: { increment: 1 },
          },
        });
        continue;
      }

      // For now, group all emails together (provider detection happens in sendEmail)
      const provider = 'default';
      if (!emailsByProvider.has(provider)) {
        emailsByProvider.set(provider, []);
      }
      emailsByProvider.get(provider)!.push(emailNotification);
    }

    let totalSent = 0;
    let totalFailed = 0;

    // Process each provider's emails
    for (const [provider, emails] of emailsByProvider) {
      // Process in batches
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        
        // Prepare email options
        const emailOptions: SendEmailOptions[] = batch.map(email => {
          const recipientEmail = email.sentTo || email.user?.email || '';
          return {
            to: recipientEmail,
            subject: email.subject,
            html: email.htmlContent,
            text: email.textContent || undefined,
            emailId: email.id, // Track which database record this is
          };
        });

        try {
          // Send batch
          const result = await sendEmail(emailOptions, batchSize);
          
          // Process results
          if ('succeeded' in result && 'failed' in result) {
            // Batch result
            totalSent += result.succeeded.length;
            totalFailed += result.failed.length;
            
            // Update database for successful sends
            for (const success of result.succeeded) {
              if (success.emailId) {
                await prisma.emailNotification.update({
                  where: { id: success.emailId },
                  data: {
                    status: EmailStatus.SENT,
                    sentAt: new Date(),
                    messageId: success.messageId || null,
                    provider: success.provider || 'unknown',
                    lastMailServerMessage: `Email sent successfully via ${success.provider}${success.messageId ? ` (ID: ${success.messageId})` : ''}`,
                    lastMailServerMessageDate: new Date(),
                  },
                });
              }
            }
            
            // Update database for failed sends
            for (const failure of result.failed) {
              if (failure.emailId) {
                await prisma.emailNotification.update({
                  where: { id: failure.emailId },
                  data: {
                    status: EmailStatus.FAILED,
                    lastMailServerMessage: failure.error || 'Unknown error',
                    lastMailServerMessageDate: new Date(),
                    retryCount: { increment: 1 },
                    provider: failure.provider || 'unknown',
                  },
                });
              }
            }
          }
        } catch (error) {
          // If entire batch fails, mark all as failed
          for (const email of batch) {
            await prisma.emailNotification.update({
              where: { id: email.id },
              data: {
                status: EmailStatus.FAILED,
                lastMailServerMessage: error instanceof Error ? error.message : 'Unknown error',
                lastMailServerMessageDate: new Date(),
                retryCount: { increment: 1 },
              },
            });
            totalFailed++;
          }
        }
      }
    }

    // Auto-retry failed emails that haven't exceeded max retries
    const failedEmailsToRetry = await prisma.emailNotification.updateMany({
      where: {
        status: EmailStatus.FAILED,
        retryCount: {
          lt: 3,
        },
        updatedAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // Wait 5 minutes between retries
        },
      },
      data: {
        status: EmailStatus.SENDING,
      },
    });

    // Only log when emails were actually sent
    if (totalSent > 0) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Email Queue Processed: ${totalSent} sent, ${totalFailed} failed${failedEmailsToRetry.count > 0 ? `, ${failedEmailsToRetry.count} retried` : ''}`);
    }
  } catch (error) {
    console.error('Email queue processor error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the processor
processEmailQueue().catch(console.error);