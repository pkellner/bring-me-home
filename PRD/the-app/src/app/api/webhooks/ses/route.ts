/**
 AWS SES Webhook Handler via SNS

 This endpoint receives notifications from AWS SES through SNS for email events:
 - Bounces (hard/soft bounces)
 - Complaints (spam reports)
 - Deliveries (successful delivery confirmations)

 Prerequisites:
 1. AWS SES configured with a Configuration Set
 2. SNS Topic created and subscribed to this endpoint
 3. Raw message delivery MUST be DISABLED in SNS subscription


 Note: The "Message" field contains a JSON string that needs to be parsed to access the SES notification data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailStatus } from '@prisma/client';
import crypto from 'crypto';
import {
  SNSMessage,
  SESNotification,
  isPermanentBounce
} from '@/types/ses-notifications';
import {
  addToSuppressionList,
  SUPPRESSION_REASONS,
  SUPPRESSION_SOURCES
} from '@/lib/email-suppression';

/**
 * Verify SNS message signature
 * https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.verify.signature.html
 */
async function verifySNSSignature(message: SNSMessage): Promise<boolean> {
  // Skip verification in development if no secret is set
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_WEBHOOK_SECRET) {
    console.warn('⚠️ SNS signature verification skipped in development');
    return true;
  }

  // Temporary bypass for debugging - REMOVE IN PRODUCTION
  if (process.env.SKIP_SNS_SIGNATURE_VERIFICATION === 'true') {
    console.warn('⚠️ SNS signature verification bypassed - SECURITY RISK');
    return true;
  }

  try {
    // Build the string to sign
    let fields: string[];
    if (message.Type === 'Notification') {
      fields = ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];
    } else {
      // For subscription confirmations, only include Token if it exists
      fields = ['Message', 'MessageId', 'SubscribeURL', 'Timestamp'];
      if (message.Token) {
        fields.push('Token');
      }
      fields.push('TopicArn', 'Type');
    }

    let stringToSign = '';
    for (const field of fields) {
      if (field in message && message[field as keyof SNSMessage]) {
        stringToSign += `${field}\n${message[field as keyof SNSMessage]}\n`;
      }
    }

    // Fetch the certificate
    const certResponse = await fetch(message.SigningCertURL);
    let cert = await certResponse.text();

    // Ensure the certificate has proper PEM formatting
    if (!cert.includes('-----BEGIN CERTIFICATE-----')) {
      cert = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
    }

    // Clean up any extra whitespace or formatting issues
    cert = cert.trim();

    // Verify the signature using SHA1 (AWS SNS uses SHA1)
    const verifier = crypto.createVerify('SHA1');
    verifier.update(stringToSign, 'utf8');

    try {
      const isValid = verifier.verify(cert, message.Signature, 'base64');
      return isValid;
    } catch (verifyError) {
      console.error('Signature verification error:', verifyError);
      // If verification fails, try alternative signature verification
      // AWS SNS signatures should work with standard verification
      return false;
    }
  } catch (error) {
    console.error('SNS signature verification failed:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let snsMessage: SNSMessage;

    try {
      snsMessage = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Verify SNS signature
    const isValidSignature = await verifySNSSignature(snsMessage);
    if (!isValidSignature) {
      console.error('Invalid SNS signature');
      console.error('Message details:', {
        Type: snsMessage.Type,
        MessageId: snsMessage.MessageId,
        TopicArn: snsMessage.TopicArn,
        HasSignature: !!snsMessage.Signature,
        HasSigningCertURL: !!snsMessage.SigningCertURL
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Handle subscription confirmation
    if (snsMessage.Type === 'SubscriptionConfirmation') {
      console.log('Received SNS subscription confirmation:', {
        MessageId: snsMessage.MessageId,
        TopicArn: snsMessage.TopicArn,
        hasToken: !!snsMessage.Token,
        hasSubscribeURL: !!snsMessage.SubscribeURL,
        tokenLength: snsMessage.Token?.length
      });

      if (snsMessage.SubscribeURL) {
        // Automatically confirm the subscription
        let confirmUrl = snsMessage.SubscribeURL;
        
        // Some SNS configurations require the Token as a query parameter
        if (snsMessage.Token && !confirmUrl.includes('Token=')) {
          const separator = confirmUrl.includes('?') ? '&' : '?';
          confirmUrl = `${confirmUrl}${separator}Token=${encodeURIComponent(snsMessage.Token)}`;
        }
        
        console.log('Confirming SNS subscription:', {
          hasToken: !!snsMessage.Token,
          subscribeUrl: confirmUrl.substring(0, 100) + '...'
        });
        
        const response = await fetch(confirmUrl);
        const responseText = await response.text();

        if (response.ok) {
          console.log('SNS subscription confirmed successfully');
          return NextResponse.json({ message: 'Subscription confirmed' });
        } else {
          console.error('Failed to confirm SNS subscription:', {
            status: response.status,
            statusText: response.statusText,
            responseText: responseText.substring(0, 500)
          });
          return NextResponse.json({ 
            error: 'Failed to confirm subscription',
            details: responseText.substring(0, 200)
          }, { status: 500 });
        }
      }
      return NextResponse.json({ error: 'No SubscribeURL provided' }, { status: 400 });
    }

    // Handle unsubscribe confirmation
    if (snsMessage.Type === 'UnsubscribeConfirmation') {

      return NextResponse.json({ message: 'Unsubscribe confirmed' });
    }

    // Handle notification
    if (snsMessage.Type === 'Notification') {
      let sesNotification: SESNotification & { eventType?: string };

      try {
        sesNotification = JSON.parse(snsMessage.Message);
      } catch {
        return NextResponse.json({ error: 'Invalid SES notification format' }, { status: 400 });
      }

      // Handle both eventType (new format) and notificationType (old format)
      const eventType = sesNotification.eventType || sesNotification.notificationType;

      // Normalize the notification structure to support both formats
      if (sesNotification.eventType && !sesNotification.notificationType) {
        sesNotification.notificationType = sesNotification.eventType as 'Bounce' | 'Complaint' | 'Delivery';
      }

      // Find the email notification by messageId
      const emailNotification = await prisma.emailNotification.findFirst({
        where: { messageId: sesNotification.mail.messageId },
      });

      if (!emailNotification) {
        console.warn(`Email notification not found for messageId: ${sesNotification.mail.messageId}`);

        // Try to find by partial match (in case there's a formatting difference)
        const partialMessageId = sesNotification.mail.messageId.split('-')[0];
        await prisma.emailNotification.findMany({
          where: {
            messageId: { contains: partialMessageId },
          },
          take: 5,
        });


        // Try alternative lookup by recipient email and timestamp
        if (sesNotification.mail.destination && sesNotification.mail.destination.length > 0) {
          const recipientEmail = sesNotification.mail.destination[0];
          const mailTimestamp = new Date(sesNotification.mail.timestamp);

          // Look for emails sent to this recipient around the same time (within 5 minutes)
          const timeWindowStart = new Date(mailTimestamp.getTime() - 5 * 60 * 1000);
          const timeWindowEnd = new Date(mailTimestamp.getTime() + 5 * 60 * 1000);

          const emailByRecipient = await prisma.emailNotification.findFirst({
            where: {
              OR: [
                { sentTo: recipientEmail },
                {
                  user: {
                    email: recipientEmail
                  }
                }
              ],
              sentAt: {
                gte: timeWindowStart,
                lte: timeWindowEnd
              },
              provider: 'ses'
            },
            orderBy: {
              sentAt: 'desc'
            }
          });

          if (emailByRecipient) {

            // Use this email for processing
            const emailNotificationAlt = emailByRecipient;

            // Update the messageId if it was missing
            if (!emailNotificationAlt.messageId) {
              await prisma.emailNotification.update({
                where: { id: emailNotificationAlt.id },
                data: { messageId: sesNotification.mail.messageId }
              });
            }

            // Continue processing with this email
            if (eventType === 'Bounce' && sesNotification.bounce) {
              await processBounceNotification(sesNotification as SESNotification & { bounce: NonNullable<SESNotification['bounce']> }, emailNotificationAlt.id);
            } else if (eventType === 'Complaint' && sesNotification.complaint) {
              await processComplaintNotification(sesNotification as SESNotification & { complaint: NonNullable<SESNotification['complaint']> }, emailNotificationAlt.id);
            } else if (eventType === 'Delivery' && sesNotification.delivery) {
              await processDeliveryNotification(sesNotification as SESNotification & { delivery: NonNullable<SESNotification['delivery']> }, emailNotificationAlt.id);
            }

            return NextResponse.json({ message: 'Notification processed (via recipient lookup)' });
          }
        }

        // Still process the notification for suppression purposes
      }

      // Process based on notification type (handle both eventType and notificationType)
      if (eventType === 'Bounce' && sesNotification.bounce) {
        await processBounceNotification(sesNotification as SESNotification & { bounce: NonNullable<SESNotification['bounce']> }, emailNotification?.id);
      } else if (eventType === 'Complaint' && sesNotification.complaint) {
        await processComplaintNotification(sesNotification as SESNotification & { complaint: NonNullable<SESNotification['complaint']> }, emailNotification?.id);
      } else if (eventType === 'Delivery' && sesNotification.delivery) {
        await processDeliveryNotification(sesNotification as SESNotification & { delivery: NonNullable<SESNotification['delivery']> }, emailNotification?.id);
      } else {
        console.warn(`Unknown event type: ${eventType}`);
        return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
      }

      return NextResponse.json({ message: 'Notification processed' });
    }

    return NextResponse.json({ error: 'Unknown message type' }, { status: 400 });
  } catch (error) {
    console.error('SES webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processBounceNotification(
  notification: SESNotification & { bounce: NonNullable<SESNotification['bounce']> },
  emailNotificationId?: string
) {
  const { bounce } = notification;

  for (const recipient of bounce.bouncedRecipients) {

    // Add to suppression list if permanent bounce
    if (isPermanentBounce(bounce)) {
      await addToSuppressionList({
        email: recipient.emailAddress,
        reason: SUPPRESSION_REASONS.BOUNCE_PERMANENT,
        reasonDetails: recipient.diagnosticCode || `${bounce.bounceType}/${bounce.bounceSubType}`,
        source: SUPPRESSION_SOURCES.SES_WEBHOOK,
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
      });
    }
  }

  // Update email notification if found
  if (emailNotificationId) {
    await prisma.emailNotification.update({
      where: { id: emailNotificationId },
      data: {
        status: EmailStatus.BOUNCED,
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        diagnosticCode: bounce.bouncedRecipients[0]?.diagnosticCode,
        lastMailServerMessage: bounce.bouncedRecipients[0]?.diagnosticCode
          ? `Bounce (${bounce.bounceType}/${bounce.bounceSubType}): ${bounce.bouncedRecipients[0].diagnosticCode}`
          : `Bounce: ${bounce.bounceType}/${bounce.bounceSubType} - ${bounce.bouncedRecipients[0]?.status || 'No status'}`,
        lastMailServerMessageDate: new Date(bounce.timestamp),
        webhookEvents: {
          ...(await getExistingWebhookEvents(emailNotificationId)),
          bounce: {
            timestamp: bounce.timestamp,
            type: bounce.bounceType,
            subType: bounce.bounceSubType,
            recipients: bounce.bouncedRecipients.map(r => ({
              email: r.emailAddress,
              status: r.status,
              diagnosticCode: r.diagnosticCode,
            })),
          },
        },
      },
    });
  }
}

async function processComplaintNotification(
  notification: SESNotification & { complaint: NonNullable<SESNotification['complaint']> },
  emailNotificationId?: string
) {
  const { complaint } = notification;

  for (const recipient of complaint.complainedRecipients) {

    // Always add spam complaints to suppression list
    await addToSuppressionList({
      email: recipient.emailAddress,
      reason: SUPPRESSION_REASONS.SPAM_COMPLAINT,
      reasonDetails: `Complaint type: ${complaint.complaintFeedbackType || 'unknown'}`,
      source: SUPPRESSION_SOURCES.SES_WEBHOOK,
    });
  }

  // Update email notification if found
  if (emailNotificationId) {
    await prisma.emailNotification.update({
      where: { id: emailNotificationId },
      data: {
        status: EmailStatus.FAILED,
        complaintFeedbackType: complaint.complaintFeedbackType,
        lastMailServerMessage: `Spam complaint: ${complaint.complaintFeedbackType || 'unknown'} from ${complaint.complainedRecipients[0]?.emailAddress || 'unknown'} ${complaint.userAgent ? `(via ${complaint.userAgent})` : ''}`.trim(),
        lastMailServerMessageDate: new Date(complaint.timestamp),
        webhookEvents: {
          ...(await getExistingWebhookEvents(emailNotificationId)),
          complaint: {
            timestamp: complaint.timestamp,
            feedbackType: complaint.complaintFeedbackType,
            userAgent: complaint.userAgent,
            recipients: complaint.complainedRecipients.map(r => r.emailAddress),
          },
        },
      },
    });
  }
}

async function processDeliveryNotification(
  notification: SESNotification & { delivery: NonNullable<SESNotification['delivery']> },
  emailNotificationId?: string
) {
  const { delivery } = notification;

  // Update email notification if found
  if (emailNotificationId) {
    await prisma.emailNotification.update({
      where: { id: emailNotificationId },
      data: {
        status: EmailStatus.DELIVERED,
        deliveredAt: new Date(delivery.timestamp),
        lastMailServerMessage: `Delivered: ${delivery.smtpResponse}`,
        lastMailServerMessageDate: new Date(delivery.timestamp),
        webhookEvents: {
          ...(await getExistingWebhookEvents(emailNotificationId)),
          delivery: {
            timestamp: delivery.timestamp,
            processingTimeMillis: delivery.processingTimeMillis,
            smtpResponse: delivery.smtpResponse,
            reportingMTA: delivery.reportingMTA,
            recipients: delivery.recipients,
          },
        },
      },
    });
  }
}

async function getExistingWebhookEvents(emailNotificationId: string): Promise<Record<string, unknown>> {
  const notification = await prisma.emailNotification.findUnique({
    where: { id: emailNotificationId },
    select: { webhookEvents: true },
  });

  return (notification?.webhookEvents as Record<string, unknown>) || {};
}

// Support GET for health checks
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'ses',
    timestamp: new Date().toISOString(),
  });
}