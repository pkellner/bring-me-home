import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { serializePrismaObject } from '@/lib/serialize-prisma';
import DetentionCenterForm from '../../DetentionCenterForm';

export default async function EditDetentionCenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'detentionCenters', 'update')) {
    redirect('/admin');
  }

  const detentionCenter = await prisma.detentionCenter.findUnique({
    where: { id },
  });

  if (!detentionCenter) {
    redirect('/admin/detention-centers');
  }

  // Serialize the detention center to handle Decimal types
  const serializedDetentionCenter = serializePrismaObject(detentionCenter);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Edit Detention Center
      </h1>
      <div className="bg-white shadow rounded-lg p-6">
        <DetentionCenterForm detentionCenter={serializedDetentionCenter} />
      </div>
    </div>
  );
}