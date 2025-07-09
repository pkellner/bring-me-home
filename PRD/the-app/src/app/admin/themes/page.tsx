import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ThemesGrid from './ThemesGrid';

export default async function ThemesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'system', 'config')) {
    redirect('/admin');
  }

  const themes = await prisma.theme.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const canCreate = hasPermission(session, 'system', 'config');
  const canUpdate = hasPermission(session, 'system', 'config');
  const canDelete = hasPermission(session, 'system', 'config');

  return (
    <ThemesGrid
      initialThemes={themes}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}