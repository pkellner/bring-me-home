import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { deleteDetentionCenter } from '@/app/actions/detention-centers';
import DeleteButton from './DeleteButton';
import BulkDeleteButton from './BulkDeleteButton';
import Image from 'next/image';

export default async function DetentionCentersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !hasPermission(session, 'detentionCenters', 'read')) {
    redirect('/admin');
  }

  const detentionCenters = await prisma.detentionCenter.findMany({
    include: {
      _count: {
        select: {
          detainees: true,
        },
      },
    },
    orderBy: [
      { state: 'asc' },
      { city: 'asc' },
      { name: 'asc' },
    ],
  });

  // Group detention centers by state
  const centersByState = detentionCenters.reduce((acc, center) => {
    if (!acc[center.state]) {
      acc[center.state] = [];
    }
    acc[center.state].push(center);
    return acc;
  }, {} as Record<string, typeof detentionCenters>);

  async function deleteCenter(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteDetentionCenter(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Detention Centers</h1>
        {hasPermission(session, 'detentionCenters', 'create') && (
          <div className="flex space-x-3">
            <Link
              href="/admin/detention-centers/import"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Import from ICE
            </Link>
            <Link
              href="/admin/detention-centers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="mr-2 -ml-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Detention Center
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">Total Centers</p>
              <p className="text-2xl font-bold">{detentionCenters.length}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">Active Centers</p>
              <p className="text-2xl font-bold">
                {detentionCenters.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">ICE Facilities</p>
              <p className="text-2xl font-bold">
                {detentionCenters.filter(c => c.isICEFacility).length}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-600">Total Detainees</p>
              <p className="text-2xl font-bold">
                {detentionCenters.reduce((sum, c) => sum + c._count.detainees, 0)}
              </p>
            </div>
          </div>
          
          {hasPermission(session, 'detentionCenters', 'delete') && 
           detentionCenters.some(c => c._count.detainees === 0) && (
            <div className="mt-4 flex justify-end">
              <BulkDeleteButton 
                label={`Delete All Empty Centers (${detentionCenters.filter(c => c._count.detainees === 0).length})`}
                className="px-3 py-1 border border-red-300 rounded-md hover:bg-red-50"
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          {Object.entries(centersByState).map(([state, centers]) => (
            <div key={state} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {state} ({centers.length} center{centers.length !== 1 ? 's' : ''})
                </h2>
                {hasPermission(session, 'detentionCenters', 'delete') && 
                 centers.some(c => c._count.detainees === 0) && (
                  <BulkDeleteButton 
                    state={state}
                    label={`Delete Empty (${centers.filter(c => c._count.detainees === 0).length})`}
                    className="text-sm"
                  />
                )}
              </div>
              <div className="grid gap-4">
                {centers.map(center => (
                  <div
                    key={center.id}
                    className="border rounded-lg p-4 flex items-start space-x-4 hover:bg-gray-50"
                  >
                    <div className="flex-shrink-0">
                      {center.thumbnailImageId ? (
                        <Image
                          src={`/api/images/${center.thumbnailImageId}`}
                          alt={center.name}
                          width={120}
                          height={90}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="w-[120px] h-[90px] bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-3xl text-gray-400">🏢</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-medium text-gray-900">
                            {center.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {center.city}, {center.state} {center.zipCode}
                          </p>
                          <div className="mt-1 flex items-center space-x-4 text-sm">
                            <span className="text-gray-500">
                              Type: {center.facilityType}
                            </span>
                            {center.operatedBy && (
                              <span className="text-gray-500">
                                Operated by: {center.operatedBy}
                              </span>
                            )}
                            <span className={center.isActive ? 'text-green-600' : 'text-red-600'}>
                              {center.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-indigo-600">
                            {center._count.detainees} detainee{center._count.detainees !== 1 ? 's' : ''}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          {hasPermission(session, 'detentionCenters', 'update') && (
                            <Link
                              href={`/admin/detention-centers/${center.id}/edit`}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              Edit
                            </Link>
                          )}
                          {hasPermission(session, 'detentionCenters', 'delete') && center._count.detainees === 0 && (
                            <DeleteButton action={deleteCenter} id={center.id} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {detentionCenters.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No detention centers
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new detention center.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}