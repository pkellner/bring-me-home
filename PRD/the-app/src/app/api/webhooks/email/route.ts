import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailStatus } from '@prisma/client';
import crypto from 'crypto';

// Webhook event types
type WebhookEventType = 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribe';

interface WebhookEvent {
  messageId: string;
  event: WebhookEventType;
  timestamp: string;
  recipient?: string;
  reason?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
}

// Verify webhook signature (if provider supports it)
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return true; // Skip verification if not configured
  
  // Example for SendGrid-style signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-webhook-signature');
    
    // Get the webhook secret from environment
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
    
    // Verify signature if configured
    if (webhookSecret && !verifyWebhookSignature(payload, signature, webhookSecret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Parse the webhook payload
    let events: WebhookEvent[];
    try {
      const data = JSON.parse(payload);
      // Handle both single event and array of events
      events = Array.isArray(data) ? data : [data];
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    // Process each event
    const results = {
      processed: 0,
      updated: 0,
      errors: 0,
    };
    
    for (const event of events) {
      results.processed++;
      
      try {
        // Find the email notification by messageId
        const emailNotification = await prisma.emailNotification.findFirst({
          where: { messageId: event.messageId },
        });
        
        if (!emailNotification) {
          console.warn(`Email notification not found for messageId: ${event.messageId}`);
          continue;
        }
        
        // Update based on event type
        const updateData: Record<string, unknown> = {
          webhookEvents: {
            ...(emailNotification.webhookEvents as Record<string, unknown> || {}),
            [event.event]: {
              timestamp: event.timestamp,
              ...(event.reason && { reason: event.reason }),
              ...(event.url && { url: event.url }),
              ...(event.userAgent && { userAgent: event.userAgent }),
              ...(event.ip && { ip: event.ip }),
            },
          },
        };
        
        // Update status based on event
        switch (event.event) {
          case 'delivered':
            updateData.status = EmailStatus.DELIVERED;
            updateData.deliveredAt = new Date(event.timestamp);
            break;
          case 'opened':
            updateData.status = EmailStatus.OPENED;
            updateData.openedAt = updateData.openedAt || new Date(event.timestamp);
            break;
          case 'bounced':
            updateData.status = EmailStatus.BOUNCED;
            updateData.errorMessage = event.reason || 'Email bounced';
            break;
          case 'failed':
            updateData.status = EmailStatus.FAILED;
            updateData.errorMessage = event.reason || 'Delivery failed';
            break;
          case 'unsubscribe':
            // Handle unsubscribe event
            if (emailNotification.userId) {
              if (emailNotification.personId) {
                // Unsubscribe from specific person
                await prisma.emailOptOut.upsert({
                  where: {
                    userId_personId: {
                      userId: emailNotification.userId,
                      personId: emailNotification.personId,
                    },
                  },
                  update: {
                    source: 'webhook',
                  },
                  create: {
                    userId: emailNotification.userId,
                    personId: emailNotification.personId,
                    source: 'webhook',
                  },
                });
              } else {
                // Global unsubscribe (no specific person)
                await prisma.user.update({
                  where: { id: emailNotification.userId },
                  data: { 
                    optOutOfAllEmail: true,
                    optOutNotes: 'Opted out by unsubscribe webhook',
                    optOutDate: new Date(),
                  },
                });
              }
            }
            break;
        }
        
        // Update the email notification
        await prisma.emailNotification.update({
          where: { id: emailNotification.id },
          data: updateData,
        });
        
        results.updated++;
      } catch {
        console.error('Error processing webhook event');
        results.errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Support different webhook providers by handling different HTTP methods
export async function GET(request: NextRequest) {
  // Some providers use GET for webhook verification
  const challenge = request.nextUrl.searchParams.get('challenge');
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ status: 'ok' });
}