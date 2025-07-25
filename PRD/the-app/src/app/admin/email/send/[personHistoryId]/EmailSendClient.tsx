'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/OptimizedLink';
import { sendUpdateEmail } from '@/app/actions/email-notifications';
import { format } from 'date-fns';
import { 
  EnvelopeIcon, 
  UserGroupIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
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

export default function EmailSendClient({ update, followers }: EmailSendClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailsSent, setEmailsSent] = useState(false);
  
  const personName = `${update.person.firstName} ${update.person.lastName}`;
  const profileUrl = `${process.env.NEXT_PUBLIC_URL || ''}/${update.person.town.slug}/${update.person.slug}`;
  
  const handleSendEmails = async () => {
    if (!followers.length) {
      setMessage({
        type: 'error',
        text: 'No followers to email',
      });
      return;
    }
    
    if (!confirm(`Send email update to ${followers.length} followers?`)) {
      return;
    }
    
    setMessage(null);
    
    startTransition(async () => {
      const result = await sendUpdateEmail(update.id);
      
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
  
  const emailPreview = {
    subject: `Update on ${personName}`,
    html: `
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
    `,
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
              This email will be sent to <span className="font-semibold">{followers.length}</span> followers
              who have commented on {update.person.firstName}&apos;s page and have not opted out of email notifications.
            </p>
            
            {/* Show first few recipients */}
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Recipients:</h3>
              <div className="space-y-1">
                {followers.slice(0, 10).map((follower) => (
                  <div key={follower.id} className="text-sm text-gray-600">
                    {follower.firstName || follower.lastName 
                      ? `${follower.firstName || ''} ${follower.lastName || ''}`.trim()
                      : 'Anonymous'} 
                    <span className="text-gray-400 ml-1">({follower.email})</span>
                  </div>
                ))}
                {followers.length > 10 && (
                  <div className="text-sm text-gray-500 italic mt-2">
                    ... and {followers.length - 10} more
                  </div>
                )}
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
                className="mt-2 border rounded p-4 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: emailPreview.html }}
              />
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
            disabled={isPending || followers.length === 0 || emailsSent}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            {isPending 
              ? 'Sending...' 
              : emailsSent 
                ? 'Emails Sent' 
                : `Send Email to ${followers.length} Followers`}
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