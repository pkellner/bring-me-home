import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { isSiteAdmin } from '@/lib/permissions';
import { getEmailTemplates } from '@/app/actions/email-templates';
import Link from 'next/link';
import EmailTemplatesList from './EmailTemplatesList';

export default async function EmailTemplatesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    redirect('/admin');
  }
  
  const templates = await getEmailTemplates();
  
  // Serialize dates for client component
  const serializedTemplates = templates.map(template => ({
    id: template.id,
    name: template.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }));
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <Link
          href="/admin/email/templates/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create Template
        </Link>
      </div>
      
      <EmailTemplatesList templates={serializedTemplates} />
    </div>
  );
}