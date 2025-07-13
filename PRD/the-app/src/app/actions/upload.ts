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

    // Determine sequence number for gallery images
    let sequenceNumber = 0;
    if (!isPrimary) {
      const maxSeq = await prisma.personImage.aggregate({
        where: {
          personId,
          imageType: 'gallery',
        },
        _max: {
          sequenceNumber: true,
        },
      });
      sequenceNumber = (maxSeq._max.sequenceNumber ?? -1) + 1;
    }

    // Process and store image in database
    const { imageId } = await processAndStoreImage(buffer, {
      personId,
      imageType: isPrimary ? 'profile' : 'gallery',
      sequenceNumber,
      caption,
      uploadedById: session.user.id,
    });

    // If this is set as primary, delete other profile images
    if (isPrimary) {
      const otherProfileImages = await prisma.personImage.findMany({
        where: {
          personId,
          imageType: 'primary',
          imageId: { not: imageId },
        },
      });
      
      for (const pi of otherProfileImages) {
        await prisma.personImage.delete({
          where: { id: pi.id },
        });
        
        // Check if image is used elsewhere
        const otherUsage = await prisma.personImage.count({
          where: { imageId: pi.imageId },
        });
        
        if (otherUsage === 0) {
          const dcUsage = await prisma.detentionCenterImage.count({
            where: { imageId: pi.imageId },
          });
          
          if (dcUsage === 0) {
            await prisma.imageStorage.delete({
              where: { id: pi.imageId },
            });
          }
        }
      }

      // Also update person's primary picture
      await prisma.person.update({
        where: { id: personId },
        data: { primaryPicture: `/api/images/${imageId}` },
      });
    }

    return {
      success: true,
      imageUrl: `/api/images/${imageId}`,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
