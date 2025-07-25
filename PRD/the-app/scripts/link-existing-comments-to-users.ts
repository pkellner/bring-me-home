#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  try {
    console.log('Linking existing comments to users...\n');

    // Get all comments with emails that don't have a userId
    const commentsWithoutUser = await prisma.comment.findMany({
      where: {
        email: {
          not: null,
        },
        userId: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    console.log(`Found ${commentsWithoutUser.length} comments without linked users`);

    let linkedCount = 0;
    let createdCount = 0;

    for (const comment of commentsWithoutUser) {
      if (!comment.email) continue;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: comment.email },
        select: { id: true },
      });

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        linkedCount++;
        console.log(`  - Linking comment ${comment.id} to existing user ${userId}`);
      } else {
        // Create new user
        const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(7), 10);
        const newUser = await prisma.user.create({
          data: {
            username: comment.email,
            email: comment.email,
            password: tempPassword,
            firstName: comment.firstName || undefined,
            lastName: comment.lastName || undefined,
            isActive: true,
          },
        });
        userId = newUser.id;
        createdCount++;
        console.log(`  - Created new user ${userId} for comment ${comment.id}`);
      }

      // Update comment with userId
      await prisma.comment.update({
        where: { id: comment.id },
        data: { userId },
      });
    }

    console.log(`\nSummary:`);
    console.log(`- Total comments processed: ${commentsWithoutUser.length}`);
    console.log(`- Comments linked to existing users: ${linkedCount}`);
    console.log(`- New users created: ${createdCount}`);

  } catch (error) {
    console.error('Error linking comments to users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();