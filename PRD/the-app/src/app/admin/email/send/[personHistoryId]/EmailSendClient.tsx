'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/OptimizedLink';
import { sendUpdateEmail } from '@/app/actions/email-notifications';
import { getEmailTemplates } from '@/app/actions/email-templates';
import { format } from 'date-fns';
import { replaceTemplateVariables } from '@/lib/email-template-variables';
import { 
  EnvelopeIcon, 
  UserGroupIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  town: {
    name: string;
    state: string;
    slug: string;
  };
  primaryImageUrl: string | null;
}

interface Update {
  id: string;
  personId: string;
  title: string;
  description: string;
  date: string;
  person: Person;
}

interface Follower {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface EmailSendClientProps {
  update: Update;
  followers: Follower[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  isActive: boolean;
}

export default function EmailSendClient({ update, followers }: EmailSendClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailsSent, setEmailsSent] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customHtmlContent, setCustomHtmlContent] = useState('');
  const [customTextContent, setCustomTextContent] = useState('');
  const [useCustomContent, setUseCustomContent] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(
    new Set(followers.map(f => f.id))
  );
  
  const personName = `${update.person.firstName} ${update.person.lastName}`;
  const profileUrl = `${process.env.NEXT_PUBLIC_URL || ''}/${update.person.town.slug}/${update.person.slug}`;

  // Helper function to format email display
  const formatEmailDisplay = (follower: Follower) => {
    const name = follower.firstName || follower.lastName 
      ? `${follower.firstName || ''} ${follower.lastName || ''}`.trim()
      : 'Anonymous';
    return `${name} <${follower.email}>`;
  };

