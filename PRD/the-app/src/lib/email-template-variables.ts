// Get available template variables based on template type
export function getTemplateVariables(templateType: 'person_update' | 'general') {
  const commonVariables = {
    recipientName: 'Recipient full name',
    recipientEmail: 'Recipient email address',
    currentDate: 'Current date',
    siteUrl: 'Website URL',
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
    general: {
      ...commonVariables,
    },
  };

  return templateVariables[templateType] || templateVariables.general;
}

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