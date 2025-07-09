import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import PersonForm from '../../PersonForm';

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'persons', 'update')) {
    redirect('/admin');
  }

  const person = await prisma.person.findUnique({
    where: { id },
    include: { 
      town: true,
      detentionCenter: true,
    },
  });

  if (!person) {
    redirect('/admin/persons');
  }

  const towns = await prisma.town.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Person</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <PersonForm person={person} towns={towns} />
      </div>
    </div>
  );
}
