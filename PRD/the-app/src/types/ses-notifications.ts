// AWS SES Notification Types
// Based on AWS SES documentation: https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html

export interface SESNotification {
  notificationType: 'Bounce' | 'Complaint' | 'Delivery';
  mail: SESMailObject;
  bounce?: SESBounceObject;
  complaint?: SESComplaintObject;
  delivery?: SESDeliveryObject;
}

export interface SESMailObject {
  timestamp: string;
  messageId: string;
  source: string;
  sourceArn: string;
  sourceIp: string;
  sendingAccountId: string;
  destination: string[];
  headersTruncated?: boolean;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  commonHeaders?: {
    returnPath?: string;
    from?: string[];
    date?: string;
    to?: string[];
    messageId?: string;
    subject?: string;
  };
}

export interface SESBounceObject {
  bounceType: 'Permanent' | 'Transient' | 'Undetermined';
  bounceSubType: string;
  bouncedRecipients: BouncedRecipient[];
  timestamp: string;
  feedbackId: string;
  remoteMtaIp?: string;
  reportingMTA?: string;
}

export interface BouncedRecipient {
  emailAddress: string;
  action?: string;
  status?: string;
  diagnosticCode?: string;
}

export interface SESComplaintObject {
  complainedRecipients: ComplainedRecipient[];
  timestamp: string;
  feedbackId: string;
  userAgent?: string;
  complaintFeedbackType?: 'abuse' | 'auth-failure' | 'fraud' | 'not-spam' | 'other' | 'virus';
  arrivalDate?: string;
}

export interface ComplainedRecipient {
  emailAddress: string;
}

export interface SESDeliveryObject {
  timestamp: string;
  processingTimeMillis: number;
  recipients: string[];
  smtpResponse: string;
  reportingMTA: string;
}

// SNS Message wrapper (SES notifications come through SNS)
export interface SNSMessage {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string; // JSON string containing SESNotification
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL?: string;
  Token?: string; // For subscription confirmation
  SubscribeURL?: string; // For subscription confirmation
}

// Bounce type details
export const BOUNCE_TYPES = {
  PERMANENT: 'Permanent',
  TRANSIENT: 'Transient',
  UNDETERMINED: 'Undetermined',
} as const;

export const BOUNCE_SUB_TYPES = {
  GENERAL: 'General',
  NO_EMAIL: 'NoEmail',
  SUPPRESSED: 'Suppressed',
  MAILBOX_FULL: 'MailboxFull',
  MESSAGE_TOO_LARGE: 'MessageTooLarge',
  CONTENT_REJECTED: 'ContentRejected',
  ATTACHMENT_REJECTED: 'AttachmentRejected',
} as const;

// Helper type guards
export function isBounceNotification(notification: SESNotification): notification is SESNotification & { bounce: SESBounceObject } {
  return notification.notificationType === 'Bounce' && !!notification.bounce;
}

export function isComplaintNotification(notification: SESNotification): notification is SESNotification & { complaint: SESComplaintObject } {
  return notification.notificationType === 'Complaint' && !!notification.complaint;
}

export function isDeliveryNotification(notification: SESNotification): notification is SESNotification & { delivery: SESDeliveryObject } {
  return notification.notificationType === 'Delivery' && !!notification.delivery;
}

export function isPermanentBounce(bounce: SESBounceObject): boolean {
  return bounce.bounceType === BOUNCE_TYPES.PERMANENT;
}

export function isTransientBounce(bounce: SESBounceObject): boolean {
  return bounce.bounceType === BOUNCE_TYPES.TRANSIENT;
}