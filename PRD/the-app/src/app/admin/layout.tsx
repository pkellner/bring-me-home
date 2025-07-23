import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminNavigation from '@/components/admin/AdminNavigation';
import { hasRole } from '@/lib/permissions';
import './admin.css';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  console.log('[AdminLayout] Session exists:', !!session);
  if (session) {
    console.log('[AdminLayout] User:', session.user.username);
    console.log('[AdminLayout] Roles:', session.user.roles?.map(r => r.name));
  }

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if user has any admin role
  const hasAdminRole =
    hasRole(session, 'site-admin') ||
    hasRole(session, 'town-admin') ||
    hasRole(session, 'person-admin');

  console.log('[AdminLayout] Has admin role:', hasAdminRole);
  console.log('[AdminLayout] Role check details:');
  console.log('  - site-admin:', hasRole(session, 'site-admin'));
  console.log('  - town-admin:', hasRole(session, 'town-admin'));
  console.log('  - person-admin:', hasRole(session, 'person-admin'));

  if (!hasAdminRole) {
    console.log('[AdminLayout] No admin role, redirecting to /');
    redirect('/');
  }

  return (
    <div className="admin-container min-h-screen bg-gray-50">
      <AdminNavigation session={session} />
      <main className="py-6">
        <div className="mx-auto w-[90%] px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
