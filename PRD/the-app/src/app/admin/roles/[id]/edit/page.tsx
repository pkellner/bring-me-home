import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasRole } from '@/lib/permissions';
import Link from '@/components/OptimizedLink';
import { updateRole } from '@/app/actions/roles';
import { prisma } from '@/lib/prisma';

async function updateRoleWithRedirect(id: string, formData: FormData) {
  'use server';
  const result = await updateRole(id, formData);
  if (result.success) {
    redirect('/admin/roles');
  }
}

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !hasRole(session, 'site-admin')) {
    redirect('/admin');
  }

  const role = await prisma.role.findUnique({
    where: { id },
  });

  if (!role) {
    redirect('/admin/roles');
  }

  const updateRoleWithId = updateRoleWithRedirect.bind(null, role.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Role</h1>
        <Link
          href="/admin/roles"
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={updateRoleWithId} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Role Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              defaultValue={role.name}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={role.description || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Link
              href="/admin/roles"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Update Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
