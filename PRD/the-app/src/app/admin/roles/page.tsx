import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasRole } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import RolesGrid from './RolesGrid';

export default async function RolesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasRole(session, 'site-admin')) {
    redirect('/admin');
  }

  const roles = await prisma.role.findMany({
    include: {
      userRoles: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return <RolesGrid initialRoles={roles} />;
}
