'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getSystemConfig(key: string) {
  const config = await prisma.systemConfig.findUnique({
    where: { key },
  });

  return config?.value || null;
}

export async function getSystemLayoutTheme() {
  const [layoutConfig, themeConfig] = await Promise.all([
    prisma.systemConfig.findUnique({
      where: { key: 'SYSTEM_DEFAULT_LAYOUT' },
    }),
    prisma.systemConfig.findUnique({
      where: { key: 'SYSTEM_DEFAULT_THEME' },
    }),
  ]);

  return {
    layout: layoutConfig?.value || process.env.SYSTEM_DEFAULT_LAYOUT || 'grid',
    theme: themeConfig?.value || process.env.SYSTEM_DEFAULT_THEME || 'default',
  };
}

export async function updateSystemDefaults(layout: string, theme: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }

  // Check if user has system:config permission
  const hasPermission = session.user.roles?.some(role => {
    try {
      const permissions = JSON.parse(role.permissions || '{}');
      return (
        permissions.system?.includes('config') || role.name === 'site-admin'
      );
    } catch {
      return false;
    }
  });

  if (!hasPermission) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    // Update or create layout config
    await prisma.systemConfig.upsert({
      where: { key: 'SYSTEM_DEFAULT_LAYOUT' },
      update: { value: layout },
      create: {
        key: 'SYSTEM_DEFAULT_LAYOUT',
        value: layout,
        description: 'System default layout override',
        dataType: 'string',
      },
    });

    // Update or create theme config
    await prisma.systemConfig.upsert({
      where: { key: 'SYSTEM_DEFAULT_THEME' },
      update: { value: theme },
      create: {
        key: 'SYSTEM_DEFAULT_THEME',
        value: theme,
        description: 'System default theme override',
        dataType: 'string',
      },
    });

    // Revalidate all pages to reflect the changes
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error) {
    console.error('Failed to update system defaults:', error);
    return { success: false, error: 'Failed to update system defaults' };
  }
}

export async function getAllSystemConfigs() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return [];
  }

  // Check if user has system:config permission
  const hasPermission = session.user.roles?.some(role => {
    try {
      const permissions = JSON.parse(role.permissions || '{}');
      return (
        permissions.system?.includes('config') || role.name === 'site-admin'
      );
    } catch {
      return false;
    }
  });

  if (!hasPermission) {
    return [];
  }

  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  });

  return configs;
}
