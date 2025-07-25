'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isSiteAdmin } from '@/lib/permissions';
import { z } from 'zod';
import { replaceTemplateVariables } from '@/lib/email-template-variables';

const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  subject: z.string().min(1, 'Subject is required').max(200),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  variables: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

// Get all email templates
export async function getEmailTemplates() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const templates = await prisma.emailTemplate.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return templates;
}

// Get a single email template
export async function getEmailTemplate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  });

  return template;
}

// Create a new email template
export async function createEmailTemplate(data: z.infer<typeof emailTemplateSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    const validated = emailTemplateSchema.parse(data);

    const template = await prisma.emailTemplate.create({
      data: {
        ...validated,
        variables: validated.variables || {},
      },
    });

    return { success: true, template };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.format()._errors[0] || 'Validation error' };
    }
    console.error('Error creating email template:', error);
    return { success: false, error: 'Failed to create template' };
  }
}

// Update an email template
export async function updateEmailTemplate(id: string, data: z.infer<typeof emailTemplateSchema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    const validated = emailTemplateSchema.parse(data);

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...validated,
        variables: validated.variables || {},
      },
    });

    return { success: true, template };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.format()._errors[0] || 'Validation error' };
    }
    console.error('Error updating email template:', error);
    return { success: false, error: 'Failed to update template' };
  }
}

// Delete an email template
export async function deleteEmailTemplate(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  try {
    // Check if template is being used
    const emailsUsingTemplate = await prisma.emailNotification.count({
      where: { templateId: id },
    });

    if (emailsUsingTemplate > 0) {
      return { 
        success: false, 
        error: `Cannot delete template. It is being used by ${emailsUsingTemplate} emails.` 
      };
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting email template:', error);
    return { success: false, error: 'Failed to delete template' };
  }
}

// Preview email template with sample data
export async function previewEmailTemplate(
  templateId: string, 
  sampleData?: Record<string, unknown>
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const template = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  // Replace variables in template
  const replacedHtml = replaceTemplateVariables(template.htmlContent, sampleData || {});
  const replacedText = template.textContent 
    ? replaceTemplateVariables(template.textContent, sampleData || {})
    : null;
  const replacedSubject = replaceTemplateVariables(template.subject, sampleData || {});

  return {
    success: true,
    preview: {
      subject: replacedSubject,
      htmlContent: replacedHtml,
      textContent: replacedText,
    },
  };
}