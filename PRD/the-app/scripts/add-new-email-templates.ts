#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { emailTemplates } from '../src/config/email-templates';

async function main() {
  try {
    console.log('🔍 Checking for new email templates to add...\n');
    
    // Get all existing template names from database
    const existingTemplates = await prisma.emailTemplate.findMany({
      select: { name: true }
    });
    
    const existingNames = new Set(existingTemplates.map(t => t.name));
    console.log(`Found ${existingTemplates.length} existing templates in database\n`);
    
    // Find templates that don't exist in database
    const newTemplates = emailTemplates.filter(t => !existingNames.has(t.name));
    
    if (newTemplates.length === 0) {
      console.log('✅ All templates are already in the database. Nothing to add.');
      return;
    }
    
    console.log(`📝 Found ${newTemplates.length} new template(s) to add:\n`);
    
    // Add each new template
    for (const template of newTemplates) {
      console.log(`Adding template: ${template.name}...`);
      
      try {
        await prisma.emailTemplate.create({
          data: {
            name: template.name,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent || null,
            variables: template.variables || {},
            isActive: template.isActive ?? true,
            trackingEnabled: template.trackingEnabled ?? false,
            webhookUrl: template.webhookUrl || null,
            webhookHeaders: template.webhookHeaders || null,
          }
        });
        
        console.log(`✅ Successfully added: ${template.name}`);
      } catch (error) {
        console.error(`❌ Failed to add ${template.name}:`, error);
      }
    }
    
    console.log('\n✨ Template synchronization complete!');
    
    // Show final count
    const finalCount = await prisma.emailTemplate.count();
    console.log(`\nTotal templates in database: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();