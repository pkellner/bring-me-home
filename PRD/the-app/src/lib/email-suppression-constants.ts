// Suppression reasons
export const SUPPRESSION_REASONS = {
  BOUNCE_PERMANENT: 'bounce_permanent',
  BOUNCE_TRANSIENT: 'bounce_transient',
  SPAM_COMPLAINT: 'spam_complaint',
  MANUAL: 'manual',
  UNSUBSCRIBE_LINK: 'unsubscribe_link',
} as const;

export type SuppressionReason = typeof SUPPRESSION_REASONS[keyof typeof SUPPRESSION_REASONS];

// Suppression sources
export const SUPPRESSION_SOURCES = {
  SES_WEBHOOK: 'ses_webhook',
  ADMIN_ACTION: 'admin_action',
  USER_ACTION: 'user_action',
  SYSTEM: 'system',
} as const;

export type SuppressionSource = typeof SUPPRESSION_SOURCES[keyof typeof SUPPRESSION_SOURCES];