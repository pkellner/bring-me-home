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

    // Log the message type for debugging
    console.log('📨 SNS Message Type:', snsMessage.Type);
    
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
      console.log('📋 SNS Subscription Confirmation received');
      console.log('Topic:', snsMessage.TopicArn);
      console.log('Has Token:', !!snsMessage.Token);
      console.log('Has SubscribeURL:', !!snsMessage.SubscribeURL);
      
      if (snsMessage.SubscribeURL) {
        // Automatically confirm the subscription
        console.log('🔗 Confirming subscription via URL:', snsMessage.SubscribeURL);
        const response = await fetch(snsMessage.SubscribeURL);
        const responseText = await response.text();
        
        if (response.ok) {
          console.log('✅ SNS subscription confirmed for topic:', snsMessage.TopicArn);
          return NextResponse.json({ message: 'Subscription confirmed' });
        } else {
          console.error('Failed to confirm subscription:', response.status, response.statusText);
          console.error('Response:', responseText);
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
      console.log('Email destination:', sesNotification.mail.destination);

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