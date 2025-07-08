'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasRole } from '@/lib/permissions';
import { z } from 'zod';

const roleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().max(255).optional(),
});

export async function createRole(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasRole(session, 'site-admin')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = roleSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.role.create({
      data: {
        ...validatedFields.data,
        permissions: JSON.stringify([]),
      },
    });

    revalidatePath('/admin/roles');
    return { success: true };
  } catch (error) {
    console.error('Failed to create role:', error);
    return {
      errors: { _form: ['Failed to create role'] },
    };
  }
}

export async function updateRole(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasRole(session, 'site-admin')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = roleSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.role.update({
      where: { id },
      data: validatedFields.data,
    });

    revalidatePath('/admin/roles');
    revalidatePath(`/admin/roles/${id}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update role:', error);
    return {
      errors: { _form: ['Failed to update role'] },
    };
  }
}

export async function deleteRole(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasRole(session, 'site-admin')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.role.delete({
      where: { id },
    });

    revalidatePath('/admin/roles');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete role:', error);
    return {
      errors: { _form: ['Failed to delete role. It may be in use.'] },
    };
  }
}