  // Handle follower selection
  const handleFollowerToggle = (followerId: string) => {
    setSelectedFollowers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(followerId)) {
        newSet.delete(followerId);
      } else {
        newSet.add(followerId);
      }
      return newSet;
    });
  };

  // Select/deselect all
  const handleSelectAll = () => {
    if (selectedFollowers.size === followers.length) {
      setSelectedFollowers(new Set());
    } else {
      setSelectedFollowers(new Set(followers.map(f => f.id)));
    }
  };

  // Load email templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const result = await getEmailTemplates();
        const activeTemplates = result.filter(t => t.isActive);
        setTemplates(activeTemplates);
        
        // Set person_history_update as default template if available
        const updateTemplate = activeTemplates.find(t => t.name === 'person_history_update');
        if (updateTemplate) {
          setSelectedTemplateId(updateTemplate.id);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, []);

  // Generate template variables
  const getTemplateVariables = () => ({
    recipientName: '{{recipientName}}',
    recipientEmail: '{{recipientEmail}}',
    personName,
    personFirstName: update.person.firstName,
    personLastName: update.person.lastName,
    townName: update.person.town.name,
    updateDescription: update.title,
    updateText: update.description,
    updateDate: format(new Date(update.date), 'MMMM d, yyyy'),
    updateId: update.id,
    commentLink: '{{commentLink}}',
    profileUrl,
    hideUrl: '{{hideUrl}}',
    manageUrl: '{{manageUrl}}',
    personOptOutUrl: '{{personOptOutUrl}}',
    allOptOutUrl: '{{allOptOutUrl}}',
    currentDate: format(new Date(), 'MMMM d, yyyy'),
    siteUrl: process.env.NEXT_PUBLIC_URL || '',
  });

  // Update content when template is selected
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        const variables = getTemplateVariables();
        setCustomSubject(replaceTemplateVariables(template.subject, variables));
        setCustomHtmlContent(replaceTemplateVariables(template.htmlContent, variables));
        setCustomTextContent(template.textContent ? replaceTemplateVariables(template.textContent, variables) : '');
        setUseCustomContent(true);
      }
    } else {
      // Use default content
      setCustomSubject(`Update on ${personName}`);
      setCustomHtmlContent(getDefaultEmailHtml());
      setCustomTextContent('');
      setUseCustomContent(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, templates]);
  
  const handleSendEmails = async () => {
    if (selectedFollowers.size === 0) {
      setMessage({
        type: 'error',
        text: 'Please select at least one recipient',
      });
      return;
    }
    
    if (!confirm(`Send email update to ${selectedFollowers.size} selected followers?`)) {
      return;
    }
    
    setMessage(null);
    
    startTransition(async () => {
      const customContentData = useCustomContent ? {
        subject: customSubject,
        htmlContent: customHtmlContent,
        textContent: customTextContent || undefined,
        templateId: selectedTemplateId || undefined,
      } : undefined;
      
      const selectedIds = Array.from(selectedFollowers);
      const result = await sendUpdateEmail(update.id, customContentData, selectedIds);
      
      if (result.success) {
        setEmailsSent(true);
        setMessage({
          type: 'success',
          text: `Successfully queued ${result.emailsQueued} emails for delivery`,
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to send emails',
        });
      }
    });
  };
  
  const getDefaultEmailHtml = () => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a202c;">Update on ${personName}</h2>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; color: #2d3748; margin: 0;">
            ${update.description}
          </p>
          <p style="font-size: 14px; color: #718096; margin-top: 10px;">
            Posted on ${format(new Date(update.date), 'MMMM d, yyyy')}
          </p>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${profileUrl}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Profile
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">
        
        <p style="font-size: 12px; color: #718096;">
          You&apos;re receiving this email because you&apos;ve shown support for ${personName}.
          <br>
          <a href="#" style="color: #4299e1;">Manage your email preferences</a>
        </p>
      </div>
    `;
  };

  const emailPreview = {
    subject: useCustomContent ? customSubject : `Update on ${personName}`,
    html: useCustomContent ? customHtmlContent : getDefaultEmailHtml(),
  };
  
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1" />
        Back to Person History
      </button>
      
      {/* Update Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Update Information</h2>
        
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Person:</span>
            <span className="ml-2 text-gray-900">{personName}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Location:</span>
            <span className="ml-2 text-gray-900">
              {update.person.town.name}, {update.person.town.state}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Update Date:</span>
            <span className="ml-2 text-gray-900">
              {format(new Date(update.date), 'MMMM d, yyyy')}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Update:</span>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">{update.description}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Email Template Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
          Email Template
        </h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
              Select Template
            </label>
            <select
              id="template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Default Template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          
          {useCustomContent && (
            <div className="mt-4">
              <button
                onClick={() => setEditingContent(!editingContent)}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                {editingContent ? 'Hide Editor' : 'Customize Content'}
              </button>
              
              {editingContent && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      id="subject"
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                      HTML Content
                    </label>
                    <textarea
                      id="content"
                      value={customHtmlContent}
                      onChange={(e) => setCustomHtmlContent(e.target.value)}
                      rows={15}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Followers Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2" />
          Email Recipients
        </h2>
        
        {followers.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No followers found for this person.</p>
            <p className="text-sm text-gray-500 mt-1">
              Followers are users who have commented on this person&apos;s page and have not opted out of emails.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Found <span className="font-semibold">{followers.length}</span> followers
              who have commented on {update.person.firstName}&apos;s page or updates and have not opted out of email notifications.
              <br />
              <span className="text-sm text-gray-500 mt-1">
                Selected: <span className="font-semibold text-gray-700">{selectedFollowers.size}</span> of {followers.length}
              </span>
            </p>
            
            {/* Recipients with checkboxes */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Select Recipients:</h3>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedFollowers.size === followers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {followers.map((follower) => (
                  <label
                    key={follower.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFollowers.has(follower.id)}
                      onChange={() => handleFollowerToggle(follower.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      {formatEmailDisplay(follower)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Email Preview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <EnvelopeIcon className="h-5 w-5 mr-2" />
            Email Preview
          </h2>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
        
        {showPreview && (
          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500">Subject:</span>
              <p className="text-gray-900">{emailPreview.subject}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500">Content:</span>
              <div 
                className="mt-2 border rounded p-4 bg-gray-50 relative"
              >
                {/* Invisible overlay to prevent clicking */}
                <div className="absolute inset-0 z-10" style={{ cursor: 'default' }} />
                <div 
                  dangerouslySetInnerHTML={{ __html: emailPreview.html }}
                  style={{ pointerEvents: 'none' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 italic">
                Note: Links are not clickable in this preview
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="bg-white shadow rounded-lg p-6">
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={handleSendEmails}
            disabled={isPending || selectedFollowers.size === 0 || emailsSent}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            {isPending 
              ? 'Sending...' 
              : emailsSent 
                ? 'Emails Sent' 
                : `Send Email to ${selectedFollowers.size} Selected ${selectedFollowers.size === 1 ? 'Follower' : 'Followers'}`}
          </button>
          
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
        
        {emailsSent && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Emails have been queued for delivery. You can check the status 
              in the <Link href="/admin/email" className="underline">Email Admin</Link> section.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}