'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteEmailTemplate } from '@/app/actions/email-templates';
import EmailPreview from '@/components/admin/EmailPreview';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailTemplatesListProps {
  templates: EmailTemplate[];
}

export default function EmailTemplatesList({ templates }: EmailTemplatesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      const result = await deleteEmailTemplate(template.id);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Template "${template.name}" deleted successfully`,
        });
        router.refresh();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to delete template',
        });
      }
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {message && (
        <div
          className={`p-4 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new email template.</p>
          <div className="mt-6">
            <Link
              href="/admin/email/templates/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Template
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {templates.map((template) => (
            <li key={template.id}>
              <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{template.name}</h3>
                      {template.isActive ? (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircleIcon className="h-3 w-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 truncate">{template.subject}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Created {formatDate(template.createdAt)} • Updated {formatDate(template.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      className="p-2 text-gray-400 hover:text-gray-500"
                      title="Preview"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <Link
                      href={`/admin/email/templates/${template.id}/edit`}
                      className="p-2 text-gray-400 hover:text-gray-500"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(template)}
                      disabled={isPending}
                      className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      
      {/* Email Preview Modal */}
      {previewTemplate && (
        <EmailPreview
          subject={previewTemplate.subject}
          htmlContent={previewTemplate.htmlContent}
          textContent={previewTemplate.textContent}
          isOpen={!!previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          sampleData={getSampleData(previewTemplate.name)}
        />
      )}
    </div>
  );
}

// Generate sample data based on template type
function getSampleData(templateName: string): Record<string, unknown> {
  const templateType = templateName.includes('comment') ? 'comment_verification' : 'person_update';
  
  const baseData = {
    recipientName: 'John Doe',
    recipientEmail: 'john.doe@example.com',
    currentDate: new Date().toLocaleDateString(),
    siteUrl: 'https://bring-me-home.com',
  };

  if (templateType === 'comment_verification') {
    return {
      ...baseData,
      personName: 'Maria Rodriguez',
      personFirstName: 'Maria',
      personLastName: 'Rodriguez',
      townName: 'El Paso',
      commentContent: 'Sending prayers and support to Maria and her family. Stay strong!',
      commentDate: new Date().toLocaleDateString(),
      verificationUrl: 'https://bring-me-home.com/verify/comments?token=abc123',
      hideUrl: 'https://bring-me-home.com/verify/comments?token=abc123&action=hide',
      manageUrl: 'https://bring-me-home.com/profile',
    };
  } else {
    return {
      ...baseData,
      personName: 'Maria Rodriguez',
      personFirstName: 'Maria',
      personLastName: 'Rodriguez',
      townName: 'El Paso',
      updateDescription: 'Maria has been successfully reunited with her family after 3 months. The family is deeply grateful for all the support and prayers during this difficult time.',
      updateDate: new Date().toLocaleDateString(),
      profileUrl: 'https://bring-me-home.com/el-paso/maria-rodriguez',
      personOptOutUrl: 'https://bring-me-home.com/unsubscribe?person=maria-rodriguez',
      allOptOutUrl: 'https://bring-me-home.com/unsubscribe?all=true',
    };
  }
}