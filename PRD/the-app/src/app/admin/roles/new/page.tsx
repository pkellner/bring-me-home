import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasRole } from '@/lib/permissions';
import Link from '@/components/OptimizedLink';
import { createRole } from '@/app/actions/roles';

async function createRoleWithRedirect(formData: FormData) {
  'use server';
  const result = await createRole(formData);
  if (result.success) {
    redirect('/admin/roles');
  }
}

export default async function NewRolePage() {
  const session = await getServerSession(authOptions);

  if (!session || !hasRole(session, 'site-admin')) {
    redirect('/admin');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Create New Role</h1>
        <Link
          href="/admin/roles"
          className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={createRoleWithRedirect} className="space-y-6">
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., content-editor"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Describe the purpose of this role"
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
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
