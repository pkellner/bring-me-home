#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function checkOrphanedTokens() {
  try {
    // Get all comment verification tokens
    const tokens = await prisma.commentVerificationToken.findMany({
      select: { email: true }
    });

    // Get all user emails
    const users = await prisma.user.findMany({
      select: { email: true }
    });
    
    const userEmails = new Set(users.map(u => u.email).filter(Boolean));
    
    // Find tokens for non-existent users
    const orphanedTokens = tokens.filter(t => !userEmails.has(t.email));
    
    console.log(`Total tokens: ${tokens.length}`);
    console.log(`Total users: ${users.length}`);
    console.log(`Orphaned tokens: ${orphanedTokens.length}`);
    
    if (orphanedTokens.length > 0) {
      console.log('\nOrphaned token emails:');
      orphanedTokens.forEach(t => console.log(`  - ${t.email}`));
      
      console.log('\nTo clean up these orphaned tokens, run:');
      console.log('npx tsx scripts/cleanup-orphaned-tokens.ts');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrphanedTokens();