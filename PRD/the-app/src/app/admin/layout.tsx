import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { hasRole } from '@/lib/permissions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if user has any admin role
  const hasAdminRole =
    hasRole(session, 'site-admin') ||
    hasRole(session, 'town-admin') ||
    hasRole(session, 'person-admin');

  if (!hasAdminRole) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation session={session} />
      <main className="py-6">
        <div className="mx-auto w-[90%] px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
