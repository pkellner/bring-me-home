#!/usr/bin/env tsx
/**
 * Script to clean up orphaned data from deleted users
 * Run with: npx tsx scripts/cleanup-orphaned-data.ts
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Starting cleanup of orphaned data...\n');

  try {
    // 1. Find comment verification tokens for emails that don't belong to any user
    console.log('1. Checking for orphaned comment verification tokens...');
    const orphanedTokens = await prisma.commentVerificationToken.findMany({
      where: {
        NOT: {
          email: {
            in: await prisma.user.findMany({
              where: { email: { not: null } },
              select: { email: true }
            }).then(users => users.map(u => u.email!))
          }
        }
      }
    });
    
    console.log(`   Found ${orphanedTokens.length} orphaned tokens`);
    
    if (orphanedTokens.length > 0) {
      console.log('   Orphaned tokens for emails:');
      orphanedTokens.forEach(token => {
        console.log(`   - ${token.email}`);
      });
      
      // Delete orphaned tokens
      const deletedTokens = await prisma.commentVerificationToken.deleteMany({
        where: {
          id: { in: orphanedTokens.map(t => t.id) }
        }
      });
      console.log(`   ✓ Deleted ${deletedTokens.count} orphaned tokens\n`);
    }

    // 2. Find comments with emails but no userId (orphaned comments)
    console.log('2. Checking for comments with PII but no user association...');
    const orphanedComments = await prisma.comment.findMany({
      where: {
        userId: null,
        OR: [
          { email: { not: null } },
          { phone: { not: null } },
          { streetAddress: { not: null } }
        ]
      },
      select: {
        id: true,
        email: true,
        phone: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true
      }
    });
    
    console.log(`   Found ${orphanedComments.length} orphaned comments with PII`);
    
    if (orphanedComments.length > 0) {
      // Group by email for summary
      const emailCounts = orphanedComments.reduce((acc, comment) => {
        if (comment.email) {
          acc[comment.email] = (acc[comment.email] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      console.log('   Comments by email:');
      Object.entries(emailCounts).forEach(([email, count]) => {
        console.log(`   - ${email}: ${count} comments`);
      });
      
      // Clear PII from orphaned comments
      const updatedComments = await prisma.comment.updateMany({
        where: {
          id: { in: orphanedComments.map(c => c.id) }
        },
        data: {
          email: null,
          phone: null,
          streetAddress: null,
          city: null,
          state: null,
          zipCode: null
        }
      });
      console.log(`   ✓ Cleared PII from ${updatedComments.count} orphaned comments\n`);
    }

    // 3. AnonymousSupport doesn't store email or PII data
    console.log('3. Anonymous support records do not contain PII data.\n');

    // 4. Summary
    console.log('Cleanup Summary:');
    console.log('================');
    console.log(`Comment verification tokens deleted: ${orphanedTokens.length}`);
    console.log(`Comments with PII cleared: ${orphanedComments.length}`);
    console.log(`Support records with PII cleared: N/A (no PII stored)`);
    console.log('\nCleanup completed successfully!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();