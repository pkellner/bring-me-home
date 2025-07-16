'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';
import { validateImageBuffer } from '@/lib/image-utils';
import { processAndStoreImage } from '@/lib/image-storage';

const detentionCenterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  facilityType: z.string().min(1, 'Facility type is required').max(100),
  operatedBy: z.string().max(200).optional(),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(50),
  zipCode: z.string().min(1, 'ZIP code is required').max(20),
  country: z.string().default('USA'),
  phoneNumber: z.string().max(50).optional(),
  faxNumber: z.string().max(50).optional(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  capacity: z.coerce.number().int().positive().optional(),
  currentPopulation: z.coerce.number().int().nonnegative().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isActive: z.boolean().optional(),
  isICEFacility: z.boolean().optional(),
  notes: z.string().max(5000).optional(),
  transportInfo: z.string().max(2000).optional(),
  visitingHours: z.string().max(1000).optional(),
});

export async function createDetentionCenter(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = detentionCenterSchema.safeParse({
    name: formData.get('name'),
    facilityType: formData.get('facilityType'),
    operatedBy: formData.get('operatedBy') || undefined,
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zipCode: formData.get('zipCode'),
    country: formData.get('country') || 'USA',
    phoneNumber: formData.get('phoneNumber') || undefined,
    faxNumber: formData.get('faxNumber') || undefined,
    emailAddress: formData.get('emailAddress') || undefined,
    website: formData.get('website') || undefined,
    capacity: formData.get('capacity') || undefined,
    currentPopulation: formData.get('currentPopulation') || undefined,
    latitude: formData.get('latitude') || undefined,
    longitude: formData.get('longitude') || undefined,
    isActive: formData.get('isActive') === 'on',
    isICEFacility: formData.get('isICEFacility') === 'on',
    notes: formData.get('notes') || undefined,
    transportInfo: formData.get('transportInfo') || undefined,
    visitingHours: formData.get('visitingHours') || undefined,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Process empty strings to null
    if (validatedFields.data.emailAddress === '') {
      validatedFields.data.emailAddress = undefined;
    }
    if (validatedFields.data.website === '') {
      validatedFields.data.website = undefined;
    }

    // Handle image upload
    let processedImageId: string | undefined;
    const facilityImage = formData.get('facilityImage') as File;
    if (facilityImage && facilityImage.size > 0) {
      const buffer = Buffer.from(await facilityImage.arrayBuffer());

      // Validate image
      const isValidImage = await validateImageBuffer(buffer);
      if (!isValidImage) {
        return {
          errors: {
            _form: ['Invalid image file'],
          },
        };
      }

      // Process and store images
      const { imageId } = await processAndStoreImage(buffer);
      processedImageId = imageId;
    }

    const detentionCenter = await prisma.detentionCenter.create({
      data: {
        ...validatedFields.data,
        imageId: processedImageId,
      },
    });

    revalidatePath('/admin/detention-centers');
    return { success: true, detentionCenter };
  } catch (error) {
    console.error('Failed to create detention center:', error);
    return {
      errors: {
        _form: ['Failed to create detention center'],
      },
    };
  }
}

export async function updateDetentionCenter(
  id: string,
  formData: FormData
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'update')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = detentionCenterSchema.safeParse({
    name: formData.get('name'),
    facilityType: formData.get('facilityType'),
    operatedBy: formData.get('operatedBy') || undefined,
    address: formData.get('address'),
    city: formData.get('city'),
    state: formData.get('state'),
    zipCode: formData.get('zipCode'),
    country: formData.get('country') || 'USA',
    phoneNumber: formData.get('phoneNumber') || undefined,
    faxNumber: formData.get('faxNumber') || undefined,
    emailAddress: formData.get('emailAddress') || undefined,
    website: formData.get('website') || undefined,
    capacity: formData.get('capacity') || undefined,
    currentPopulation: formData.get('currentPopulation') || undefined,
    latitude: formData.get('latitude') || undefined,
    longitude: formData.get('longitude') || undefined,
    isActive: formData.get('isActive') === 'on',
    isICEFacility: formData.get('isICEFacility') === 'on',
    notes: formData.get('notes') || undefined,
    transportInfo: formData.get('transportInfo') || undefined,
    visitingHours: formData.get('visitingHours') || undefined,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Process empty strings to null
    if (validatedFields.data.emailAddress === '') {
      validatedFields.data.emailAddress = undefined;
    }
    if (validatedFields.data.website === '') {
      validatedFields.data.website = undefined;
    }

    // Get existing detention center to preserve image if not updating
    const existingCenter = await prisma.detentionCenter.findUnique({
      where: { id },
      select: { imageId: true },
    });

    // Handle image upload
    let processedImageId = existingCenter?.imageId;
    const facilityImage = formData.get('facilityImage') as File;
    const removeImage = formData.get('removeImage') === 'true';
    
    if (removeImage) {
      // Delete existing images if requested
      processedImageId = null;
      if (existingCenter?.imageId) {
        await prisma.$transaction([
          prisma.imageStorage.deleteMany({
            where: {
              id: existingCenter.imageId,
            },
          }),
        ]);
      }
    } else if (facilityImage && facilityImage.size > 0) {
      const buffer = Buffer.from(await facilityImage.arrayBuffer());

      // Validate image
      const isValidImage = await validateImageBuffer(buffer);
      if (!isValidImage) {
        return {
          errors: {
            _form: ['Invalid image file'],
          },
        };
      }

      // Delete old images first if they exist
      if (existingCenter?.imageId) {
        await prisma.$transaction([
          prisma.imageStorage.deleteMany({
            where: {
              id: existingCenter.imageId,
            },
          }),
        ]);
      }

      // Process and store new images
      const { imageId } = await processAndStoreImage(buffer);
      processedImageId = imageId;
      console.log('Update - New image ID:', { imageId });
    } else {
      console.log('Update - No new image uploaded, keeping existing ID:', { imageId: processedImageId });
    }

    const detentionCenter = await prisma.detentionCenter.update({
      where: { id },
      data: {
        ...validatedFields.data,
        imageId: processedImageId,
      },
    });

    revalidatePath('/admin/detention-centers');
    revalidatePath(`/admin/detention-centers/${id}/edit`);
    
    console.log('Updated detention center with imageId:', {
      id: detentionCenter.id,
      imageId: detentionCenter.imageId,
    });
    
    return { success: true, detentionCenter };
  } catch (error) {
    console.error('Failed to update detention center:', error);
    return {
      errors: {
        _form: ['Failed to update detention center'],
      },
    };
  }
}

export async function deleteDetentionCenter(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'delete')) {
    throw new Error('Unauthorized');
  }

  try {
    // Get the detention center to find associated images
    const detentionCenter = await prisma.detentionCenter.findUnique({
      where: { id },
      select: { imageId: true },
    });

    if (detentionCenter?.imageId) {
      // Delete associated images
      await prisma.$transaction([
        prisma.imageStorage.deleteMany({
          where: {
            id: detentionCenter.imageId,
          },
        }),
        prisma.detentionCenter.delete({
          where: { id },
        }),
      ]);
    } else {
      await prisma.detentionCenter.delete({
        where: { id },
      });
    }

    revalidatePath('/admin/detention-centers');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete detention center:', error);
    return { success: false, error: 'Failed to delete detention center' };
  }
}

