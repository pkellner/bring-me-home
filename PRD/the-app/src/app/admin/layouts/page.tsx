import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import LayoutsGrid from './LayoutsGrid';

export default async function LayoutsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'system', 'config')) {
    redirect('/admin');
  }

  const layouts = await prisma.layout.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const canCreate = hasPermission(session, 'system', 'config');
  const canUpdate = hasPermission(session, 'system', 'config');
  const canDelete = hasPermission(session, 'system', 'config');

  return (
    <LayoutsGrid
      initialLayouts={layouts}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
    />
  );
}