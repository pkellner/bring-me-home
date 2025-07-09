import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, hasRole } from '@/lib/permissions';
import Link from 'next/link';

export default async function DebugPage() {
  const session = await getServerSession(authOptions);

  const permissions = {
    usersRead: hasPermission(session, 'users', 'read'),
    townsRead: hasPermission(session, 'towns', 'read'),
    personsRead: hasPermission(session, 'persons', 'read'),
    commentsRead: hasPermission(session, 'comments', 'read'),
    systemConfig: hasPermission(session, 'system', 'config'),
    isSiteAdmin: hasRole(session, 'site-admin'),
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Debug Session Info</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Session Data</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Permissions Check</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
          {JSON.stringify(permissions, null, 2)}
        </pre>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Direct Links</h2>
        <div className="space-y-2">
          <Link href="/admin" className="block text-blue-600 hover:underline">
            Admin Dashboard
          </Link>
          <Link href="/admin/users" className="block text-blue-600 hover:underline">
            Users
          </Link>
          <Link href="/admin/persons" className="block text-blue-600 hover:underline">
            Persons
          </Link>
          <Link href="/admin/towns" className="block text-blue-600 hover:underline">
            Towns
          </Link>
          <Link href="/admin/comments" className="block text-blue-600 hover:underline">
            Comments
          </Link>
          <Link href="/admin/roles" className="block text-blue-600 hover:underline">
            Roles
          </Link>
          <Link href="/admin/system" className="block text-blue-600 hover:underline">
            System
          </Link>
        </div>
      </div>
    </div>
  );
}