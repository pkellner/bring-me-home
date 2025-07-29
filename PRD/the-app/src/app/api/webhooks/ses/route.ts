import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailStatus } from '@prisma/client';
import crypto from 'crypto';
import { 
  SNSMessage, 
  SESNotification, 
  isBounceNotification, 
  isComplaintNotification,
  isDeliveryNotification,
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

  try {
    // Build the string to sign
    const fields = message.Type === 'Notification' 
      ? ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
      : ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
    
    let stringToSign = '';
    for (const field of fields) {
      if (field in message && message[field as keyof SNSMessage]) {
        stringToSign += `${field}\n${message[field as keyof SNSMessage]}\n`;
      }
    }

    // Fetch the certificate
    const certResponse = await fetch(message.SigningCertURL);
    const cert = await certResponse.text();

    // Verify the signature
    const verifier = crypto.createVerify('SHA1');
    verifier.update(stringToSign, 'utf8');
    const isValid = verifier.verify(cert, message.Signature, 'base64');
    
    return isValid;
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
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Handle subscription confirmation
    if (snsMessage.Type === 'SubscriptionConfirmation') {
      if (snsMessage.SubscribeURL) {
        // Automatically confirm the subscription
        const response = await fetch(snsMessage.SubscribeURL);
        if (response.ok) {
          console.log('✅ SNS subscription confirmed for topic:', snsMessage.TopicArn);
          return NextResponse.json({ message: 'Subscription confirmed' });
        } else {
          console.error('Failed to confirm subscription:', response.statusText);
          return NextResponse.json({ error: 'Failed to confirm subscription' }, { status: 500 });
        }
      }
      return NextResponse.json({ error: 'No SubscribeURL provided' }, { status: 400 });
    }

    // Handle unsubscribe confirmation
    if (snsMessage.Type === 'UnsubscribeConfirmation') {
      console.log('SNS unsubscribe confirmation received');
      return NextResponse.json({ message: 'Unsubscribe confirmed' });
    }

    // Handle notification
    if (snsMessage.Type === 'Notification') {
      let sesNotification: SESNotification;
      
      try {
        sesNotification = JSON.parse(snsMessage.Message);
      } catch {
        return NextResponse.json({ error: 'Invalid SES notification format' }, { status: 400 });
      }

      console.log(`📧 SES ${sesNotification.notificationType} notification received for message: ${sesNotification.mail.messageId}`);

      // Find the email notification by messageId
      const emailNotification = await prisma.emailNotification.findFirst({
        where: { messageId: sesNotification.mail.messageId },
      });

      if (!emailNotification) {
        console.warn(`Email notification not found for messageId: ${sesNotification.mail.messageId}`);
        // Still process the notification for suppression purposes
      }

      // Process based on notification type
      if (isBounceNotification(sesNotification)) {
        await processBounceNotification(sesNotification, emailNotification?.id);
      } else if (isComplaintNotification(sesNotification)) {
        await processComplaintNotification(sesNotification, emailNotification?.id);
      } else if (isDeliveryNotification(sesNotification)) {
        await processDeliveryNotification(sesNotification, emailNotification?.id);
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
    console.log(`Processing bounce for ${recipient.emailAddress}: ${bounce.bounceType}/${bounce.bounceSubType}`);
    
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
        lastMailServerMessage: `Bounce: ${bounce.bounceType}/${bounce.bounceSubType}`,
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
    console.log(`Processing complaint for ${recipient.emailAddress}: ${complaint.complaintFeedbackType || 'unknown'}`);
    
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
        lastMailServerMessage: `Spam complaint: ${complaint.complaintFeedbackType || 'unknown'}`,
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
  
  console.log(`Processing delivery confirmation for ${delivery.recipients.join(', ')}`);
  
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