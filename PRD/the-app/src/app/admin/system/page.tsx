import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SystemDashboard from './SystemDashboard';

export default async function SystemPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  if (!hasPermission(session, 'system', 'config')) {
    redirect('/admin');
  }

  // Get system statistics
  const [
    totalUsers,
    activeUsers,
    totalTowns,
    totalPersons,
    totalComments,
    pendingComments,
    approvedComments,
    recentUsers,
    recentComments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.town.count(),
    prisma.person.count(),
    prisma.comment.count(),
    prisma.comment.count({ where: { isApproved: false } }),
    prisma.comment.count({ where: { isApproved: true } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    }),
    prisma.comment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            town: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const systemStats = {
    totalUsers,
    activeUsers,
    totalTowns,
    totalPersons,
    totalComments,
    pendingComments,
    approvedComments,
    recentUsers,
    recentComments,
  };

  return <SystemDashboard systemStats={systemStats} />;
}
