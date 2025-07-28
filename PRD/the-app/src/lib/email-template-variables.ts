// Get available template variables based on template type
export function getTemplateVariables(templateType: 'person_update' | 'comment_verification' | 'general') {
  const commonVariables = {
    recipientName: 'Recipient full name',
    recipientEmail: 'Recipient email address',
    currentDate: 'Current date',
    siteUrl: 'Website URL',
    // Unsubscribe Keywords
    UNSUBSCRIBE_FULL: 'Full unsubscribe block (person + site-wide)',
    UNSUBSCRIBE_PERSON_ONLY: 'Unsubscribe from person only',
    UNSUBSCRIBE_SITE_ONLY: 'Unsubscribe from all emails only',
    UNSUBSCRIBE_PROFILE_LINK: 'Link to profile for email preferences',
    UNSUBSCRIBE_NONE: 'No unsubscribe block (for password reset, etc.)',
  };

  const templateVariables = {
    person_update: {
      ...commonVariables,
      personName: 'Person full name',
      personFirstName: 'Person first name',
      personLastName: 'Person last name',
      townName: 'Town name',
      updateDescription: 'Update description',
      updateDate: 'Update date',
      profileUrl: 'Person profile URL',
      personOptOutUrl: 'Unsubscribe from person updates URL',
      allOptOutUrl: 'Unsubscribe from all emails URL',
    },
    comment_verification: {
      ...commonVariables,
      personName: 'Person full name',
      personFirstName: 'Person first name',
      personLastName: 'Person last name',
      townName: 'Town name',
      commentContent: 'Comment content preview',
      commentDate: 'Comment date',
      verificationUrl: 'View comment URL',
      hideUrl: 'Hide all comments URL',
      manageUrl: 'Manage comments URL',
    },
    general: {
      ...commonVariables,
    },
  };

  return templateVariables[templateType] || templateVariables.general;
}

import { processUnsubscribeKeywords } from '@/lib/email-unsubscribe-keywords';

// Helper function to replace template variables
export function replaceTemplateVariables(template: string, data: Record<string, unknown>): string {
  let result = template;
  
  // Replace all {{variable}} patterns
  const variablePattern = /\{\{(\w+)\}\}/g;
  result = result.replace(variablePattern, (match, variable) => {
    return data[variable] !== undefined ? String(data[variable]) : match;
  });
  
  return result;
}

// Enhanced function to replace both template variables and unsubscribe keywords
export function replaceTemplateVariablesWithUnsubscribe(
  htmlTemplate: string, 
  textTemplate: string | null,
  data: Record<string, unknown>
): { html: string; text: string | null } {
  // First replace regular template variables
  const html = replaceTemplateVariables(htmlTemplate, data);
  const text = textTemplate ? replaceTemplateVariables(textTemplate, data) : null;
  
  // Then process unsubscribe keywords
  const unsubscribeVars = {
    personName: data.personName as string | undefined,
    personOptOutUrl: data.personOptOutUrl as string | undefined,
    allOptOutUrl: data.allOptOutUrl as string | undefined,
    profileUrl: data.profileUrl as string | undefined,
  };
  
  const processed = processUnsubscribeKeywords(html, text || '', unsubscribeVars);
  
  return {
    html: processed.htmlContent,
    text: text ? processed.textContent : null
  };
}