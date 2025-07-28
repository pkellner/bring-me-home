#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function enableEmailTracking() {
  try {
    console.log('🔄 Enabling tracking for all email templates...');
    
    // Update all email templates to enable tracking
    const result = await prisma.emailTemplate.updateMany({
      where: {
        trackingEnabled: false
      },
      data: {
        trackingEnabled: true
      }
    });
    
    console.log(`✅ Updated ${result.count} email templates to enable tracking`);
    
    // Show current status
    const templates = await prisma.emailTemplate.findMany({
      select: {
        name: true,
        trackingEnabled: true
      }
    });
    
    console.log('\n📧 Current email template tracking status:');
    templates.forEach(template => {
      console.log(`   ${template.name}: ${template.trackingEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    });
    
  } catch (error) {
    console.error('❌ Error enabling email tracking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableEmailTracking();