import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { EmailStatus } from '@prisma/client';
import { addTrackingPixel } from '@/lib/email-tracking';

// This can be called by Vercel Cron or external cron services
export async function GET(request: NextRequest) {
  // Optional: Add authentication header check for security
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get emails that are ready to send
    const emailsToSend = await prisma.emailNotification.findMany({
      where: {
        status: EmailStatus.SENDING,
        scheduledFor: {
          lte: new Date(),
        },
        retryCount: {
          lt: prisma.emailNotification.fields.maxRetries,
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
      take: 50, // Process in batches
    });

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
    };

    // Process each email
    for (const emailNotification of emailsToSend) {
      results.processed++;

      // Determine the recipient email address
      const recipientEmail = emailNotification.sentTo || emailNotification.user?.email;

      if (!recipientEmail) {
        await prisma.emailNotification.update({
          where: { id: emailNotification.id },
          data: {
            status: EmailStatus.FAILED,
            lastMailServerMessage: 'No recipient email address',
            lastMailServerMessageDate: new Date(),
            retryCount: { increment: 1 },
          },
        });
        results.failed++;
        continue;
      }

      try {
        console.log(`[Email Cron] Sending email to ${recipientEmail} (ID: ${emailNotification.id})`);

        // Add tracking pixel if tracking is enabled
        let htmlContent = emailNotification.htmlContent;
        const isTrackingEnabled = emailNotification.trackingEnabled || emailNotification.template?.trackingEnabled;

        console.log("/src/app/api/cron/send-emails/route.ts: Tracking enabled:", isTrackingEnabled);

        if (isTrackingEnabled) {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          htmlContent = addTrackingPixel(htmlContent, emailNotification.id, baseUrl);
          console.log(`[Email Cron] Added tracking pixel for email ${emailNotification.id}`);
        }

        // Send the email
        const result = await sendEmail({
          to: recipientEmail,
          subject: emailNotification.subject,
          html: htmlContent,
          text: emailNotification.textContent || undefined,
        });

        // Type guard to ensure we're dealing with single email result
        if ('succeeded' in result) {
          // This shouldn't happen as we're sending single emails
          console.error(`[Email Cron] Unexpected batch result for single email ${emailNotification.id}`);
          results.failed++;
          continue;
        }

        console.log(`[Email Cron] Result for ${emailNotification.id}:`, {
          provider: result.provider,
          messageId: result.messageId,
          error: result.error,
        });

        // Check if the email failed but fell back to console
        if (result.error) {
          console.log(`[Email Cron] Email failed for ${emailNotification.id}, marking as FAILED with error: ${result.error}`);

          // Special handling for suppressed emails
          const isSuppressed = result.error === 'Email address is suppressed';
          
          // Email failed but was logged to console
          await prisma.emailNotification.update({
            where: { id: emailNotification.id },
            data: {
              status: EmailStatus.FAILED,
              lastMailServerMessage: result.error,
              lastMailServerMessageDate: new Date(),
              retryCount: { increment: 1 },
              provider: result.provider,
              suppressionChecked: isSuppressed,
            },
          });
          results.failed++;
          continue;
        }

        // Update status to sent
        const updateData: Record<string, unknown> = {
          status: EmailStatus.SENT,
          sentAt: new Date(),
          messageId: result.messageId || null,
          provider: result.provider || 'smtp',
          lastMailServerMessage: `Email sent successfully via ${result.provider}${result.messageId ? ` (ID: ${result.messageId})` : ''}`,
          lastMailServerMessageDate: new Date(),
        };

        // If tracking is enabled, prepare for webhook events
        const trackingEnabled = emailNotification.trackingEnabled || emailNotification.template?.trackingEnabled;
        const webhookUrl = emailNotification.webhookUrl || emailNotification.template?.webhookUrl;

        if (trackingEnabled && webhookUrl) {
          updateData.webhookEvents = {
            sent: {
              timestamp: new Date().toISOString(),
              messageId: result.messageId,
            },
          };
        }

        await prisma.emailNotification.update({
          where: { id: emailNotification.id },
          data: updateData,
        });

        results.sent++;
      } catch (error) {
        // Update status to failed with error message
        await prisma.emailNotification.update({
          where: { id: emailNotification.id },
          data: {
            status: EmailStatus.FAILED,
            lastMailServerMessage: error instanceof Error ? error.message : 'Unknown error',
            lastMailServerMessageDate: new Date(),
            retryCount: { increment: 1 },
          },
        });

        results.failed++;
      }
    }

    // Auto-retry failed emails that haven't exceeded max retries and aren't suppressed
    const failedEmailsToRetry = await prisma.emailNotification.updateMany({
      where: {
        status: EmailStatus.FAILED,
        retryCount: {
          lt: prisma.emailNotification.fields.maxRetries,
        },
        updatedAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // Wait 5 minutes between retries
        },
        suppressionChecked: false, // Don't retry suppressed emails
      },
      data: {
        status: EmailStatus.SENDING,
      },
    });

    return NextResponse.json({
      success: true,
      results: {
        ...results,
        retriedForNextRun: failedEmailsToRetry.count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Email worker error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}