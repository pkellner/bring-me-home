#!/usr/bin/env tsx

import { prisma } from '../src/lib/prisma';
import { EmailStatus } from '@prisma/client';

async function main() {
  try {
    console.log('Processing QUEUED emails...\n');
    
    // Update QUEUED emails to SENDING
    const result = await prisma.emailNotification.updateMany({
      where: { 
        status: EmailStatus.QUEUED,
        scheduledFor: {
          lte: new Date()
        }
      },
      data: { 
        status: EmailStatus.SENDING 
      }
    });
    
    console.log(`Updated ${result.count} emails from QUEUED to SENDING status`);
    
    // Now trigger the cron job endpoint
    if (result.count > 0) {
      console.log('\nTriggering email send process...');
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      
      try {
        const response = await fetch(`${baseUrl}/api/cron/send-emails`, {
          method: 'GET',
          headers: {
            'x-cron-secret': process.env.CRON_SECRET || ''
          }
        });
        
        const data = await response.json();
        console.log('Cron job response:', data);
      } catch (error) {
        console.error('Error calling cron job:', error);
        console.log('\nYou can manually visit http://localhost:3000/api/cron/send-emails to process emails');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();