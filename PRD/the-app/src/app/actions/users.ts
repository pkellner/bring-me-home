'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { CreateUserSchema, UpdateUserSchema } from '@/schemas/user';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, 'users', 'create')) {
    return { 
      success: false,
      errors: { _form: ['You do not have permission to create users'] }
    };
  }

  const rawData = {
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
  };

  const validation = CreateUserSchema.safeParse(rawData);
  if (!validation.success) {
    // Format validation errors for display
    const errors: Record<string, string[]> = {};
    validation.error.issues.forEach(issue => {
      const field = issue.path[0] as string;
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(issue.message);
    });
    
    return {
      success: false,
      errors,
    };
  }

  const { username, email, password, firstName, lastName } = validation.data;

  try {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { 
        success: false,
        errors: { username: ['Username already exists'] }
      };
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        return { 
          success: false,
          errors: { email: ['Email already exists'] }
        };
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

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        action: 'CREATE_USER',
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
    console.error('Create user error:', error);
    return { 
      success: false,
      errors: { _form: ['Failed to create user. Please try again.'] }
    };
  }
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, 'users', 'update')) {
    return { error: 'Insufficient permissions' };
  }

  const rawData = {
    username: formData.get('username'),
    email: formData.get('email'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    isActive: formData.get('isActive') === 'true',
  };

  const validation = UpdateUserSchema.extend({
    isActive: z.boolean().optional(),
  }).safeParse(rawData);

  if (!validation.success) {
    return {
      error: 'Invalid input data',
      details: validation.error.issues,
    };
  }

  try {
    // Get current user data for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: true,
        townAccess: true,
        personAccess: true,
      },
    });

    if (!currentUser) {
      return { error: 'User not found' };
    }

    // Check if username already exists (if changing)
    if (
      validation.data.username &&
      validation.data.username !== currentUser.username
    ) {
      const existingUser = await prisma.user.findUnique({
        where: { username: validation.data.username },
      });

      if (existingUser) {
        return { error: 'Username already exists' };
      }
    }

    // Check if email already exists (if changing)
    if (validation.data.email && validation.data.email !== currentUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: validation.data.email },
      });

      if (existingEmail) {
        return { error: 'Email already exists' };
      }
    }

    // Extract roles from form data
    const roleIds = formData.getAll('roles') as string[];
    
    // Extract town access from form data
    const townAccessData: Array<{ townId: string; accessLevel: string }> = [];
    let i = 0;
    while (formData.get(`townAccess[${i}][townId]`)) {
      townAccessData.push({
        townId: formData.get(`townAccess[${i}][townId]`) as string,
        accessLevel: formData.get(`townAccess[${i}][accessLevel]`) as string,
      });
      i++;
    }

    // Extract person access from form data
    const personAccessData: Array<{ personId: string; accessLevel: string }> = [];
    i = 0;
    while (formData.get(`personAccess[${i}][personId]`)) {
      personAccessData.push({
        personId: formData.get(`personAccess[${i}][personId]`) as string,
        accessLevel: formData.get(`personAccess[${i}][accessLevel]`) as string,
      });
      i++;
    }

    // Update user in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update basic user info
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...validation.data,
          email: validation.data.email || null,
        },
      });

      // Update roles
      // First, delete all existing user roles
      await tx.userRole.deleteMany({
        where: { userId },
      });

      // Then create new user roles
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map(roleId => ({
            userId,
            roleId,
          })),
        });
      }

      // Update town access
      // First, delete all existing town access
      await tx.townAccess.deleteMany({
        where: { userId },
      });

      // Then create new town access
      if (townAccessData.length > 0) {
        await tx.townAccess.createMany({
          data: townAccessData.map(access => ({
            userId,
            townId: access.townId,
            accessLevel: access.accessLevel,
          })),
        });
      }

      // Update person access
      // First, delete all existing person access
      await tx.personAccess.deleteMany({
        where: { userId },
      });

      // Then create new person access
      if (personAccessData.length > 0) {
        await tx.personAccess.createMany({
          data: personAccessData.map(access => ({
            userId,
            personId: access.personId,
            accessLevel: access.accessLevel,
          })),
        });
      }

      return user;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: userId,
        oldValues: JSON.stringify({
          username: currentUser.username,
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          isActive: currentUser.isActive,
          roles: currentUser.userRoles.length,
          townAccess: currentUser.townAccess.length,
          personAccess: currentUser.personAccess.length,
        }),
        newValues: JSON.stringify({
          ...validation.data,
          roles: roleIds.length,
          townAccess: townAccessData.length,
          personAccess: personAccessData.length,
        }),
      },
    });

    revalidatePath('/admin/users');
    return {
      success: true,
      user: { id: updatedUser.id, username: updatedUser.username },
    };
  } catch (error) {
    console.error('Update user error:', error);
    return { error: 'Failed to update user' };
  }
}

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, 'users', 'delete')) {
    return { error: 'Insufficient permissions' };
  }

  try {
    // Get user data for audit log
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { error: 'User not found' };
    }

    // Prevent deleting yourself
    if (session?.user?.id === userId) {
      return { error: 'Cannot delete your own account' };
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: userId,
        oldValues: JSON.stringify({
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      },
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { error: 'Failed to delete user' };
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, 'users', 'update')) {
    return { 
      success: false,
      errors: { _form: ['You do not have permission to reset passwords'] }
    };
  }

  if (!newPassword || newPassword.trim().length === 0) {
    return {
      success: false,
      errors: { password: ['Password cannot be empty'] }
    };
  }

  if (newPassword.length < 8) {
    return { 
      success: false,
      errors: { password: ['Password must be at least 8 characters'] }
    };
  }

  try {
    // Get user info for response
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!user) {
      return {
        success: false,
        errors: { _form: ['User not found'] }
      };
    }

    // Hash the password with the same settings as user creation
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        updatedAt: new Date() // Explicitly update timestamp
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        action: 'RESET_PASSWORD',
        entityType: 'User',
        entityId: userId,
      },
    });

    revalidatePath('/admin/users');
    return { 
      success: true,
      user: { username: user.username }
    };
  } catch (error) {
    console.error('Reset password error:', error);
    return { 
      success: false,
      errors: { _form: ['Failed to reset password. Please try again.'] }
    };
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, 'users', 'update')) {
    return { error: 'Insufficient permissions' };
  }

  try {
    // Prevent deactivating yourself
    if (session?.user?.id === userId && !isActive) {
      return { error: 'Cannot deactivate your own account' };
    }

    // Get current user data for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return { error: 'User not found' };
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id,
        action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        entityType: 'User',
        entityId: userId,
        oldValues: JSON.stringify({ isActive: currentUser.isActive }),
        newValues: JSON.stringify({ isActive }),
      },
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Toggle user status error:', error);
    return { error: 'Failed to update user status' };
  }
}

export async function getUsersList(page: number = 1, pageSize: number = 100) {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session, 'users', 'read')) {
    return { error: 'Insufficient permissions' };
  }

  try {
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: pageSize,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
          townAccess: {
            include: {
              town: true,
            },
          },
          personAccess: {
            include: {
              person: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count(),
    ]);

    return {
      success: true,
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('Get users list error:', error);
    return { error: 'Failed to fetch users' };
  }
}
