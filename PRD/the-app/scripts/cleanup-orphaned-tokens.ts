#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import { findTokensWithoutUser } from '../src/lib/comment-verification';

async function cleanupOrphanedTokens() {
  try {
    // Get all user emails
    const users = await prisma.user.findMany({
      select: { email: true }
    });
    
    const tokens = await prisma.commentVerificationToken.findMany({
      select: { id: true, email: true }
    });

    // Delete tokens for non-existent users. The orphans are found in code with both sides in
    // normal form and deleted by id: a `notIn` of normalised emails would delete the tokens of
    // users whose stored email differs in case.
    const orphans = findTokensWithoutUser(tokens, users.map(u => u.email));
    const result = await prisma.commentVerificationToken.deleteMany({
      where: { id: { in: orphans.map(t => t.id) } }
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