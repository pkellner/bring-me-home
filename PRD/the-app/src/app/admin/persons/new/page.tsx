import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import PersonForm from '../PersonForm';

export default async function NewPersonPage() {
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'persons', 'create')) {
    redirect('/admin');
  }

  const towns = await prisma.town.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Add New Person</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <PersonForm towns={towns} session={session} />
      </div>
    </div>
  );
}
