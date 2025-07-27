#!/usr/bin/env tsx
/**
 * Script to seed email templates independently from the main seeding process
 * Usage: npx tsx scripts/seed-email-templates.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { emailTemplates } from '../src/config/email-templates';

const prisma = new PrismaClient();

async function seedEmailTemplates() {
  console.log('🚀 Starting email template seeding...');
  
  try {
    let created = 0;
    let updated = 0;
    
    for (const template of emailTemplates) {
      // Convert variables object to JSON string for database storage
      const templateData: any = {
        ...template,
        variables: JSON.stringify(template.variables),
        trackingEnabled: template.trackingEnabled ?? false,
        webhookUrl: template.webhookUrl ?? null,
        webhookHeaders: template.webhookHeaders ? JSON.stringify(template.webhookHeaders) : Prisma.JsonNull
      };
      
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name }
      });
      
      if (existing) {
        await prisma.emailTemplate.update({
          where: { name: template.name },
          data: templateData
        });
        updated++;
        console.log(`✅ Updated template: ${template.name}`);
      } else {
        await prisma.emailTemplate.create({
          data: templateData
        });
        created++;
        console.log(`✅ Created template: ${template.name}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Total templates processed: ${emailTemplates.length}`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log('\n✨ Email template seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding email templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedEmailTemplates().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});