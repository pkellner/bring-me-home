import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import TownForm from '../../TownForm';

export default async function EditTownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'towns', 'update')) {
    redirect('/admin');
  }

  const town = await prisma.town.findUnique({
    where: { id },
  });

  if (!town) {
    redirect('/admin/towns');
  }

  // Get layouts and themes for the form
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Town</h1>
        <Link
          href="/admin/towns"
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <TownForm town={town} layouts={layouts} themes={themes} />
      </div>
    </div>
  );
}
