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
    capacity: formData.get('capacity')
      ? Number(formData.get('capacity'))
      : undefined,
    currentPopulation: formData.get('currentPopulation')
      ? Number(formData.get('currentPopulation'))
      : undefined,
    latitude: formData.get('latitude')
      ? Number(formData.get('latitude'))
      : undefined,
    longitude: formData.get('longitude')
      ? Number(formData.get('longitude'))
      : undefined,
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
    // Handle facility image upload
    let facilityImageId: string | undefined;
    let thumbnailImageId: string | undefined;

    const facilityImageFile = formData.get('facilityImage') as File;
    if (facilityImageFile && facilityImageFile.size > 0) {
      const buffer = Buffer.from(await facilityImageFile.arrayBuffer());

      // Validate image
      const isValid = await validateImageBuffer(buffer);
      if (!isValid) {
        return {
          errors: { facilityImage: ['Invalid image file'] },
        };
      }

      // Process and store images
      const { fullImageId, thumbnailImageId: thumbId } =
        await processAndStoreImage(buffer);

      facilityImageId = fullImageId;
      thumbnailImageId = thumbId;
    }

    const detentionCenter = await prisma.detentionCenter.create({
      data: {
        ...validatedFields.data,
        facilityImageId,
        thumbnailImageId,
      },
    });

    revalidatePath('/admin/detention-centers');
    return { success: true, detentionCenter };
  } catch (error) {
    console.error('Failed to create detention center:', error);
    return {
      errors: { _form: ['Failed to create detention center'] },
    };
  }
}

export async function updateDetentionCenter(id: string, formData: FormData) {
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
    capacity: formData.get('capacity')
      ? Number(formData.get('capacity'))
      : undefined,
    currentPopulation: formData.get('currentPopulation')
      ? Number(formData.get('currentPopulation'))
      : undefined,
    latitude: formData.get('latitude')
      ? Number(formData.get('latitude'))
      : undefined,
    longitude: formData.get('longitude')
      ? Number(formData.get('longitude'))
      : undefined,
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
    // Get existing detention center to check for old images
    const existingCenter = await prisma.detentionCenter.findUnique({
      where: { id },
      select: { facilityImageId: true, thumbnailImageId: true },
    });

    // Handle facility image upload
    let facilityImageId = existingCenter?.facilityImageId;
    let thumbnailImageId = existingCenter?.thumbnailImageId;

    const facilityImageFile = formData.get('facilityImage') as File;
    if (facilityImageFile && facilityImageFile.size > 0) {
      const buffer = Buffer.from(await facilityImageFile.arrayBuffer());

      // Validate image
      const isValid = await validateImageBuffer(buffer);
      if (!isValid) {
        return {
          errors: { facilityImage: ['Invalid image file'] },
        };
      }

      // Delete old images if they exist
      if (existingCenter?.facilityImageId) {
        await prisma.imageStorage.deleteMany({
          where: {
            id: {
              in: [
                existingCenter.facilityImageId,
                existingCenter.thumbnailImageId,
              ].filter(Boolean) as string[],
            },
          },
        });
      }

      // Process and store new images
      const { fullImageId, thumbnailImageId: thumbId } =
        await processAndStoreImage(buffer);

      facilityImageId = fullImageId;
      thumbnailImageId = thumbId;
    }

    const updateData = {
      ...validatedFields.data,
      facilityImageId,
      thumbnailImageId,
    };

    const detentionCenter = await prisma.detentionCenter.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/admin/detention-centers');
    revalidatePath(`/admin/detention-centers/${id}/edit`);
    return { success: true, detentionCenter };
  } catch (error) {
    console.error('Failed to update detention center:', error);
    return {
      errors: { _form: ['Failed to update detention center'] },
    };
  }
}

