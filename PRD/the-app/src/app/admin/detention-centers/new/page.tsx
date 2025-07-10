import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import DetentionCenterForm from '../DetentionCenterForm';

export default async function NewDetentionCenterPage() {
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    redirect('/admin');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Add New Detention Center
      </h1>
      <div className="bg-white shadow rounded-lg p-6">
        <DetentionCenterForm />
      </div>
    </div>
  );
}
