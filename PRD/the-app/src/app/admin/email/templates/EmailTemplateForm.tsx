'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createEmailTemplate, 
  updateEmailTemplate,
} from '@/app/actions/email-templates';
import { getTemplateVariables, replaceTemplateVariables } from '@/lib/email-template-variables';
import EmailPreview from '@/components/admin/EmailPreview';
import { 
  InformationCircleIcon,
  EyeIcon,
  CodeBracketIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface EmailTemplateFormProps {
  template?: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string | null;
    variables: Record<string, unknown> | null;
    isActive: boolean;
  };
}

export default function EmailTemplateForm({ template }: EmailTemplateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [livePreview, setLivePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'html' | 'text'>('html');
  const [templateType, setTemplateType] = useState<'person_update' | 'comment_verification' | 'general'>(
    template?.name.includes('comment') ? 'comment_verification' : 'person_update'
  );
  
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    htmlContent: template?.htmlContent || getDefaultHtmlTemplate(),
    textContent: template?.textContent || '',
    isActive: template?.isActive ?? true,
  });

  const templateVariables = getTemplateVariables(templateType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = template
        ? await updateEmailTemplate(template.id, formData)
        : await createEmailTemplate(formData);

      if (result.success) {
        router.push('/admin/email/templates');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save template');
      }
    });
  };

  // Generate sample data based on template type
  const getSampleData = useCallback(() => {
    const baseData = {
      recipientName: 'John Doe',
      recipientEmail: 'john.doe@example.com',
      currentDate: new Date().toLocaleDateString(),
      siteUrl: process.env.NEXTAUTH_URL || 'https://bring-me-home.com',
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
  }, [templateType]);

  const handlePreview = () => {
    setShowPreview(true);
  };

  return (
    <div className={livePreview ? 'grid grid-cols-2 gap-6' : ''}>
      {/* Form Column */}
      <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Template Information</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="template-type" className="block text-sm font-medium text-gray-700">
              Template Type
            </label>
            <select
              id="template-type"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as typeof templateType)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="person_update">Person Update</option>
              <option value="comment_verification">Comment Verification</option>
              <option value="general">General</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Template type determines which variables are available
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Template Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Email Subject
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Update on {{personName}}"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
      </div>

      {/* Template Content */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Template Content</h2>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('html')}
              className={`px-3 py-1 text-sm font-medium rounded ${
                activeTab === 'html'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CodeBracketIcon className="h-4 w-4 inline mr-1" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1 text-sm font-medium rounded ${
                activeTab === 'text'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DocumentTextIcon className="h-4 w-4 inline mr-1" />
              Plain Text
            </button>
          </div>
        </div>

        {activeTab === 'html' ? (
          <div>
            <label htmlFor="htmlContent" className="block text-sm font-medium text-gray-700 mb-2">
              HTML Content
            </label>
            <textarea
              id="htmlContent"
              value={formData.htmlContent}
              onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
              rows={20}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono text-xs"
              required
            />
          </div>
        ) : (
          <div>
            <label htmlFor="textContent" className="block text-sm font-medium text-gray-700 mb-2">
              Plain Text Content (Optional)
            </label>
            <textarea
              id="textContent"
              value={formData.textContent}
              onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
              rows={20}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-mono text-xs"
              placeholder="Leave empty to auto-generate from HTML"
            />
          </div>
        )}
      </div>

      {/* Available Variables */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-2" />
          Available Template Variables
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {Object.entries(templateVariables).map(([variable, description]) => (
            <div key={variable}>
              <code className="text-blue-700 bg-blue-100 px-2 py-1 rounded">
                {`{{${variable}}}`}
              </code>
              <span className="text-blue-600 ml-2 text-xs">{description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => router.push('/admin/email/templates')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => setLivePreview(!livePreview)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {livePreview ? 'Hide' : 'Show'} Live Preview
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Full Preview
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>

      {/* Email Preview Modal */}
      <EmailPreview
        subject={formData.subject}
        htmlContent={formData.htmlContent}
        textContent={formData.textContent}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        sampleData={getSampleData()}
        onRefresh={() => {
          // Force re-render with current form data
          setShowPreview(false);
          setTimeout(() => setShowPreview(true), 10);
        }}
      />
    </form>

    {/* Live Preview Column */}
    {livePreview && (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Live Preview</h2>
            <button
              type="button"
              onClick={() => setLivePreview(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Hide Preview
            </button>
          </div>
          <div className="border rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <iframe
              srcDoc={wrapEmailForPreview(formData.subject, formData.htmlContent, getSampleData())}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
              title="Live Email Preview"
            />
          </div>
        </div>
      </div>
    )}
  </div>
  );
}

function getDefaultHtmlTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{subject}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4299e1;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f7fafc;
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background-color: #4299e1;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #718096;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Update on {{personName}}</h1>
  </div>
  
  <div class="content">
    <p>Dear {{recipientName}},</p>
    
    <p>{{updateDescription}}</p>
    
    <p>Posted on {{updateDate}}</p>
    
    <div style="text-align: center;">
      <a href="{{profileUrl}}" class="button">View Profile</a>
    </div>
  </div>
  
  <div class="footer">
    <p>You're receiving this email because you've shown support for {{personName}}.</p>
    <p>
      <strong>Email Preferences:</strong><br>
      To stop receiving updates about {{personName}}, <a href="{{personOptOutUrl}}">click here</a>.<br>
      To stop receiving all emails from Bring Me Home, <a href="{{allOptOutUrl}}">click here</a>.
    </p>
    <p style="margin-top: 20px; font-size: 11px; color: #a0aec0;">
      These unsubscribe links expire after 2 weeks. If the links have expired, you can manage your preferences by logging into your account at bring-me-home.com or using the links in a more recent email.
    </p>
  </div>
</body>
</html>`;
}

// Helper function to wrap email content for live preview
function wrapEmailForPreview(subject: string, htmlContent: string, sampleData: Record<string, unknown>) {
  const processedSubject = replaceTemplateVariables(subject, sampleData);
  const processedHtml = replaceTemplateVariables(htmlContent, sampleData);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${processedSubject}</title>
      <style>
        body {
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .email-header {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 20px;
          margin: -20px -20px 20px -20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .email-subject {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        .email-meta {
          font-size: 13px;
          color: #666;
          margin-top: 8px;
        }
        .email-content {
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        /* Disable all interactions */
        a, button {
          pointer-events: none;
          cursor: default;
        }
      </style>
    </head>
    <body>
      <div class="email-header">
        <h1 class="email-subject">${processedSubject}</h1>
        <div class="email-meta">
          <strong>From:</strong> Bring Me Home &lt;noreply@bring-me-home.com&gt;<br>
          <strong>To:</strong> ${sampleData.recipientEmail}<br>
          <strong>Date:</strong> ${new Date().toLocaleString()}
        </div>
      </div>
      <div class="email-content">
        ${processedHtml}
      </div>
    </body>
    </html>
  `;
}