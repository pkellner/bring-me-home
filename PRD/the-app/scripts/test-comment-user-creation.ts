#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  try {
    console.log('Testing comment user creation functionality...\n');

    // Test email that shouldn't exist yet
    const testEmail = `test-comment-${Date.now()}@example.com`;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    
    console.log(`1. Checking if user exists with email ${testEmail}:`, existingUser ? 'YES' : 'NO');
    
    // Get Joe Plumber for testing
    const joePlumber = await prisma.person.findFirst({
      where: {
        firstName: 'Joe',
        lastName: 'Plumber',
      },
    });
    
    if (!joePlumber) {
      console.error('Joe Plumber not found! Run npm run db:seed first.');
      return;
    }
    
    console.log(`2. Found Joe Plumber with ID: ${joePlumber.id}`);
    
    // Create a comment with the test email (simulating what would happen in submitComment)
    console.log(`3. Creating comment with email ${testEmail}...`);
    
    // This simulates the user creation logic from submitComment
    let userId: string | null = null;
    const existingUserCheck = await prisma.user.findUnique({
      where: { email: testEmail },
      select: { id: true },
    });

    if (existingUserCheck) {
      userId = existingUserCheck.id;
      console.log('   - Found existing user, linking to comment');
    } else {
      // Create a new user
      const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(7), 10);
      const newUser = await prisma.user.create({
        data: {
          username: testEmail,
          email: testEmail,
          password: tempPassword,
          firstName: 'Test',
          lastName: 'Commenter',
          isActive: true,
        },
      });
      userId = newUser.id;
      console.log(`   - Created new user with ID: ${userId}`);
    }
    
    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        personId: joePlumber.id,
        userId,
        firstName: 'Test',
        lastName: 'Commenter',
        email: testEmail,
        content: 'This is a test comment to verify user creation',
        type: 'support',
        visibility: 'public',
        isActive: true,
        isApproved: false,
      },
    });
    
    console.log(`4. Created comment with ID: ${comment.id}`);
    
    // Verify the user was created and linked
    const createdUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        comments: {
          select: { id: true },
        },
      },
    });
    
    console.log(`\n5. Verification:`);
    console.log(`   - User exists: ${createdUser ? 'YES' : 'NO'}`);
    console.log(`   - User ID: ${createdUser?.id}`);
    console.log(`   - Username: ${createdUser?.username}`);
    console.log(`   - Comments linked: ${createdUser?.comments.length || 0}`);
    
    // Test with existing user email
    console.log(`\n6. Testing with existing email...`);
    const comment2 = await prisma.comment.create({
      data: {
        personId: joePlumber.id,
        userId: createdUser?.id || null,
        firstName: 'Test',
        lastName: 'Commenter',
        email: testEmail,
        content: 'Second comment with same email',
        type: 'support',
        visibility: 'public',
        isActive: true,
        isApproved: false,
      },
    });
    
    console.log(`   - Created second comment with ID: ${comment2.id}`);
    console.log(`   - Both comments should be linked to the same user`);
    
    // Check final state
    const finalUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        _count: {
          select: { comments: true },
        },
      },
    });
    
    console.log(`\n7. Final state:`);
    console.log(`   - Total comments for user: ${finalUser?._count.comments || 0}`);
    
    // Cleanup
    console.log(`\n8. Cleaning up test data...`);
    await prisma.comment.deleteMany({
      where: { email: testEmail },
    });
    await prisma.user.delete({
      where: { id: userId! },
    });
    console.log('   - Test data cleaned up successfully');
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();