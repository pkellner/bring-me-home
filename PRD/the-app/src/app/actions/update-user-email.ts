'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isSiteAdmin } from '@/lib/permissions';
import { z } from 'zod';

const updateEmailSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  newEmail: z.string().email('Invalid email format'),
});

export async function updateUserEmail(userId: string, newEmail: string) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only allow site admins or users updating their own email
    const isAdmin = isSiteAdmin(session);
    const isOwnAccount = session.user.id === userId;
    
    if (!isAdmin && !isOwnAccount) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate input
    const validated = updateEmailSchema.parse({ userId, newEmail });

    // Check if email is already in use
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.newEmail.toLowerCase() },
    });

    if (existingUser && existingUser.id !== userId) {
      return { success: false, error: 'Email already in use' };
    }

    // Update the user's email
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email: validated.newEmail.toLowerCase() },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    // Log the update for seed data maintenance
    console.log(`
===========================================
EMAIL UPDATE - Update seed data if needed:
===========================================
User: ${updatedUser.username}
Old Email: Check database logs
New Email: ${updatedUser.email}

If this is a seeded user, update prisma/seed.ts:
- Search for the username '${updatedUser.username}'
- Update the email field to '${updatedUser.email}'
===========================================
    `);

    return { 
      success: true, 
      user: updatedUser,
      message: 'Email updated successfully',
    };
  } catch (error) {
    console.error('Error updating user email:', error);
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.issues[0].message 
      };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update email' 
    };
  }
}

// Helper function to get seed data update instructions
export async function getSeedDataUpdateInstructions(username: string, newEmail: string) {
  return `
To update seed data for user '${username}':

1. Open prisma/seed.ts
2. Find the user creation/upsert for username: '${username}'
3. Update the email field to: '${newEmail}'
4. Run: npm run db:seed (if you want to apply the change)

Example:
  await prisma.user.upsert({
    where: { username: '${username}' },
    update: {},
    create: {
      username: '${username}',
      email: '${newEmail}', // <-- Update this line
      // ... other fields
    },
  });
`;
}