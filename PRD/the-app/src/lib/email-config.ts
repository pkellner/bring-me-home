/**
 * Client-side email configuration helpers
 * These functions can be used in client components where server-side config is not available
 */

import { EMAIL_TYPES, type EmailType } from '@/config/emails';

/**
 * Get email configuration from public config API
 * This is for use in client components
 */
export async function getEmailConfig(): Promise<{
  supportEmail: string;
  helpEmail: string;
  privacyEmail: string;
  conductEmail: string;
}> {
  try {
    const response = await fetch('/api/configs');
    if (!response.ok) {
      throw new Error('Failed to fetch config');
    }
    const data = await response.json();
    return data.application;
  } catch (error) {
    console.error('Failed to fetch email config:', error);
    // Return defaults if fetch fails
    return {
      supportEmail: 'support@example.com',
      helpEmail: 'help-me-list-someone@bring-me-home.com',
      privacyEmail: 'privacy@bring-me-home.com',
      conductEmail: 'conduct@bring-me-home.com',
    };
  }
}

/**
 * Helper to get email by type from config object
 */
export function getEmailFromConfig(
  config: {
    supportEmail: string;
    helpEmail: string;
    privacyEmail: string;
    conductEmail: string;
  },
  type: EmailType
): string {
  const emailMap: Record<EmailType, keyof typeof config> = {
    [EMAIL_TYPES.SUPPORT]: 'supportEmail',
    [EMAIL_TYPES.HELP]: 'helpEmail',
    [EMAIL_TYPES.PRIVACY]: 'privacyEmail',
    [EMAIL_TYPES.CONDUCT]: 'conductEmail',
  };
  
  return config[emailMap[type]];
}

// Re-export types for convenience
export { EMAIL_TYPES, type EmailType } from '@/config/emails';