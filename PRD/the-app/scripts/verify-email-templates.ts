#!/usr/bin/env tsx
/**
 * Script to verify email templates in the database match the configuration
 * Usage: npx tsx scripts/verify-email-templates.ts
 */

import { PrismaClient } from '@prisma/client';
import { emailTemplates } from '../src/config/email-templates';

const prisma = new PrismaClient();

async function verifyEmailTemplates() {
  console.log('🔍 Verifying email templates...\n');
  
  try {
    // Get all templates from database
    const dbTemplates = await prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' }
    });
    
    // Create maps for easy comparison
    const dbTemplateMap = new Map(dbTemplates.map(t => [t.name, t]));
    const configTemplateMap = new Map(emailTemplates.map(t => [t.name, t]));
    
    console.log('📋 Templates in configuration:', emailTemplates.length);
    console.log('💾 Templates in database:', dbTemplates.length);
    console.log();
    
    // Check for templates in config but not in database
    console.log('🔎 Checking for missing templates in database...');
    let missingInDb = 0;
    for (const [name, template] of configTemplateMap) {
      if (!dbTemplateMap.has(name)) {
        console.log(`   ❌ Missing in DB: ${name}`);
        missingInDb++;
      }
    }
    if (missingInDb === 0) {
      console.log('   ✅ All configured templates exist in database');
    }
    console.log();
    
    // Check for templates in database but not in config
    console.log('🔎 Checking for orphaned templates in database...');
    let orphanedInDb = 0;
    for (const [name, template] of dbTemplateMap) {
      if (!configTemplateMap.has(name)) {
        console.log(`   ⚠️  Orphaned in DB: ${name}`);
        orphanedInDb++;
      }
    }
    if (orphanedInDb === 0) {
      console.log('   ✅ No orphaned templates in database');
    }
    console.log();
    
    // Check for differences in existing templates
    console.log('🔎 Checking for differences in existing templates...');
    let differences = 0;
    for (const [name, configTemplate] of configTemplateMap) {
      const dbTemplate = dbTemplateMap.get(name);
      if (dbTemplate) {
        const diffs = [];
        
        if (dbTemplate.subject !== configTemplate.subject) {
          diffs.push('subject');
        }
        if (dbTemplate.htmlContent !== configTemplate.htmlContent) {
          diffs.push('htmlContent');
        }
        if (dbTemplate.textContent !== configTemplate.textContent) {
          diffs.push('textContent');
        }
        
        // Parse variables for comparison
        let dbVariables: any = {};
        try {
          const variablesStr = typeof dbTemplate.variables === 'string' 
            ? dbTemplate.variables 
            : JSON.stringify(dbTemplate.variables);
          dbVariables = JSON.parse(variablesStr || '{}');
        } catch (e) {
          // Invalid JSON
        }
        
        if (JSON.stringify(dbVariables) !== JSON.stringify(configTemplate.variables)) {
          diffs.push('variables');
        }
        
        if (diffs.length > 0) {
          console.log(`   ⚠️  Template "${name}" differs in: ${diffs.join(', ')}`);
          differences++;
        }
      }
    }
    if (differences === 0) {
      console.log('   ✅ All existing templates match configuration');
    }
    console.log();
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   Templates in sync: ${emailTemplates.length - missingInDb - differences}`);
    console.log(`   Missing in database: ${missingInDb}`);
    console.log(`   Orphaned in database: ${orphanedInDb}`);
    console.log(`   Templates with differences: ${differences}`);
    
    if (missingInDb > 0 || differences > 0) {
      console.log('\n💡 Tip: Run "npx tsx scripts/seed-email-templates.ts" to sync templates');
    }
    
  } catch (error) {
    console.error('❌ Error verifying email templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyEmailTemplates().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});