'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';
import { createTownSlug } from '@/lib/slug-utils';

const townSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  county: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  fullAddress: z.string().min(1, 'Full address is required'),
  description: z.string().max(1000).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  defaultThemeId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function createTown(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'towns', 'create')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = townSchema.safeParse({
    name: formData.get('name'),
    state: formData.get('state'),
    county: formData.get('county') || undefined,
    zipCode: formData.get('zipCode') || undefined,
    fullAddress: formData.get('fullAddress'),
    description: formData.get('description') || undefined,
    latitude: formData.get('latitude')
      ? parseFloat(formData.get('latitude') as string)
      : undefined,
    longitude: formData.get('longitude')
      ? parseFloat(formData.get('longitude') as string)
      : undefined,
    defaultThemeId: formData.get('defaultThemeId') || undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Get existing town slugs to ensure uniqueness
    const existingTowns = await prisma.town.findMany({
      select: { slug: true },
    });
    const existingSlugs = existingTowns.map(t => t.slug);

    // Generate unique slug
    const slug = createTownSlug(validatedFields.data.name, existingSlugs);

    await prisma.town.create({
      data: {
        ...validatedFields.data,
        slug,
      },
    });

    revalidatePath('/admin/towns');
    return { success: true };
  } catch (error) {
    console.error('Failed to create town:', error);
    return {
      errors: { _form: ['Failed to create town. Slug may already exist.'] },
    };
  }
}

export async function updateTown(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'towns', 'update')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = townSchema.safeParse({
    name: formData.get('name'),
    state: formData.get('state'),
    county: formData.get('county') || undefined,
    zipCode: formData.get('zipCode') || undefined,
    fullAddress: formData.get('fullAddress'),
    description: formData.get('description') || undefined,
    latitude: formData.get('latitude')
      ? parseFloat(formData.get('latitude') as string)
      : undefined,
    longitude: formData.get('longitude')
      ? parseFloat(formData.get('longitude') as string)
      : undefined,
    defaultThemeId: formData.get('defaultThemeId') || undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Get existing town to check if name changed
    const existingTown = await prisma.town.findUnique({
      where: { id },
      select: { name: true, slug: true },
    });

    if (!existingTown) {
      throw new Error('Town not found');
    }

    let slug = existingTown.slug;

    // If name changed, check if we need a new slug
    if (existingTown.name !== validatedFields.data.name) {
      // First, generate the base slug to see if it would be different
      const baseSlug = createTownSlug(validatedFields.data.name, []);

      // Only generate a new slug if the base would be different from current
      // This handles case-only changes where the slug would remain the same
      if (baseSlug !== existingTown.slug) {
        const existingTowns = await prisma.town.findMany({
          where: { id: { not: id } }, // Exclude current town
          select: { slug: true },
        });
        const existingSlugs = existingTowns.map(t => t.slug);

        slug = createTownSlug(validatedFields.data.name, existingSlugs);
      }
    }

    await prisma.town.update({
      where: { id },
      data: {
        ...validatedFields.data,
        slug,
      },
    });

    revalidatePath('/admin/towns');
    revalidatePath(`/admin/towns/${id}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update town:', error);
    return {
      errors: { _form: ['Failed to update town. Slug may already exist.'] },
    };
  }
}

export async function deleteTown(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'towns', 'delete')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.town.delete({
      where: { id },
    });

    revalidatePath('/admin/towns');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete town:', error);
    return {
      errors: {
        _form: ['Failed to delete town. It may have associated persons.'],
      },
    };
  }
}

export async function toggleTownVisibility(townId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'towns', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.town.update({
      where: { id: townId },
      data: { isActive },
    });

    revalidatePath('/admin/towns');
    return { success: true };
  } catch (error) {
    console.error('Failed to update town visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}

export async function updateBulkTownVisibility(
  townIds: string[],
  isActive: boolean
) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'towns', 'update')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.town.updateMany({
      where: { id: { in: townIds } },
      data: { isActive },
    });

    revalidatePath('/admin/towns');
    return { success: true };
  } catch (error) {
    console.error('Failed to update bulk town visibility:', error);
    return { success: false, error: 'Failed to update visibility' };
  }
}
