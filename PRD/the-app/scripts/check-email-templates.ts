#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('Checking for email templates in the database...\n');

    // Get all email templates
    const templates = await prisma.emailTemplate.findMany({
      select: {
        id: true,
        name: true,
        subject: true,
        isActive: true,
        trackingEnabled: true,
        createdAt: true,
        updatedAt: true,
        variables: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    if (templates.length === 0) {
      console.log('No email templates found in the database.');
    } else {
      console.log(`Found ${templates.length} email template(s):\n`);
      
      templates.forEach((template, index) => {
        console.log(`${index + 1}. Template: ${template.name}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Subject: ${template.subject}`);
        console.log(`   Active: ${template.isActive}`);
        console.log(`   Tracking: ${template.trackingEnabled}`);
        console.log(`   Created: ${template.createdAt.toISOString()}`);
        console.log(`   Updated: ${template.updatedAt.toISOString()}`);
        if (template.variables) {
          console.log(`   Variables: ${JSON.stringify(template.variables)}`);
        }
        console.log('');
      });

      // Specifically check for password reset templates
      const passwordResetTemplates = templates.filter(t => 
        t.name.toLowerCase().includes('password') || 
        t.name.toLowerCase().includes('reset') ||
        t.subject.toLowerCase().includes('password') ||
        t.subject.toLowerCase().includes('reset')
      );

      if (passwordResetTemplates.length > 0) {
        console.log('\n=== Password Reset Related Templates ===');
        passwordResetTemplates.forEach(template => {
          console.log(`- ${template.name} (ID: ${template.id})`);
        });
      } else {
        console.log('\n⚠️  No password reset email templates found!');
        console.log('You may need to create a password reset template.');
      }
    }

    // Check if there are any email notifications using templates
    const emailsWithTemplates = await prisma.emailNotification.count({
      where: {
        templateId: {
          not: null
        }
      }
    });

    console.log(`\n${emailsWithTemplates} email notification(s) are using templates.`);

  } catch (error) {
    console.error('Error checking email templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();