import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { isSiteAdmin } from '@/lib/permissions';
import Link from 'next/link';
import { getEmailTemplate } from '@/app/actions/email-templates';
import EmailTemplateForm from '../../EmailTemplateForm';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface EditEmailTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmailTemplatePage({ params }: EditEmailTemplatePageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !isSiteAdmin(session)) {
    redirect('/admin');
  }
  
  const { id } = await params;
  const template = await getEmailTemplate(id);
  
  if (!template) {
    notFound();
  }
  
  // Serialize the template for the client component
  const serializedTemplate = {
    id: template.id,
    name: template.name,
    subject: template.subject,
    htmlContent: template.htmlContent,
    textContent: template.textContent,
    variables: template.variables as Record<string, unknown> | null,
    isActive: template.isActive,
  };
  
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/email/templates"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Templates
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Email Template</h1>
      
      <EmailTemplateForm template={serializedTemplate} />
    </div>
  );
}