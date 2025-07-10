'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { validateImageBuffer } from '@/lib/image-utils';
import { processAndStoreImage } from '@/lib/image-storage';

const uploadSchema = z.object({
  personId: z.string().min(1, 'Person ID is required'),
  caption: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadPersonImage(
  prevState: {
    success?: boolean;
    error?: string;
    errors?: {
      personId?: string[];
      caption?: string[];
      isPrimary?: string[];
    };
  },
  formData: FormData
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to upload images',
      };
    }

    const file = formData.get('file') as File;
    if (!file || file.size === 0) {
      return {
        success: false,
        error: 'Please select a file to upload',
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File size must be less than 5MB',
      };
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Only JPEG, PNG, and WebP images are allowed',
      };
    }

    const rawData = {
      personId: formData.get('personId') as string,
      caption: (formData.get('caption') as string) || undefined,
      isPrimary: formData.get('isPrimary') === 'true',
    };

    const validatedData = uploadSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    const { personId, caption, isPrimary } = validatedData.data;

    // Check if person exists and user has permission
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

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate image
    const isValidImage = await validateImageBuffer(buffer);
    if (!isValidImage) {
      return {
        success: false,
        error: 'Invalid image file',
      };
    }

    // Process and store images in database
    const { fullImageId, thumbnailImageId } =
      await processAndStoreImage(buffer);

    // Create the image record
    const personImage = await prisma.personImage.create({
      data: {
        imageUrl: `/api/images/${fullImageId}`,
        thumbnailUrl: `/api/images/${thumbnailImageId}`,
        caption,
        isPrimary,
        personId,
        uploadedById: session.user.id,
        isActive: true,
        fullImageId,
        thumbnailImageId,
      },
    });

    // If this is set as primary, update other images and person record
    if (isPrimary) {
      await prisma.personImage.updateMany({
        where: {
          personId,
          isPrimary: true,
          id: { not: personImage.id },
        },
        data: {
          isPrimary: false,
        },
      });

      // Also update person's primary picture
      await prisma.person.update({
        where: { id: personId },
        data: { primaryPicture: personImage.imageUrl },
      });
    }

    return {
      success: true,
      imageUrl: personImage.imageUrl,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
