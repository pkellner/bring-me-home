import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import ImportDetentionCenters from './ImportDetentionCenters';
import { getAvailableStates } from '@/app/actions/scrape-detention-centers';

export default async function ImportDetentionCentersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'detentionCenters', 'create')) {
    redirect('/admin');
  }

  const availableStates = await getAvailableStates();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Detention Centers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Import detention facility data from ICE's official facility list
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <ImportDetentionCenters availableStates={availableStates} />
      </div>
    </div>
  );
}