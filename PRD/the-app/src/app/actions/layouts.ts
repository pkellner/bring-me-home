'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

const layoutSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  template: z.string().min(1, 'Template is required'),
  cssClasses: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function createLayout(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'system', 'config')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = layoutSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    template: formData.get('template'),
    cssClasses: formData.get('cssClasses') || undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Validate template JSON
    JSON.parse(validatedFields.data.template);

    await prisma.layout.create({
      data: validatedFields.data,
    });

    revalidatePath('/admin/layouts');
    return { success: true };
  } catch (error) {
    console.error('Failed to create layout:', error);
    return {
      errors: {
        _form: ['Failed to create layout. Please check your template JSON.'],
      },
    };
  }
}

export async function updateLayout(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'system', 'config')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = layoutSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    template: formData.get('template'),
    cssClasses: formData.get('cssClasses') || undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Validate template JSON
    JSON.parse(validatedFields.data.template);

    await prisma.layout.update({
      where: { id },
      data: validatedFields.data,
    });

    revalidatePath('/admin/layouts');
    revalidatePath(`/admin/layouts/${id}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update layout:', error);
    return {
      errors: {
        _form: ['Failed to update layout. Please check your template JSON.'],
      },
    };
  }
}

export async function deleteLayout(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'system', 'config')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.layout.delete({
      where: { id },
    });

    revalidatePath('/admin/layouts');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete layout:', error);
    return {
      errors: {
        _form: [
          'Failed to delete layout. It may be in use by towns or persons.',
        ],
      },
    };
  }
}
