#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function cleanupOrphanedTokens() {
  try {
    // Get all user emails
    const users = await prisma.user.findMany({
      select: { email: true }
    });
    
    const userEmails = new Set(users.map(u => u.email).filter(Boolean) as string[]);
    
    // Delete tokens for non-existent users
    const result = await prisma.commentVerificationToken.deleteMany({
      where: {
        email: {
          notIn: Array.from(userEmails)
        }
      }
    });
    
    console.log(`Deleted ${result.count} orphaned comment verification tokens`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ask for confirmation
console.log('This will delete comment verification tokens for users that no longer exist.');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

setTimeout(() => {
  cleanupOrphanedTokens();
}, 5000);