export async function deleteDetentionCenter(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'delete')) {
    throw new Error('Unauthorized');
  }

  try {
    // Check if there are any persons assigned to this detention center
    const detaineesCount = await prisma.person.count({
      where: { detentionCenterId: id },
    });

    if (detaineesCount > 0) {
      return {
        errors: {
          _form: [
            `Cannot delete detention center with ${detaineesCount} assigned detainee(s)`,
          ],
        },
      };
    }

    // Get detention center to find images to delete
    const detentionCenter = await prisma.detentionCenter.findUnique({
      where: { id },
      select: { facilityImageId: true, thumbnailImageId: true },
    });

    // Delete images if they exist
    if (detentionCenter?.facilityImageId) {
      await prisma.imageStorage.deleteMany({
        where: {
          id: {
            in: [
              detentionCenter.facilityImageId,
              detentionCenter.thumbnailImageId,
            ].filter(Boolean) as string[],
          },
        },
      });
    }

    // Delete the detention center
    await prisma.detentionCenter.delete({
      where: { id },
    });

    revalidatePath('/admin/detention-centers');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete detention center:', error);
    return {
      errors: {
        _form: ['Failed to delete detention center'],
      },
    };
  }
}

export async function deleteEmptyDetentionCenters(state?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'detentionCenters', 'delete')) {
    throw new Error('Unauthorized');
  }

  try {
    // Find all detention centers without detainees
    const where: {
      detainees: { none: Record<string, never> };
      state?: string;
    } = {
      detainees: {
        none: {},
      },
    };

    if (state) {
      where.state = state;
    }

    const emptyDetentionCenters = await prisma.detentionCenter.findMany({
      where,
      select: {
        id: true,
        name: true,
        facilityImageId: true,
        thumbnailImageId: true,
      },
    });

    if (emptyDetentionCenters.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No empty detention centers found',
      };
    }

    // Collect all image IDs to delete
    const imageIds: string[] = [];
    emptyDetentionCenters.forEach(center => {
      if (center.facilityImageId) imageIds.push(center.facilityImageId);
      if (center.thumbnailImageId) imageIds.push(center.thumbnailImageId);
    });

    // Delete images if any exist
    if (imageIds.length > 0) {
      await prisma.imageStorage.deleteMany({
        where: {
          id: {
            in: imageIds,
          },
        },
      });
    }

    // Delete all empty detention centers
    const deleteResult = await prisma.detentionCenter.deleteMany({
      where,
    });

    revalidatePath('/admin/detention-centers');

    return {
      success: true,
      deletedCount: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} empty detention center(s)`,
      deletedNames: emptyDetentionCenters.map(c => c.name),
    };
  } catch (error) {
    console.error('Failed to delete empty detention centers:', error);
    return {
      errors: {
        _form: ['Failed to delete empty detention centers'],
      },
    };
  }
}

export async function searchDetentionCenters(searchParams: {
  query?: string;
  state?: string;
  city?: string;
  isActive?: boolean;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error('Unauthorized');
  }

  const where: {
    OR?: Array<{
      name?: { contains: string; mode: 'insensitive' };
      city?: { contains: string; mode: 'insensitive' };
      address?: { contains: string; mode: 'insensitive' };
    }>;
    state?: string;
    city?: { contains: string; mode: 'insensitive' };
    isActive?: boolean;
    isICEFacility?: boolean;
  } = {};

  if (searchParams.query) {
    where.OR = [
      { name: { contains: searchParams.query, mode: 'insensitive' } },
      { city: { contains: searchParams.query, mode: 'insensitive' } },
      { address: { contains: searchParams.query, mode: 'insensitive' } },
    ];
  }

  if (searchParams.state) {
    where.state = searchParams.state;
  }

  if (searchParams.city) {
    where.city = { contains: searchParams.city, mode: 'insensitive' };
  }

  if (searchParams.isActive !== undefined) {
    where.isActive = searchParams.isActive;
  }

  const detentionCenters = await prisma.detentionCenter.findMany({
    where,
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      facilityType: true,
      facilityImageId: true,
      thumbnailImageId: true,
      _count: {
        select: {
          detainees: true,
        },
      },
    },
    orderBy: [{ state: 'asc' }, { city: 'asc' }, { name: 'asc' }],
  });

  return detentionCenters;
}
