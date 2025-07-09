import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import TownForm from '../TownForm';

export default async function NewTownPage() {
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'towns', 'create')) {
    redirect('/admin');
  }

  const [layouts, themes] = await Promise.all([
    prisma.layout.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.theme.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create New Town</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <TownForm layouts={layouts} themes={themes} />
      </div>
    </div>
  );
}
