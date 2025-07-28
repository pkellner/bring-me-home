export enum UnsubscribeKeyword {
  // Full unsubscribe block with both person and site-wide options
  UNSUBSCRIBE_FULL = '{{UNSUBSCRIBE_FULL}}',
  
  // Only unsubscribe from the specific person mentioned in the email
  UNSUBSCRIBE_PERSON_ONLY = '{{UNSUBSCRIBE_PERSON_ONLY}}',
  
  // Only unsubscribe from all site emails
  UNSUBSCRIBE_SITE_ONLY = '{{UNSUBSCRIBE_SITE_ONLY}}',
  
  // Link to profile page for managing email preferences
  UNSUBSCRIBE_PROFILE_LINK = '{{UNSUBSCRIBE_PROFILE_LINK}}',
  
  // No unsubscribe block (for password reset, verification emails, etc.)
  UNSUBSCRIBE_NONE = '{{UNSUBSCRIBE_NONE}}'
}

interface UnsubscribeVariables {
  personName?: string;
  personOptOutUrl?: string;
  allOptOutUrl?: string;
  profileUrl?: string;
}

export function getUnsubscribeBlock(keyword: UnsubscribeKeyword, variables: UnsubscribeVariables): { html: string; text: string } {
  switch (keyword) {
    case UnsubscribeKeyword.UNSUBSCRIBE_FULL:
      return {
        html: `
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          ${variables.personName ? `Don't want to receive updates about ${variables.personName}? <a href="${variables.personOptOutUrl}" style="color: #4F46E5;">Unsubscribe from this person</a><br>` : ''}
          Don't want to receive any emails from this site? <a href="${variables.allOptOutUrl}" style="color: #4F46E5;">Unsubscribe from all emails</a>
        </p>`,
        text: `
---
${variables.personName ? `Don't want to receive updates about ${variables.personName}? Unsubscribe: ${variables.personOptOutUrl}` : ''}
Don't want to receive any emails from this site? Unsubscribe from all: ${variables.allOptOutUrl}`
      };

    case UnsubscribeKeyword.UNSUBSCRIBE_PERSON_ONLY:
      return {
        html: `
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Don't want to receive notifications about ${variables.personName}? <a href="${variables.personOptOutUrl}" style="color: #4F46E5;">Unsubscribe from this person</a>
        </p>`,
        text: `
---
Don't want to receive notifications about ${variables.personName}? Unsubscribe: ${variables.personOptOutUrl}`
      };

    case UnsubscribeKeyword.UNSUBSCRIBE_SITE_ONLY:
      return {
        html: `
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          Don't want to receive any emails from this site? <a href="${variables.allOptOutUrl}" style="color: #4F46E5;">Unsubscribe from all emails</a>
        </p>`,
        text: `
---
Don't want to receive any emails from this site? Unsubscribe from all: ${variables.allOptOutUrl}`
      };

    case UnsubscribeKeyword.UNSUBSCRIBE_PROFILE_LINK:
      return {
        html: `
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          <a href="${variables.profileUrl}" style="color: #666;">Manage email preferences</a>
        </p>`,
        text: `
---
Manage email preferences: ${variables.profileUrl}`
      };

    case UnsubscribeKeyword.UNSUBSCRIBE_NONE:
      return {
        html: '',
        text: ''
      };

    default:
      return {
        html: '',
        text: ''
      };
  }
}

// Helper to process email templates and replace unsubscribe keywords
export function processUnsubscribeKeywords(
  htmlContent: string,
  textContent: string,
  variables: UnsubscribeVariables
): { htmlContent: string; textContent: string } {
  // Find which keyword is used in the template
  const keywords = Object.values(UnsubscribeKeyword);
  let processedHtml = htmlContent;
  let processedText = textContent;
  
  for (const keyword of keywords) {
    if (htmlContent.includes(keyword) || textContent.includes(keyword)) {
      const block = getUnsubscribeBlock(keyword, variables);
      processedHtml = processedHtml.replace(keyword, block.html);
      processedText = processedText.replace(keyword, block.text);
      break; // Only one unsubscribe type per email
    }
  }
  
  return {
    htmlContent: processedHtml,
    textContent: processedText
  };
}