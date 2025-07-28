#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { emailTemplates } from '../src/config/email-templates';

async function main() {
  const args = process.argv.slice(2);
  const templateName = args[0];
  const forceUpdate = args.includes('--force');
  
  if (args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/update-email-templates.ts [template-name] [--force]

Options:
  template-name   Update only the specified template
  --force        Update template even if it exists
  --help         Show this help message

Examples:
  npx tsx scripts/update-email-templates.ts                              # Add only new templates
  npx tsx scripts/update-email-templates.ts admin_new_comment_notification  # Update specific template
  npx tsx scripts/update-email-templates.ts --force                      # Update all templates
`);
    return;
  }
  
  try {
    console.log('🔍 Email Template Manager\n');
    
    // Get all existing templates from database
    const existingTemplates = await prisma.emailTemplate.findMany({
      select: { name: true, updatedAt: true }
    });
    
    const existingMap = new Map(existingTemplates.map(t => [t.name, t]));
    
    // Determine which templates to process
    let templatesToProcess = emailTemplates;
    
    if (templateName) {
      const template = emailTemplates.find(t => t.name === templateName);
      if (!template) {
        console.error(`❌ Template "${templateName}" not found in config`);
        console.log('\nAvailable templates:');
        emailTemplates.forEach(t => console.log(`  - ${t.name}`));
        return;
      }
      templatesToProcess = [template];
    }
    
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const template of templatesToProcess) {
      const existing = existingMap.get(template.name);
      
      if (existing && !forceUpdate && !templateName) {
        // Skip existing templates unless forced or specific template requested
        skippedCount++;
        continue;
      }
      
      if (existing) {
        // Update existing template
        console.log(`📝 Updating template: ${template.name}...`);
        
        try {
          await prisma.emailTemplate.update({
            where: { name: template.name },
            data: {
              subject: template.subject,
              htmlContent: template.htmlContent,
              textContent: template.textContent || null,
              variables: template.variables || {},
              isActive: template.isActive ?? true,
              trackingEnabled: template.trackingEnabled ?? false,
              webhookUrl: template.webhookUrl || null,
              webhookHeaders: template.webhookHeaders || undefined,
            }
          });
          
          console.log(`✅ Successfully updated: ${template.name}`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Failed to update ${template.name}:`, error);
        }
      } else {
        // Add new template
        console.log(`➕ Adding new template: ${template.name}...`);
        
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
              webhookHeaders: template.webhookHeaders || undefined,
            }
          });
          
          console.log(`✅ Successfully added: ${template.name}`);
          addedCount++;
        } catch (error) {
          console.error(`❌ Failed to add ${template.name}:`, error);
        }
      }
    }
    
    console.log('\n✨ Summary:');
    console.log(`  - Added: ${addedCount}`);
    console.log(`  - Updated: ${updatedCount}`);
    console.log(`  - Skipped: ${skippedCount}`);
    
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