export async function updateDetentionCenterVisibility(
  centerId: string,
  isActive: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.detentionCenter.update({
      where: { id: centerId },
      data: { isActive },
    });

    revalidatePath('/admin/detention-centers');
    return { success: true };
  } catch (error) {
    console.error('Failed to update detention center visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}

export async function duplicateDetentionCenter(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    throw new Error('Unauthorized');
  }

  try {
    const original = await prisma.detentionCenter.findUnique({
      where: { id },
      select: {
        name: true,
        facilityType: true,
        operatedBy: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        phoneNumber: true,
        faxNumber: true,
        emailAddress: true,
        website: true,
        capacity: true,
        currentPopulation: true,
        latitude: true,
        longitude: true,
        isActive: true,
        isICEFacility: true,
        notes: true,
        transportInfo: true,
        visitingHours: true,
        imageId: true,
      },
    });

    if (!original) {
      throw new Error('Detention center not found');
    }

    // Determine new image IDs if the original has images
    let newImageId: string | null = null;
    const imageIds: string[] = [];
    if (original.imageId) imageIds.push(original.imageId);

    if (imageIds.length > 0) {
      // Copy images to new records
      const images = await prisma.imageStorage.findMany({
        where: { id: { in: imageIds } },
      });

      const newImages = await Promise.all(
        images.map(image =>
          prisma.imageStorage.create({
            data: {
              data: image.data,
              mimeType: image.mimeType,
              size: image.size,
              width: image.width,
              height: image.height,
            },
          })
        )
      );

      // Map old IDs to new IDs
      if (original.imageId) {
        newImageId = newImages[0].id;
      }
    }

    const duplicate = await prisma.detentionCenter.create({
      data: {
        ...original,
        name: `${original.name} (Copy)`,
        imageId: newImageId,
      },
    });

    revalidatePath('/admin/detention-centers');
    return { success: true, detentionCenter: duplicate };
  } catch (error) {
    console.error('Failed to duplicate detention center:', error);
    return { success: false, error: 'Failed to duplicate detention center' };
  }
}

export async function searchDetentionCenters(query: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'read')) {
    throw new Error('Unauthorized');
  }

  try {
    const centers = await prisma.detentionCenter.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { city: { contains: query } },
          { state: { contains: query } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        facilityType: true,
        imageId: true,
      },
      take: 10,
    });

    return centers.map((center) => ({
      id: center.id,
      name: center.name,
      city: center.city,
      state: center.state,
      facilityType: center.facilityType,
      facilityImageUrl: center.imageId
        ? `/api/images/${center.imageId}`
        : null,
    }));
  } catch (error) {
    console.error('Failed to search detention centers:', error);
    return [];
  }
}

export async function deleteEmptyDetentionCenters(state?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'delete')) {
    throw new Error('Unauthorized');
  }

  try {
    // Find detention centers without detainees
    const emptyDetentionCenters = await prisma.detentionCenter.findMany({
      where: {
        ...(state ? { state } : {}),
        detainees: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        imageId: true,
      },
    });

    // Collect image IDs to delete
    const imageIds = emptyDetentionCenters
      .map(center => center.imageId)
      .filter((id): id is string => id !== null);

    // Delete in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete detention centers
      const deleteResult = await tx.detentionCenter.deleteMany({
        where: {
          id: {
            in: emptyDetentionCenters.map(center => center.id),
          },
        },
      });

      // Delete associated images
      if (imageIds.length > 0) {
        await tx.imageStorage.deleteMany({
          where: {
            id: {
              in: imageIds,
            },
          },
        });
      }

      return deleteResult;
    });

    revalidatePath('/admin/detention-centers');
    return { 
      success: true, 
      count: result.count,
      centers: emptyDetentionCenters.map(c => c.name)
    };
  } catch (error) {
    console.error('Failed to delete empty detention centers:', error);
    return { success: false, error: 'Failed to delete detention centers' };
  }
}