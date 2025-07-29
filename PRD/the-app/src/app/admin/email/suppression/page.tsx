import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isSiteAdmin } from '@/lib/permissions';
import SuppressionGrid from './SuppressionGrid';
import { getSuppressionList } from '@/lib/email-suppression';

export default async function EmailSuppressionPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    redirect('/admin');
  }
  
  // Get initial suppression data
  const suppressionData = await getSuppressionList({
    page: 1,
    limit: 50,
  });
  
  // Serialize dates for client component
  const serializedSuppressions = suppressionData.suppressions.map(suppression => ({
    ...suppression,
    createdAt: suppression.createdAt.toISOString(),
    updatedAt: suppression.updatedAt.toISOString(),
  }));
  
  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Suppression List</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage email addresses that should not receive emails due to bounces, complaints, or manual suppression.
          </p>
        </div>
      </div>
      
      <SuppressionGrid 
        initialSuppressions={serializedSuppressions}
        initialTotal={suppressionData.total}
        initialPage={suppressionData.page}
        initialTotalPages={suppressionData.totalPages}
      />
    </div>
  );
}