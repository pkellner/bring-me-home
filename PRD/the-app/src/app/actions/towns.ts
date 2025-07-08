'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

const townSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().max(1000).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  isActive: z.boolean().optional(),
});

export async function createTown(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'towns', 'create')) {
    throw new Error('Unauthorized');
  }

  const name = formData.get('name') as string;
  const state = (formData.get('state') as string) || 'California';
  const fullAddress = `${name}, ${state}, USA`;

  const validatedFields = townSchema.safeParse({
    name,
    state,
    slug: formData.get('slug'),
    description: formData.get('description'),
    latitude: formData.get('latitude')
      ? parseFloat(formData.get('latitude') as string)
      : undefined,
    longitude: formData.get('longitude')
      ? parseFloat(formData.get('longitude') as string)
      : undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.town.create({
      data: {
        ...validatedFields.data,
        fullAddress,
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

  const name = formData.get('name') as string;
  const state = (formData.get('state') as string) || 'California';
  const fullAddress = `${name}, ${state}, USA`;

  const validatedFields = townSchema.safeParse({
    name,
    state,
    slug: formData.get('slug'),
    description: formData.get('description'),
    latitude: formData.get('latitude')
      ? parseFloat(formData.get('latitude') as string)
      : undefined,
    longitude: formData.get('longitude')
      ? parseFloat(formData.get('longitude') as string)
      : undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.town.update({
      where: { id },
      data: {
        ...validatedFields.data,
        fullAddress,
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
