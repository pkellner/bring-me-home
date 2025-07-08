import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UsersGrid from './UsersGrid';

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'users', 'read')) {
    redirect('/admin');
  }

  const users = await prisma.user.findMany({
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
  });

  const canCreate = hasPermission(session, 'users', 'create');
  const canEdit = hasPermission(session, 'users', 'update');
  const canDelete = hasPermission(session, 'users', 'delete');

  return (
    <UsersGrid
      initialUsers={users}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );
}
