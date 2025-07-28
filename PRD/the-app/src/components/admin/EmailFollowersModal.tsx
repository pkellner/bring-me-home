'use client';

import { useState, useEffect, useTransition, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  EnvelopeIcon, 
  UserGroupIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { sendUpdateEmail, getPersonFollowers } from '@/app/actions/email-notifications';
import { format } from 'date-fns';

interface Follower {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface EmailFollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  personHistoryId: string;
  personName: string;
  updateDescription: string;
  updateDate: string;
  townName: string;
  personSlug: string;
  townSlug: string;
}

export default function EmailFollowersModal({
  isOpen,
  onClose,
  personHistoryId,
  personName,
  updateDescription,
  updateDate,
  townName,
  personSlug,
  townSlug,
}: EmailFollowersModalProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailsSent, setEmailsSent] = useState(false);

  // Fetch followers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFollowers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, personHistoryId]);

  const loadFollowers = async () => {
    setLoading(true);
    try {
      // Get person ID from the history record
      const personIdResponse = await fetch(`/api/admin/person-history/${personHistoryId}`);
      const personData = await personIdResponse.json();
      
      if (personData.error) {
        setMessage({ type: 'error', text: 'Failed to load followers' });
        return;
      }
      
      if (personData.personId) {
        const result = await getPersonFollowers(personData.personId, true);
        setFollowers(result);
        setSelectedFollowers(new Set(result.map(f => f.id)));
      }
    } catch (error) {
      console.error('Failed to load followers:', error);
      setMessage({ type: 'error', text: 'Failed to load followers' });
    } finally {
      setLoading(false);
    }
  };

  const formatEmailDisplay = (follower: Follower) => {
    const name = follower.firstName || follower.lastName 
      ? `${follower.firstName || ''} ${follower.lastName || ''}`.trim()
      : 'Anonymous';
    return `${name} <${follower.email || 'no-email'}>`;
  };

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

  const handleSelectAll = () => {
    if (selectedFollowers.size === followers.length) {
      setSelectedFollowers(new Set());
    } else {
      setSelectedFollowers(new Set(followers.map(f => f.id)));
    }
  };

  const handleSendEmails = async () => {
    if (selectedFollowers.size === 0) {
      setMessage({
        type: 'error',
        text: 'Please select at least one recipient',
      });
      return;
    }
    
    setMessage(null);
    
    startTransition(async () => {
      const selectedIds = Array.from(selectedFollowers);
      const result = await sendUpdateEmail(personHistoryId, undefined, selectedIds);
      
      if (result.success) {
        setEmailsSent(true);
        setMessage({
          type: 'success',
          text: `Successfully queued ${result.emailsQueued} emails for delivery`,
        });
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          // Reset state
          setEmailsSent(false);
          setMessage(null);
        }, 2000);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to send emails',
        });
      }
    });
  };

  const profileUrl = `${process.env.NEXT_PUBLIC_URL || ''}/${townSlug}/${personSlug}`;
  
  const emailPreviewHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a202c;">Update on ${personName}</h2>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="font-size: 16px; color: #2d3748; margin: 0;">
          ${updateDescription}
        </p>
        <p style="font-size: 14px; color: #718096; margin-top: 10px;">
          Posted on ${format(new Date(updateDate), 'MMMM d, yyyy')}
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

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
                {/* Close button */}
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <EnvelopeIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Email Followers
                    </Dialog.Title>
                    
                    {/* Update Information */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-500">Person:</span>
                          <span className="ml-2 text-gray-900">{personName}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Location:</span>
                          <span className="ml-2 text-gray-900">{townName}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-500">Update:</span>
                          <p className="mt-1 text-gray-900">{updateDescription.substring(0, 150)}...</p>
                        </div>
                      </div>
                    </div>

                    {/* Recipients Section */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-900 flex items-center">
                        <UserGroupIcon className="h-5 w-5 mr-2" />
                        Email Recipients
                      </h4>
                      
                      {loading ? (
                        <div className="mt-4 text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-500">Loading followers...</p>
                        </div>
                      ) : followers.length === 0 ? (
                        <div className="mt-4 text-center py-8">
                          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">No followers found for this person.</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Followers are users who have commented on this person&apos;s page.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-3">
                            Selected: <span className="font-semibold text-gray-900">{selectedFollowers.size}</span> of {followers.length} followers
                          </p>
                          
                          <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-700">Recipients:</span>
                              <button
                                type="button"
                                onClick={handleSelectAll}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                {selectedFollowers.size === followers.length ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {followers.map((follower) => (
                                <label
                                  key={follower.id}
                                  className="flex items-center p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedFollowers.has(follower.id)}
                                    onChange={() => handleFollowerToggle(follower.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {formatEmailDisplay(follower)}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Email Preview Toggle */}
                    <div className="mt-6">
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        {showPreview ? (
                          <>
                            <EyeSlashIcon className="h-4 w-4 mr-1" />
                            Hide Email Preview
                          </>
                        ) : (
                          <>
                            <EyeIcon className="h-4 w-4 mr-1" />
                            Show Email Preview
                          </>
                        )}
                      </button>
                      
                      {showPreview && (
                        <div className="mt-3 border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                          <div className="mb-2">
                            <span className="text-xs font-medium text-gray-500">Subject:</span>
                            <p className="text-sm text-gray-900">Update on {personName}</p>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-500">Content:</span>
                            <div 
                              className="mt-2 text-sm"
                              dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
                              style={{ pointerEvents: 'none' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    {message && (
                      <div className={`mt-4 p-3 rounded-lg flex items-center text-sm ${
                        message.type === 'success' 
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : 'bg-red-50 border border-red-200 text-red-800'
                      }`}>
                        {message.type === 'success' ? (
                          <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        )}
                        <span>{message.text}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-6 sm:flex sm:flex-row-reverse gap-3">
                  <button
                    type="button"
                    onClick={handleSendEmails}
                    disabled={isPending || selectedFollowers.size === 0 || emailsSent || loading}
                    className="inline-flex w-full justify-center items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    {isPending 
                      ? 'Sending...' 
                      : emailsSent 
                        ? 'Emails Sent' 
                        : `Send to ${selectedFollowers.size} Recipients`}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}