#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { emailTemplates } from '../src/config/email-templates';

async function syncEmailTemplates() {
  console.log('🔄 Syncing email templates from config to database...\n');

  for (const template of emailTemplates) {
    try {
      // Check if template exists
      const existing = await prisma.emailTemplate.findFirst({
        where: { name: template.name }
      });

      if (existing) {
        // Update existing template
        const updated = await prisma.emailTemplate.update({
          where: { id: existing.id },
          data: {
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            isActive: template.isActive ?? true,
            trackingEnabled: template.trackingEnabled ?? true,
          }
        });
        console.log(`✅ Updated template: ${template.name}`);
        
        // Check for problematic variables
        if (template.htmlContent.includes('{{updateText}}')) {
          console.warn(`⚠️  WARNING: Template ${template.name} contains {{updateText}} - should be {{updateDescription}}`);
        }
      } else {
        // Create new template
        const created = await prisma.emailTemplate.create({
          data: {
            name: template.name,
            subject: template.subject,
            htmlContent: template.htmlContent,
            textContent: template.textContent,
            isActive: template.isActive ?? true,
            trackingEnabled: template.trackingEnabled ?? true,
          }
        });
        console.log(`✅ Created template: ${template.name}`);
      }
    } catch (error) {
      console.error(`❌ Error syncing template ${template.name}:`, error);
    }
  }

  // Check database templates for issues
  console.log('\n🔍 Checking database templates for variable issues...\n');
  
  const dbTemplates = await prisma.emailTemplate.findMany();
  
  for (const dbTemplate of dbTemplates) {
    const issues: string[] = [];
    
    // Check for common variable mistakes
    if (dbTemplate.htmlContent.includes('{{updateText}}')) {
      issues.push('Contains {{updateText}} - should be {{updateDescription}}');
    }
    
    // Check if variables in subject are also defined in the template config
    const subjectVars = (dbTemplate.subject.match(/\{\{(\w+)\}\}/g) || []).map(v => v.slice(2, -2));
    const htmlVars = (dbTemplate.htmlContent.match(/\{\{(\w+)\}\}/g) || []).map(v => v.slice(2, -2));
    const textVars = (dbTemplate.textContent?.match(/\{\{(\w+)\}\}/g) || []).map(v => v.slice(2, -2));
    
    const allVars = new Set([...subjectVars, ...htmlVars, ...textVars]);
    
    // Find the config template
    const configTemplate = emailTemplates.find(t => t.name === dbTemplate.name);
    if (configTemplate) {
      const definedVars = new Set(Object.keys(configTemplate.variables));
      const undefinedVars = Array.from(allVars).filter(v => 
        !definedVars.has(v) && 
        !['UNSUBSCRIBE_FULL', 'UNSUBSCRIBE_PROFILE_LINK', 'UNSUBSCRIBE_NONE'].includes(v)
      );
      
      if (undefinedVars.length > 0) {
        issues.push(`Undefined variables: ${undefinedVars.join(', ')}`);
      }
    }
    
    if (issues.length > 0) {
      console.log(`⚠️  Template: ${dbTemplate.name}`);
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log(`✅ Template: ${dbTemplate.name} - No issues found`);
    }
  }
  
  console.log('\n✅ Sync complete!');
}

// Run the sync
syncEmailTemplates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());