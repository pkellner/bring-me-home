'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  UserIcon, 
  KeyIcon, 
  EnvelopeIcon, 
  CalendarIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  UsersIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowLeftIcon,
  HomeIcon,
  BellSlashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Link from '@/components/OptimizedLink';
import { performSignOut } from '@/lib/signout';
import CommentManagement from '@/components/profile/CommentManagement';
import { resendVerificationEmail } from '@/app/actions/email-verification';

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  emailVerified: string | null;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLogin: string | null;
  optOutOfAllEmail: boolean;
  allowAnonymousComments: boolean;
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  townAccess: Array<{
    id: string;
    accessLevel: string;
    notifyOnComment: boolean;
    town: {
      id: string;
      name: string;
      state: string;
      slug: string;
    };
  }>;
  personAccess: Array<{
    id: string;
    accessLevel: string;
    notifyOnComment: boolean;
    person: {
      id: string;
      firstName: string;
      lastName: string;
      slug: string;
      townName: string;
      townState: string;
      townSlug: string;
    };
  }>;
  emailSubscriptions: Array<{
    personId: string;
    firstName: string;
    lastName: string;
    slug: string;
    townName: string;
    townSlug: string;
    isOptedOut: boolean;
  }>;
}

// Email Preferences Component
function EmailPreferences({ 
  initialOptOutOfAllEmail, 
  initialAllowAnonymousComments,
  emailSubscriptions 
}: { 
  initialOptOutOfAllEmail: boolean;
  initialAllowAnonymousComments: boolean;
  emailSubscriptions: ProfileUser['emailSubscriptions'];
}) {
  const [globalOptOut, setGlobalOptOut] = useState(initialOptOutOfAllEmail);
  const [allowAnonymousComments, setAllowAnonymousComments] = useState(initialAllowAnonymousComments);
  const [personOptOuts, setPersonOptOuts] = useState<string[]>(
    emailSubscriptions.filter(sub => sub.isOptedOut).map(sub => sub.personId)
  );
  const [isLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showActiveSubscriptions, setShowActiveSubscriptions] = useState(true);
  const router = useRouter();


  const handleGlobalOptOutChange = async (checked: boolean) => {
    setError('');
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/profile/email-preferences/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optOut: checked }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update preferences');
        return;
      }
      
      setGlobalOptOut(checked);
      router.refresh();
    } catch {
      setError('Failed to update preferences');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAllowAnonymousCommentsChange = async (checked: boolean) => {
    setError('');
    setIsUpdating(true);
    
    try {
      const response = await fetch('/api/profile/anonymous-comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowAnonymousComments: checked }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update anonymous comment preferences');
        return;
      }
      
      setAllowAnonymousComments(checked);
      router.refresh();
    } catch {
      setError('Failed to update anonymous comment preferences');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePersonOptOutChange = async (personId: string, checked: boolean) => {
    setError('');
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/profile/email-preferences/person/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optOut: checked }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update preferences');
        return;
      }
      
      if (checked) {
        setPersonOptOuts([...personOptOuts, personId]);
      } else {
        setPersonOptOuts(personOptOuts.filter(id => id !== personId));
      }
      router.refresh();
    } catch {
      setError('Failed to update preferences');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading preferences...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      
      {/* Global opt-out */}
      <div className="flex items-start">
        <input
          type="checkbox"
          id="global-opt-out"
          checked={globalOptOut}
          onChange={(e) => handleGlobalOptOutChange(e.target.checked)}
          disabled={isUpdating}
          className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-1"
        />
        <label htmlFor="global-opt-out" className="ml-3">
          <div className="text-sm font-medium text-gray-900">
            Opt out of all email notifications
          </div>
          <div className="text-sm text-gray-600">
            You will not receive any email updates about persons you follow
          </div>
        </label>
      </div>
      
      {/* Anonymous comments setting */}
      <div className="flex items-start mt-4">
        <input
          type="checkbox"
          id="allow-anonymous-comments"
          checked={allowAnonymousComments}
          onChange={(e) => handleAllowAnonymousCommentsChange(e.target.checked)}
          disabled={isUpdating}
          className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-1"
        />
        <label htmlFor="allow-anonymous-comments" className="ml-3">
          <div className="text-sm font-medium text-gray-900">
            Allow anonymous comments with my email
          </div>
          <div className="text-sm text-gray-600">
            When unchecked, any anonymous comments posted with your email address will be automatically hidden and require your approval to be visible
          </div>
        </label>
      </div>
      
      {/* Person-specific opt-outs */}
      {!globalOptOut && (
        <div className="mt-6">
          {personOptOuts.length > 0 ? (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Email notification opt-outs
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                You have opted out of receiving email updates about these people. You can resubscribe at any time.
              </p>
              <div className="space-y-3">
                {emailSubscriptions
                  .filter(sub => personOptOuts.includes(sub.personId))
                  .map((subscription) => (
                    <div key={subscription.personId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.firstName} {subscription.lastName}
                        </div>
                        <div className="text-xs text-gray-600">
                          {subscription.townName}
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Not receiving email updates
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => handlePersonOptOutChange(subscription.personId, false)}
                          disabled={isUpdating}
                          className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50 px-3 py-1 border border-green-600 rounded hover:bg-green-50"
                        >
                          Resubscribe
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="font-medium text-gray-700">No email opt-outs</p>
              <p className="mt-1">You&apos;re receiving email updates for all people you&apos;ve shown support for.</p>
              <p className="mt-2 text-xs">To stop receiving updates about a specific person, you can manage your subscriptions below.</p>
            </div>
          )}
          
          {/* Show active subscriptions if user has any */}
          {emailSubscriptions.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowActiveSubscriptions(!showActiveSubscriptions)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span>Manage email subscriptions ({emailSubscriptions.filter(sub => !personOptOuts.includes(sub.personId)).length} active)</span>
                {showActiveSubscriptions ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>
              
              {showActiveSubscriptions && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-600 mb-2">
                    You&apos;re receiving email updates about these people because you&apos;ve shown support for them.
                  </p>
                  {emailSubscriptions
                    .filter(sub => !personOptOuts.includes(sub.personId))
                    .map((subscription) => (
                      <div key={subscription.personId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.firstName} {subscription.lastName}
                          </div>
                          <div className="text-xs text-gray-600">
                            {subscription.townName}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            Receiving email updates
                          </div>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => handlePersonOptOutChange(subscription.personId, true)}
                            disabled={isUpdating}
                            className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50 px-3 py-1 border border-red-600 rounded hover:bg-red-50"
                          >
                            Unsubscribe
                          </button>
                        </div>
                      </div>
                    ))}
                  {emailSubscriptions.filter(sub => !personOptOuts.includes(sub.personId)).length === 0 && (
                    <p className="text-sm text-gray-500 italic p-3">All subscriptions are currently opted out.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Comment {
  id: string;
  content: string | null;
  createdAt: Date;
  hideRequested: boolean;
  isActive: boolean;
  isApproved: boolean;
  personName: string;
  personSlug: string;
  townSlug: string;
}

interface PersonGroup {
  person: {
    id: string;
    name: string;
    slug: string;
    townSlug: string;
  };
  comments: Array<{
    id: string;
    content: string | null;
    createdAt: Date;
    hideRequested: boolean;
    isActive: boolean;
    isApproved: boolean;
  }>;
}

interface CommentToken {
  id: string;
  email: string;
  tokenHash: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

// Town Notification Toggle Component
function TownNotificationToggle({ 
  townAccessId, 
  enabled 
}: { 
  townAccessId: string; 
  enabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(enabled);

  const handleToggle = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    
    startTransition(async () => {
      try {
        const response = await fetch('/api/profile/town-access-notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            townAccessId,
            notifyOnComment: newValue,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update notification settings');
        }

        router.refresh();
      } catch (error) {
        console.error('Failed to update notification settings:', error);
        // Revert on error
        setIsEnabled(!newValue);
      }
    });
  };

  return (
    <div className="flex items-center justify-between">
      <label htmlFor={`notify-${townAccessId}`} className="text-sm font-medium text-gray-700">
        Send Notifications on new Comments
      </label>
      <button
        type="button"
        id={`notify-${townAccessId}`}
        disabled={isPending}
        onClick={handleToggle}
        className={`
          ${isEnabled ? 'bg-indigo-600' : 'bg-gray-200'}
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        role="switch"
        aria-checked={isEnabled}
      >
        <span
          aria-hidden="true"
          className={`
            ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          `}
        />
      </button>
    </div>
  );
}

// Notification Toggle Component
function NotificationToggle({ 
  personAccessId, 
  enabled 
}: { 
  personAccessId: string; 
  enabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(enabled);

  const handleToggle = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    
    startTransition(async () => {
      try {
        const response = await fetch('/api/profile/person-access-notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personAccessId,
            notifyOnComment: newValue,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update notification settings');
        }

        router.refresh();
      } catch (error) {
        console.error('Failed to update notification settings:', error);
        // Revert on error
        setIsEnabled(!newValue);
      }
    });
  };

  return (
    <div className="flex items-center justify-between">
      <label htmlFor={`notify-${personAccessId}`} className="text-sm font-medium text-gray-700">
        Send Notifications on new Comments
      </label>
      <button
        type="button"
        id={`notify-${personAccessId}`}
        disabled={isPending}
        onClick={handleToggle}
        className={`
          ${isEnabled ? 'bg-indigo-600' : 'bg-gray-200'}
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        role="switch"
        aria-checked={isEnabled}
      >
        <span
          aria-hidden="true"
          className={`
            ${isEnabled ? 'translate-x-5' : 'translate-x-0'}
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          `}
        />
      </button>
    </div>
  );
}

export default function ProfileClient({ 
  user, 
  comments,
  groupedByPerson,
  isAdmin = false,
  isViewingOwnProfile = true,
  commentTokens = null,
}: { 
  user: ProfileUser;
  comments: Comment[];
  groupedByPerson: Record<string, PersonGroup>;
  isAdmin?: boolean;
  isViewingOwnProfile?: boolean;
  commentTokens?: CommentToken[] | null;
}) {
  const router = useRouter();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    if (email === user.email) {
      setEmailError('This is already your current email address');
      return;
    }
    
    setIsUpdatingEmail(true);
    
    try {
      const response = await fetch('/api/profile/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          // Include userId when admin is editing another user
          ...(isAdmin && !isViewingOwnProfile ? { userId: user.id } : {})
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        setEmailError(data.error || 'Failed to update email');
        return;
      }
      
      setEmailSuccess('Email updated successfully!');
      setIsEditingEmail(false);
      
      // Refresh the page to show updated email
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch {
      setEmailError('Failed to update email. Please try again.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };
  
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate passwords
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    setIsUpdatingPassword(true);
    
    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        setPasswordError(data.error || 'Failed to update password');
        return;
      }
      
      setPasswordSuccess('Password updated successfully!');
      setIsChangingPassword(false);
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('Failed to update password. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };
  
  
  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'site-admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'town-admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'person-admin':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back
              </button>
              <span className="text-gray-300">|</span>
              <Link
                href="/"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <HomeIcon className="h-4 w-4 mr-1" />
                Home
              </Link>
              {user.roles.some(role => ['site-admin', 'town-admin', 'person-admin'].includes(role.name)) && (
                <>
                  <span className="text-gray-300">|</span>
                  <Link
                    href="/admin"
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                  >
                    Admin Dashboard
                  </Link>
                </>
              )}
            </nav>
            
            {/* Mobile Navigation */}
            <div className="sm:hidden flex items-center space-x-2">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <Link
                href="/"
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <HomeIcon className="h-5 w-5" />
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => performSignOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/" className="text-gray-500 hover:text-gray-700 inline-flex items-center text-sm">
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Home
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 text-sm font-medium ml-1 md:ml-2">My Profile</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 mr-4">
                  <UserIcon className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {user.firstName || user.lastName 
                      ? `${user.firstName} ${user.lastName}`.trim()
                      : user.username}
                  </h1>
                  {isAdmin && !isViewingOwnProfile && (
                    <p className="text-indigo-100 mt-1">Viewing as Administrator</p>
                  )}
                </div>
              </div>
              {isAdmin && !isViewingOwnProfile && (
                <div className="bg-red-600 bg-opacity-90 px-4 py-2 rounded-lg">
                  <p className="text-sm font-semibold text-white">Admin View</p>
                </div>
              )}
            </div>
            <p className="text-indigo-100 mt-1">@{user.username}</p>
          </div>
          
          {/* Content */}
          <div className="divide-y divide-gray-200">
            {/* Account Information */}
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-gray-500" />
                Account Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Account Created</span>
                  <span className="text-sm font-medium text-gray-900">
                    {format(new Date(user.createdAt), 'MMMM d, yyyy')}
                  </span>
                </div>
                {user.lastLogin && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Login</span>
                    <span className="text-sm font-medium text-gray-900">
                      {format(new Date(user.lastLogin), 'MMMM d, yyyy h:mm a')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Email Section */}
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-500" />
                Email Address
              </h2>
              
              {emailSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">{emailSuccess}</span>
                </div>
              )}
              
              {!isEditingEmail ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-900">{user.email}</span>
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                          Unverified
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsEditingEmail(true)}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      Change Email
                    </button>
                  </div>
                  {!user.emailVerified && isViewingOwnProfile && (
                    <div className="flex items-start space-x-2 bg-yellow-50 p-3 rounded-lg">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800">
                          Your email address is not verified. Please check your inbox for a verification email.
                        </p>
                        <button
                          onClick={async () => {
                            const result = await resendVerificationEmail();
                            if (result.success) {
                              setEmailSuccess('Verification email sent! Please check your inbox.');
                            } else {
                              setEmailError(result.error || 'Failed to send verification email');
                            }
                          }}
                          className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                        >
                          Resend verification email
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleEmailUpdate} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter new email address"
                    />
                    {emailError && (
                      <p className="mt-1 text-sm text-red-600">{emailError}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isUpdatingEmail}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isUpdatingEmail ? 'Updating...' : 'Update Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingEmail(false);
                        setEmail(user.email);
                        setEmailError('');
                        setEmailSuccess('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            {/* Password Section - Only show for own profile */}
            {isViewingOwnProfile && (
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <KeyIcon className="h-5 w-5 mr-2 text-gray-500" />
                Password
              </h2>
              
              {passwordSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">{passwordSuccess}</span>
                </div>
              )}
              
              {!isChangingPassword ? (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Change Password
                </button>
              ) : (
                <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showCurrentPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter new password (min 8 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showNewPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                      <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-sm text-red-800">{passwordError}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setPasswordError('');
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
            )}
            
            {/* Email Preferences Section */}
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BellSlashIcon className="h-5 w-5 mr-2 text-gray-500" />
                Email Preferences
              </h2>
              <EmailPreferences 
                initialOptOutOfAllEmail={user.optOutOfAllEmail}
                initialAllowAnonymousComments={user.allowAnonymousComments}
                emailSubscriptions={user.emailSubscriptions}
              />
            </div>


            {/* Comments Management Section */}
            {comments.length > 0 && (
              <div className="px-6 py-6">
                <CommentManagement 
                  userId={user.id}
                  comments={comments}
                  groupedByPerson={groupedByPerson}
                />
              </div>
            )}
            
            {/* Roles Section - Only show if user has roles other than viewer */}
            {user.roles.length > 0 && 
             !(user.roles.length === 1 && user.roles[0].name === 'viewer') && (
              <div className="px-6 py-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Roles & Permissions
                </h2>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <div
                      key={role.id}
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(role.name)}`}
                    >
                      {role.name}
                      {role.description && (
                        <span className="ml-1 text-xs opacity-75">({role.description})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Town Access Section */}
            {user.townAccess.length > 0 && (
              <div className="px-6 py-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Town Access
                </h2>
                <div className="space-y-4">
                  {user.townAccess.map((access) => (
                    <div
                      key={access.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="mb-3">
                        <p className="font-medium text-gray-900">
                          {access.town.name}, {access.town.state}
                        </p>
                        <p className="text-sm text-gray-600">Access Level: {access.accessLevel}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Link
                          href={`/${access.town.slug}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          View Town
                        </Link>
                        {(access.accessLevel === 'write' || access.accessLevel === 'admin') && (
                          <Link
                            href={`/admin/towns/${access.town.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Edit Town
                          </Link>
                        )}
                        <Link
                          href={`/admin/comments/${access.town.slug}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          Edit Town Comments
                        </Link>
                      </div>
                      <div className="border-t border-gray-200 pt-3">
                        <TownNotificationToggle
                          townAccessId={access.id}
                          enabled={access.notifyOnComment}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Person Access Section */}
            {user.personAccess.length > 0 && (
              <div className="px-6 py-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2 text-gray-500" />
                  Person Access
                </h2>
                <div className="space-y-4">
                  {user.personAccess.map((access) => (
                    <div
                      key={access.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="mb-3">
                        <p className="font-medium text-gray-900">
                          {access.person.firstName} {access.person.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {access.person.townName}, {access.person.townState} • Access Level: {access.accessLevel}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Link
                          href={`/${access.person.townSlug}/${access.person.slug}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          View Person
                        </Link>
                        {(access.accessLevel === 'write' || access.accessLevel === 'admin') && (
                          <Link
                            href={`/admin/persons/${access.person.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Edit Person
                          </Link>
                        )}
                        <Link
                          href={`/admin/comments/${access.person.townSlug}/${access.person.slug}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          Edit Person Comments
                        </Link>
                      </div>
                      <div className="border-t border-gray-200 pt-3">
                        <NotificationToggle
                          personAccessId={access.id}
                          enabled={access.notifyOnComment}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Admin Only Section */}
            {isAdmin && !isViewingOwnProfile && (
              <div className="border-t-4 border-red-200 bg-red-50">
                <div className="px-6 py-6">
                  <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 mr-2 text-red-700" />
                    Admin Only Information
                  </h2>
                  
                  {/* User ID and Creation Info */}
                  <div className="mb-6 bg-white rounded-lg p-4 border border-red-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">User Details</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-gray-600">User ID:</dt>
                        <dd className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{user.id}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Account Created:</dt>
                        <dd>{format(new Date(user.createdAt), 'PPpp')}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Last Login:</dt>
                        <dd>{user.lastLogin ? format(new Date(user.lastLogin), 'PPpp') : 'Never'}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Email Status:</dt>
                        <dd className="flex items-center">
                          {user.email ? (
                            user.emailVerified ? (
                              <>
                                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                                <span>Verified</span>
                              </>
                            ) : (
                              <>
                                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-1" />
                                <span>Unverified</span>
                              </>
                            )
                          ) : (
                            <>
                              <XCircleIcon className="h-4 w-4 text-red-600 mr-1" />
                              <span>No email</span>
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  {/* Comment Verification Tokens */}
                  {commentTokens && commentTokens.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Comment Verification Tokens</h3>
                      <div className="space-y-2">
                        {commentTokens.map((token) => (
                          <div key={token.id} className="bg-gray-50 rounded p-3 text-sm">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">Token Hash:</span>
                                  <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">
                                    {token.tokenHash}
                                  </code>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    token.isActive 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {token.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <div>Created: {format(new Date(token.createdAt), 'PPp')}</div>
                                  <div>Last Used: {token.lastUsedAt ? format(new Date(token.lastUsedAt), 'PPp') : 'Never'}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-gray-500">
                        Showing up to 10 most recent active tokens for email: {user.email}
                      </div>
                    </div>
                  )}
                  
                  {/* No Tokens Message */}
                  {(!commentTokens || commentTokens.length === 0) && user.email && (
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Comment Verification Tokens</h3>
                      <p className="text-sm text-gray-600">No active verification tokens found for this user.</p>
                    </div>
                  )}
                  
                  {/* Admin Actions */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="inline-flex items-center px-4 py-2 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                    >
                      Edit User Settings
                    </Link>
                    <Link
                      href="/admin/comments"
                      className="inline-flex items-center px-4 py-2 bg-white border border-red-300 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                    >
                      View All Comments
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}