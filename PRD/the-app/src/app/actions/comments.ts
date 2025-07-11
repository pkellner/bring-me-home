'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { hasPermission, hasPersonAccess, isSiteAdmin } from '@/lib/permissions';

const commentSchema = z.object({
  personId: z.string().min(1, 'Person ID is required'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  occupation: z.string().optional().or(z.literal('')),
  birthdate: z.string().optional().or(z.literal('')),
  streetAddress: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().max(2).optional().or(z.literal('')),
  zipCode: z.string().max(10).optional().or(z.literal('')),
  content: z.string().max(500).optional().or(z.literal('')),
  wantsToHelpMore: z.boolean().default(false),
  displayNameOnly: z.boolean().default(false),
  requiresFamilyApproval: z.boolean().default(true),
  showOccupation: z.boolean().default(false),
  showBirthdate: z.boolean().default(false),
  showCityState: z.boolean().default(false),
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
      occupation: formData.get('occupation') as string,
      birthdate: formData.get('birthdate') as string,
      streetAddress: formData.get('streetAddress') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      content: formData.get('content') as string,
      wantsToHelpMore: formData.get('wantsToHelpMore') === 'true',
      displayNameOnly: formData.get('displayNameOnly') === 'true',
      requiresFamilyApproval: formData.get('requiresFamilyApproval') === 'true',
      showOccupation: formData.get('showOccupation') === 'true',
      showBirthdate: formData.get('showBirthdate') === 'true',
      showCityState: formData.get('showCityState') === 'true',
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
        occupation: data.occupation || null,
        birthdate: data.birthdate ? new Date(data.birthdate) : null,
        streetAddress: data.streetAddress || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        content: data.content || '',
        wantsToHelpMore: data.wantsToHelpMore,
        displayNameOnly: data.displayNameOnly,
        requiresFamilyApproval: data.requiresFamilyApproval,
        showOccupation: data.showOccupation,
        showBirthdate: data.showBirthdate,
        showCityState: data.showCityState,
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

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    throw new Error('Insufficient permissions');
  }

  // Get the comment with person info to check access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { person: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, comment.personId, 'write')) {
    throw new Error('No access to this person');
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

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    throw new Error('Insufficient permissions');
  }

  // Get the comment with person info to check access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { person: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Check if user has access to this person (unless they're a site admin)
  if (!isSiteAdmin(session) && !hasPersonAccess(session, comment.personId, 'write')) {
    throw new Error('No access to this person');
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
  moderatorNotes?: string,
  additionalFields?: {
    occupation?: string;
    birthdate?: string;
    showOccupation?: boolean;
    showBirthdate?: boolean;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    throw new Error('Insufficient permissions');
  }

  // Only site admins can edit comment content
  if (!isSiteAdmin(session)) {
    throw new Error('Only site admins can edit comment content');
  }

  // Get the comment with person info to check access
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { person: true },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      content,
      isApproved: true,
      approvedAt: new Date(),
      approvedBy: session.user.id,
      moderatorNotes: moderatorNotes || null,
      ...(additionalFields && {
        occupation: additionalFields.occupation || null,
        birthdate: additionalFields.birthdate
          ? new Date(additionalFields.birthdate)
          : null,
        showOccupation: additionalFields.showOccupation ?? false,
        showBirthdate: additionalFields.showBirthdate ?? false,
      }),
    },
  });

  return { success: true };
}

export async function approveBulkComments(commentIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // If not site admin, verify access to all comments
    if (!isSiteAdmin(session)) {
      const comments = await prisma.comment.findMany({
        where: { id: { in: commentIds } },
        select: { personId: true },
      });

      // Check if user has write access to all persons
      for (const comment of comments) {
        if (!hasPersonAccess(session, comment.personId, 'write')) {
          return { success: false, error: 'No access to some persons' };
        }
      }
    }

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

  // Check if user has permission to update comments
  if (!hasPermission(session, 'comments', 'update')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // If not site admin, verify access to all comments
    if (!isSiteAdmin(session)) {
      const comments = await prisma.comment.findMany({
        where: { id: { in: commentIds } },
        select: { personId: true },
      });

      // Check if user has write access to all persons
      for (const comment of comments) {
        if (!hasPersonAccess(session, comment.personId, 'write')) {
          return { success: false, error: 'No access to some persons' };
        }
      }
    }

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

export async function toggleCommentStatus(
  commentId: string,
  isApproved: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'comments', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    // Get the comment with person info to check access
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { personId: true },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if user has access to this person (unless they're a site admin)
    if (!isSiteAdmin(session) && !hasPersonAccess(session, comment.personId, 'write')) {
      throw new Error('No access to this person');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isApproved,
        approvedAt: isApproved ? new Date() : null,
        approvedBy: isApproved ? session.user.id : null,
      },
    });

    revalidatePath('/admin/comments');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle comment status:', error);
    return { success: false, error: 'Failed to update comment status' };
  }
}
