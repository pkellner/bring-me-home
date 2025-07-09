'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const commentSchema = z.object({
  personId: z.string().min(1, 'Person ID is required'),
  content: z
    .string()
    .min(10, 'Comment must be at least 10 characters long')
    .max(2000, 'Comment must be less than 2000 characters'),
  visibility: z.enum(['public', 'supporters', 'family', 'private'], {
    errorMap: () => ({ message: 'Invalid visibility level' }),
  }),
});

export async function submitComment(
  prevState: {
    success?: boolean;
    error?: string;
    errors?: {
      content?: string[];
      visibility?: string[];
    };
  },
  formData: FormData
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to submit a comment',
      };
    }

    const rawData = {
      personId: formData.get('personId') as string,
      content: formData.get('content') as string,
      visibility: formData.get('visibility') as string,
    };

    const validatedData = commentSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { personId, content, visibility } = validatedData.data;

    // Check if person exists and is active
    const person = await prisma.person.findFirst({
      where: {
        id: personId,
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
        content,
        visibility,
        personId,
        authorId: session.user.id,
        isActive: true,
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
