import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isSiteAdmin } from '@/lib/permissions';
import EmailAdminClient from './EmailAdminClient';
import { getEmailStats } from '@/app/actions/email-notifications';

export default async function EmailAdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    redirect('/admin');
  }
  
  const stats = await getEmailStats();
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Email Notifications</h1>
      <EmailAdminClient initialStats={stats} />
    </div>
  );
}