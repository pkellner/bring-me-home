'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { CreateUserSchema } from '@/schemas/user';
import { revalidatePath } from 'next/cache';

export async function registerUser(formData: FormData) {
  const rawData = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
  };

  const validation = CreateUserSchema.safeParse(rawData);
  if (!validation.success) {
    return {
      error: 'Invalid input data',
      details: validation.error.issues,
    };
  }

  const { username, email, password, firstName, lastName } = validation.data;

  try {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { error: 'Username already exists' };
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return { error: 'Email already exists' };
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        isActive: true,
      },
    });

    // Assign default viewer role
    const viewerRole = await prisma.role.findUnique({
      where: { name: 'viewer' },
    });

    if (viewerRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: viewerRole.id,
        },
      });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTRATION',
        entityType: 'User',
        entityId: user.id,
        newValues: JSON.stringify({
          username,
          email,
          firstName,
          lastName,
        }),
      },
    });

    revalidatePath('/admin/users');
    return { success: true, user: { id: user.id, username: user.username } };
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Registration failed' };
  }
}

export async function updateUserLastLogin(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}
