'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { z } from 'zod';

const themeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  colors: z.string().min(1, 'Colors are required'),
  cssVars: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function createTheme(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'system', 'config')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = themeSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    colors: formData.get('colors'),
    cssVars: formData.get('cssVars') || undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Validate colors JSON
    JSON.parse(validatedFields.data.colors);

    // Generate CSS variables if not provided
    let cssVars = validatedFields.data.cssVars;
    if (!cssVars) {
      const colors = JSON.parse(validatedFields.data.colors);
      cssVars = `:root {
  --primary: ${colors.primary};
  --secondary: ${colors.secondary};
  --accent: ${colors.accent};
  --background: ${colors.background};
  --text: ${colors.text};
}`;
    }

    await prisma.theme.create({
      data: {
        ...validatedFields.data,
        cssVars,
      },
    });

    revalidatePath('/admin/themes');
    return { success: true };
  } catch (error) {
    console.error('Failed to create theme:', error);
    return {
      errors: {
        _form: ['Failed to create theme. Please check your color values.'],
      },
    };
  }
}

export async function updateTheme(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'system', 'config')) {
    throw new Error('Unauthorized');
  }

  const validatedFields = themeSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    colors: formData.get('colors'),
    cssVars: formData.get('cssVars') || undefined,
    isActive: formData.get('isActive') === 'on',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Validate colors JSON
    JSON.parse(validatedFields.data.colors);

    // Generate CSS variables if not provided
    let cssVars = validatedFields.data.cssVars;
    if (!cssVars) {
      const colors = JSON.parse(validatedFields.data.colors);
      cssVars = `:root {
  --primary: ${colors.primary};
  --secondary: ${colors.secondary};
  --accent: ${colors.accent};
  --background: ${colors.background};
  --text: ${colors.text};
}`;
    }

    await prisma.theme.update({
      where: { id },
      data: {
        ...validatedFields.data,
        cssVars,
      },
    });

    revalidatePath('/admin/themes');
    revalidatePath(`/admin/themes/${id}/edit`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update theme:', error);
    return {
      errors: {
        _form: ['Failed to update theme. Please check your color values.'],
      },
    };
  }
}

export async function deleteTheme(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, 'system', 'config')) {
    throw new Error('Unauthorized');
  }

  try {
    await prisma.theme.delete({
      where: { id },
    });

    revalidatePath('/admin/themes');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete theme:', error);
    return {
      errors: {
        _form: [
          'Failed to delete theme. It may be in use by towns or persons.',
        ],
      },
    };
  }
}
