'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const commentSchema = z.object({
  personId: z.string().min(1, 'Person ID is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  content: z.string().optional().or(z.literal('')),
  wantsToHelpMore: z.boolean().default(false),
  displayNameOnly: z.boolean().default(false),
  requiresFamilyApproval: z.boolean().default(true),
});

export async function submitComment(
  prevState: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
  },
  formData: FormData
) {
  try {
    const rawData = {
      personId: formData.get('personId') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      content: formData.get('content') as string,
      wantsToHelpMore: formData.get('wantsToHelpMore') === 'true',
      displayNameOnly: formData.get('displayNameOnly') === 'true',
      requiresFamilyApproval: formData.get('requiresFamilyApproval') === 'true',
    };

    const validatedData = commentSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const data = validatedData.data;

    // Check if person exists and is active
    const person = await prisma.person.findFirst({
      where: {
        id: data.personId,
        isActive: true,
      },
    });

    if (!person) {
      return {
        success: false,
        error: 'Person not found or no longer active',
      };
    }

    // Create the comment
    await prisma.comment.create({
      data: {
        personId: data.personId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        content: data.content || '',
        wantsToHelpMore: data.wantsToHelpMore,
        displayNameOnly: data.displayNameOnly,
        requiresFamilyApproval: data.requiresFamilyApproval,
        type: 'support',
        visibility: 'public',
        isActive: true,
        isApproved: false, // Requires approval
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error submitting comment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

export async function approveComment(
  commentId: string,
  moderatorNotes?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
    },
  });

  return { success: true };
}

export async function rejectComment(commentId: string, moderatorNotes: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isActive: false,
      moderatorNotes,
    },
  });

  return { success: true };
}

export async function updateCommentAndApprove(
  commentId: string,
  content: string,
  moderatorNotes?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
    },
  });

  return { success: true };
}

export async function approveBulkComments(commentIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await prisma.comment.updateMany({
      where: { id: { in: commentIds } },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
    });

    revalidatePath('/admin/comments');
    return { success: true };
  } catch (error) {
    console.error('Failed to approve bulk comments:', error);
    return { success: false, error: 'Failed to approve comments' };
  }
}

export async function rejectBulkComments(
  commentIds: string[],
  moderatorNotes: string
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await prisma.comment.updateMany({
      where: { id: { in: commentIds } },
      data: {
        isApproved: false,
        approvedAt: new Date(),
        approvedBy: session.user.id,
        moderatorNotes,
      },
    });

    revalidatePath('/admin/comments');
    return { success: true };
  } catch (error) {
    console.error('Failed to reject bulk comments:', error);
    return { success: false, error: 'Failed to reject comments' };
  }
}