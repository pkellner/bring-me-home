/**
 * Centralized email configuration
 * All email addresses and their defaults are managed here
 */

// TypeScript-safe email type names
export const EMAIL_TYPES = {
  SUPPORT: 'support',
  HELP: 'help',
  PRIVACY: 'privacy',
  CONDUCT: 'conduct',
} as const;

export type EmailType = typeof EMAIL_TYPES[keyof typeof EMAIL_TYPES];

// Default email addresses
const DEFAULT_EMAILS: Record<EmailType, string> = {
  [EMAIL_TYPES.SUPPORT]: 'support@example.com',
  [EMAIL_TYPES.HELP]: 'help-me-list-someone@bring-me-home.com',
  [EMAIL_TYPES.PRIVACY]: 'privacy@bring-me-home.com',
  [EMAIL_TYPES.CONDUCT]: 'conduct@bring-me-home.com',
};

// Environment variable names for each email type
const ENV_VAR_NAMES: Record<EmailType, string> = {
  [EMAIL_TYPES.SUPPORT]: 'ADMIN_EMAIL', // Legacy name kept for backwards compatibility
  [EMAIL_TYPES.HELP]: 'HELP_EMAIL',
  [EMAIL_TYPES.PRIVACY]: 'PRIVACY_EMAIL',
  [EMAIL_TYPES.CONDUCT]: 'CONDUCT_EMAIL',
};

// Email descriptions for documentation
export const EMAIL_DESCRIPTIONS: Record<EmailType, string> = {
  [EMAIL_TYPES.SUPPORT]: 'General support and admin contact email',
  [EMAIL_TYPES.HELP]: 'Email for families to request profile listings',
  [EMAIL_TYPES.PRIVACY]: 'Email for privacy-related inquiries',
  [EMAIL_TYPES.CONDUCT]: 'Email for reporting code of conduct violations',
};

/**
 * Get email address by type
 * Returns the email from environment variable or falls back to default
 */
export function getEmail(type: EmailType): string {
  const envVarName = ENV_VAR_NAMES[type];
  const envValue = process.env[envVarName];
  return envValue || DEFAULT_EMAILS[type];
}

/**
 * Get all configured emails
 * Returns an object with all email types and their current values
 */
export function getAllEmails(): Record<EmailType, string> {
  return Object.values(EMAIL_TYPES).reduce((acc, type) => {
    acc[type] = getEmail(type);
    return acc;
  }, {} as Record<EmailType, string>);
}

/**
 * Get email configuration for .env.example generation
 * Returns an array of environment variable configurations
 */
export function getEmailEnvConfig(): Array<{
  name: string;
  defaultValue: string;
  description: string;
  type: EmailType;
}> {
  return Object.values(EMAIL_TYPES).map(type => ({
    name: ENV_VAR_NAMES[type],
    defaultValue: DEFAULT_EMAILS[type],
    description: EMAIL_DESCRIPTIONS[type],
    type,
  }));
}