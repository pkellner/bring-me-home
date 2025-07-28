#!/usr/bin/env tsx
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { EmailStatus } from '@prisma/client';
import type { SendEmailOptions } from '@/lib/email';
import { randomUUID } from 'crypto';
import { addTrackingPixel } from '@/lib/email-tracking';

/**
 * Continuous email processor with logging and control support
 * Runs indefinitely, checking for emails to send on a schedule
 */

// Configuration
const EMAIL_CHECK_INTERVAL = parseInt(process.env.EMAIL_CHECK_INTERVAL || '0', 10);
const EMAIL_BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || '100', 10);
const EMAIL_MAX_PER_RUN = parseInt(process.env.EMAIL_MAX_PER_RUN || '10000', 10);
const CONTROL_CHECK_INTERVAL = 5000; // Check control status every 5 seconds

// Process ID for this instance
const PROCESS_ID = randomUUID();

// Logger utility
async function log(level: 'info' | 'warning' | 'error', category: string, message: string, metadata?: Record<string, unknown>) {
  try {
    await prisma.emailProcessorLog.create({
      data: {
        level,
        category,
        message,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        processId: PROCESS_ID,
        batchId: metadata && typeof metadata === 'object' && 'batchId' in metadata ? (metadata.batchId as string) : null,
        emailId: metadata && typeof metadata === 'object' && 'emailId' in metadata ? (metadata.emailId as string) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write log:', error);
  }

  // Also log to console
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`, metadata || '');
}

// Check if processor should stop
async function shouldStop(): Promise<{ stop: boolean; reason?: string }> {
  try {
    const control = await prisma.emailProcessorControl.findUnique({
      where: { id: 'control' },
    });

    if (!control) {
      // Create default control record if it doesn't exist
      await prisma.emailProcessorControl.create({
        data: { id: 'control' },
      });
      return { stop: false };
    }

    // Update last check time
    await prisma.emailProcessorControl.update({
      where: { id: 'control' },
      data: { lastCheckAt: new Date() },
    });

    if (control.isAborted) {
      return { stop: true, reason: `Aborted by ${control.abortedBy} at ${control.abortedAt}` };
    }

    if (control.isPaused) {
      return { stop: false, reason: `Paused by ${control.pausedBy} at ${control.pausedAt}` };
    }

    return { stop: false };
  } catch (error) {
    await log('error', 'control', 'Failed to check control status', { error: error instanceof Error ? error.message : error });
    return { stop: false };
  }
}

// Track pause state globally
let isPaused = false;
let lastPauseReason: string | undefined;

async function processEmailBatch(): Promise<{ sent: number; failed: number; stopped?: boolean }> {
  const batchId = randomUUID();

  try {
    // Check if we should stop
    const controlCheck = await shouldStop();
    if (controlCheck.stop) {
      await log('warning', 'batch', 'Processor stopped', { batchId, reason: controlCheck.reason });
      return { sent: 0, failed: 0, stopped: true };
    }
    if (controlCheck.reason) {
      // Only log if pause state changed
      if (!isPaused) {
        await log('info', 'batch', 'Processor paused', { batchId, reason: controlCheck.reason });
        isPaused = true;
        lastPauseReason = controlCheck.reason;
      }
      return { sent: 0, failed: 0 };
    } else if (isPaused) {
      // We were paused but now resumed
      await log('info', 'batch', 'Processor resumed', { batchId, previousPauseReason: lastPauseReason });
      isPaused = false;
      lastPauseReason = undefined;
    }

    // First, update all QUEUED emails to SENDING status (same as the button does)
    const updateResult = await prisma.emailNotification.updateMany({
      where: {
        status: EmailStatus.QUEUED,
        scheduledFor: {
          lte: new Date(), // Only process emails that are scheduled for now or in the past
        },
      },
      data: {
        status: EmailStatus.SENDING,
      },
    });

    // Only log if we actually updated emails
    if (updateResult.count > 0) {
      await log('info', 'batch', `Updated ${updateResult.count} emails from QUEUED to SENDING`, { batchId, count: updateResult.count });
    }

    // Now fetch emails ready to send
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
        template: {
          select: {
            trackingEnabled: true,
            webhookUrl: true,
          },
        },
      },
      take: EMAIL_MAX_PER_RUN,
      orderBy: {
        createdAt: 'asc', // Process oldest first
      },
    });

    // If no emails to process, return silently
    if (emailsToSend.length === 0) {
      return { sent: 0, failed: 0 };
    }

    // Only log if we have emails to process
    await log('info', 'batch', `Found ${emailsToSend.length} emails to process`, {
      batchId,
      count: emailsToSend.length,
      emails: emailsToSend.map(e => ({ id: e.id, to: e.sentTo || e.user?.email, subject: e.subject }))
    });

    // Group emails by provider for efficient batch processing
    const emailsByProvider = new Map<string, typeof emailsToSend>();

    for (const emailNotification of emailsToSend) {
      const recipientEmail = emailNotification.sentTo || emailNotification.user?.email;

      if (!recipientEmail) {
        // Mark as failed if no recipient
        await log('warning', 'email', 'Email has no recipient address', {
          batchId,
          emailId: emailNotification.id,
          userId: emailNotification.userId
        });

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
    for (const [, emails] of emailsByProvider) {
      // Process in batches
      for (let i = 0; i < emails.length; i += EMAIL_BATCH_SIZE) {
        // Check control status before each batch
        const controlCheck = await shouldStop();
        if (controlCheck.stop || controlCheck.reason) {
          await log('warning', 'batch', 'Stopping batch processing', {
            batchId,
            reason: controlCheck.reason,
            processed: { sent: totalSent, failed: totalFailed }
          });
          return { sent: totalSent, failed: totalFailed, stopped: controlCheck.stop };
        }

        const batch = emails.slice(i, i + EMAIL_BATCH_SIZE);
        await log('info', 'batch', `Processing batch of ${batch.length} emails`, {
          batchId,
          batchSize: batch.length,
          batchIndex: Math.floor(i / EMAIL_BATCH_SIZE) + 1
        });

        // Prepare email options
        const emailOptions: SendEmailOptions[] = batch.map(email => {
          const recipientEmail = email.sentTo || email.user?.email || '';
          
          // Add tracking pixel if tracking is enabled
          let htmlContent = email.htmlContent;
          const isTrackingEnabled = email.trackingEnabled || email.template?.trackingEnabled;
          
          if (isTrackingEnabled) {
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            htmlContent = addTrackingPixel(htmlContent, email.id, baseUrl);
            console.log(`[Email Processor] Added tracking pixel for email ${email.id}`);
          }
          
          return {
            to: recipientEmail,
            subject: email.subject,
            html: htmlContent,
            text: email.textContent || undefined,
            emailId: email.id, // Track which database record this is
          };
        });

        try {
          // Send batch
          const result = await sendEmail(emailOptions, EMAIL_BATCH_SIZE);

          // Process results
          if ('succeeded' in result && 'failed' in result) {
            // Batch result
            totalSent += result.succeeded.length;
            totalFailed += result.failed.length;

            await log('info', 'batch', `Batch processed: ${result.succeeded.length} sent, ${result.failed.length} failed`, {
              batchId,
              succeeded: result.succeeded.length,
              failed: result.failed.length,
              provider: result.provider
            });

            // Update database for successful sends
            for (const success of result.succeeded) {
              if (success.emailId) {
                await log('info', 'email', 'Email sent successfully', {
                  batchId,
                  emailId: success.emailId,
                  provider: success.provider,
                  messageId: success.messageId
                });

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
                await log('error', 'email', 'Email failed to send', {
                  batchId,
                  emailId: failure.emailId,
                  error: failure.error,
                  provider: failure.provider
                });

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
          await log('error', 'batch', 'Batch processing failed', {
            batchId,
            error: error instanceof Error ? error.message : 'Unknown error',
            batchSize: batch.length
          });

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
    const retriedResult = await prisma.emailNotification.updateMany({
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

    if (retriedResult.count > 0) {
      await log('info', 'batch', `Marked ${retriedResult.count} failed emails for retry`, {
        batchId,
        retriedCount: retriedResult.count
      });
    }

    // Only log completion if we actually processed something
    if (totalSent > 0 || totalFailed > 0) {
      await log('info', 'batch', 'Batch processing completed', {
        batchId,
        sent: totalSent,
        failed: totalFailed
      });
    }

    return { sent: totalSent, failed: totalFailed };
  } catch (error) {
    await log('error', 'batch', 'Email queue processor error', {
      batchId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  await log('info', 'startup', 'Email processor starting', {
    processId: PROCESS_ID,
    config: {
      checkInterval: EMAIL_CHECK_INTERVAL,
      batchSize: EMAIL_BATCH_SIZE,
      maxPerRun: EMAIL_MAX_PER_RUN,
      controlCheckInterval: CONTROL_CHECK_INTERVAL
    }
  });

  // If interval is 0, exit immediately
  if (EMAIL_CHECK_INTERVAL === 0) {
    await log('warning', 'startup', 'Email processing disabled (EMAIL_CHECK_INTERVAL=0)');
    process.exit(0);
  }

  // Handle graceful shutdown
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    await log('info', 'shutdown', 'Email processor shutting down', { processId: PROCESS_ID });
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Main processing loop
  while (!isShuttingDown) {
    try {
      const startTime = Date.now();
      const { stopped } = await processEmailBatch();

      // Check if we should stop
      if (stopped) {
        await log('warning', 'shutdown', 'Processor stopped by control signal', { processId: PROCESS_ID });
        break;
      }

      // Calculate time taken and sleep for the remainder
      const elapsed = Date.now() - startTime;
      const sleepTime = Math.max(0, EMAIL_CHECK_INTERVAL * 1000 - elapsed);

      if (sleepTime > 0 && !isShuttingDown) {
        await sleep(sleepTime);
      }
    } catch (error) {
      await log('error', 'error', 'Error in email processing loop', {
        processId: PROCESS_ID,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Sleep before retrying to avoid tight error loops
      if (!isShuttingDown) {
        await sleep(EMAIL_CHECK_INTERVAL * 1000);
      }
    }
  }

  // Clean shutdown
  await shutdown();
}

// Start the processor
main().catch(async error => {
  await log('error', 'error', 'Fatal error in email processor', {
    processId: PROCESS_ID,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});