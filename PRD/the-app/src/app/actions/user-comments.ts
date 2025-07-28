'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isSiteAdmin, isTownAdmin } from '@/lib/permissions';

interface PersonGroup {
  person: {
    id: string;
    name: string;
    slug: string;
    townSlug: string;
  };
  comments: Array<{
    id: string;
    content: string | null;
    createdAt: Date;
    hideRequested: boolean;
    isActive: boolean;
    isApproved: boolean;
  }>;
}

export async function getUserComments(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  // Allow users to view their own comments or admins to view any user's comments
  if (session.user.id !== userId && !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    return { comments: [], groupedByPerson: {} };
  }

  const comments = await prisma.comment.findMany({
    where: { email: user.email },
    include: {
      person: {
        include: {
          town: true,
        },
      },
    },
    orderBy: [
      { person: { firstName: 'asc' } },
      { createdAt: 'desc' },
    ],
  });

  // Group comments by person
  const groupedByPerson = comments.reduce((acc, comment) => {
    const personKey = comment.person.id;
    if (!acc[personKey]) {
      acc[personKey] = {
        person: {
          id: comment.person.id,
          name: `${comment.person.firstName} ${comment.person.lastName}`,
          slug: comment.person.slug,
          townSlug: comment.person.town.slug,
        },
        comments: [],
      };
    }
    acc[personKey].comments.push({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      hideRequested: comment.hideRequested,
      isActive: comment.isActive,
      isApproved: comment.isApproved,
    });
    return acc;
  }, {} as Record<string, PersonGroup>);

  return {
    comments: comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      hideRequested: c.hideRequested,
      isActive: c.isActive,
      isApproved: c.isApproved,
      personName: `${c.person.firstName} ${c.person.lastName}`,
      personSlug: c.person.slug,
      townSlug: c.person.town.slug,
    })),
    groupedByPerson,
  };
}

export async function toggleCommentVisibility(commentId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  // Allow users to toggle their own comments or admins to toggle any user's comments
  if (session.user.id !== userId && !isSiteAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error('User email not found');
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      email: user.email,
    },
    include: {
      person: {
        include: { town: true },
      },
    },
  });

  if (!comment) {
    throw new Error('Comment not found or unauthorized');
  }

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      hideRequested: !comment.hideRequested,
      hideRequestedAt: !comment.hideRequested ? new Date() : null,
    },
  });

  revalidatePath('/profile');
  revalidatePath(`/${comment.person.town.slug}/${comment.person.slug}`);
  
  return { success: true };
}

export async function deleteUserComment(commentId: string, userId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  // Allow users to delete their own comments or admins to delete any user's comments
  if (session.user.id !== userId && !isSiteAdmin(session) && !isTownAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error('User email not found');
  }

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      email: user.email,
    },
    include: {
      person: {
        include: { town: true },
      },
    },
  });

  if (!comment) {
    throw new Error('Comment not found or unauthorized');
  }

  // Soft delete by setting isActive to false
  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isActive: false,
    },
  });

  revalidatePath('/profile');
  revalidatePath(`/${comment.person.town.slug}/${comment.person.slug}`);
  
  return { success: true };
}

export async function bulkUpdateComments(
  action: 'hide' | 'show' | 'delete',
  userId: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  // Allow users to bulk update their own comments or admins to bulk update any user's comments
  if (session.user.id !== userId && !isSiteAdmin(session) && !isTownAdmin(session)) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    throw new Error('User email not found');
  }

  switch (action) {
    case 'hide':
      await prisma.comment.updateMany({
        where: { email: user.email },
        data: {
          hideRequested: true,
          hideRequestedAt: new Date(),
        },
      });
      break;
    case 'show':
      await prisma.comment.updateMany({
        where: { email: user.email },
        data: {
          hideRequested: false,
          hideRequestedAt: null,
        },
      });
      break;
    case 'delete':
      await prisma.comment.updateMany({
        where: { email: user.email },
        data: {
          isActive: false,
        },
      });
      break;
  }

  revalidatePath('/profile');
  
  return { success: true };
}