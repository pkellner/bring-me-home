import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isSiteAdmin } from '@/lib/permissions';
import EmailAdminClient from './EmailAdminClient';
import EmailGrid from './EmailGrid';
import { 
  getEmailStats, 
  getEmailNotifications, 
  getPersonsWithEmails,
  sendQueuedEmails,
  retryFailedEmails,
  deleteEmailNotifications,
} from '@/app/actions/email-notifications';

export default async function EmailAdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    redirect('/admin');
  }
  
  const [stats, emails, persons] = await Promise.all([
    getEmailStats(),
    getEmailNotifications(),
    getPersonsWithEmails(),
  ]);
  
  // Serialize dates for client component
  const serializedEmails = emails.map(email => ({
    id: email.id,
    subject: email.subject,
    status: email.status,
    userId: email.userId,
    user: email.user,
    sentTo: email.sentTo,
    person: email.person,
    personHistory: email.personHistory,
    scheduledFor: email.scheduledFor.toISOString(),
    sentAt: email.sentAt?.toISOString() || null,
    lastMailServerMessage: email.lastMailServerMessage,
    lastMailServerMessageDate: email.lastMailServerMessageDate?.toISOString() || null,
    retryCount: email.retryCount,
    createdAt: email.createdAt.toISOString(),
  }));
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Email Notifications</h1>
      
      {/* Statistics and Actions */}
      <EmailAdminClient initialStats={stats} />
      
      {/* Email Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Queue & History</h2>
        <EmailGrid 
          emails={serializedEmails}
          persons={persons}
          onSendSelected={async (emailIds) => {
            'use server';
            await sendQueuedEmails(emailIds);
          }}
          onRetrySelected={async (emailIds) => {
            'use server';
            await retryFailedEmails(emailIds);
          }}
          onDeleteSelected={async (emailIds) => {
            'use server';
            await deleteEmailNotifications(emailIds);
          }}
        />
      </div>
    </div>
  );
}