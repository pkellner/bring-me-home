'use client';

import { useState } from 'react';
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
  BellSlashIcon
} from '@heroicons/react/24/outline';
import Link from '@/components/OptimizedLink';
import { performSignOut } from '@/lib/signout';

interface ProfileUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLogin: string | null;
  optOutOfAllEmail: boolean;
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  townAccess: Array<{
    id: string;
    accessLevel: string;
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
  emailSubscriptions 
}: { 
  initialOptOutOfAllEmail: boolean;
  emailSubscriptions: ProfileUser['emailSubscriptions'];
}) {
  const [globalOptOut, setGlobalOptOut] = useState(initialOptOutOfAllEmail);
  const [personOptOuts, setPersonOptOuts] = useState<string[]>(
    emailSubscriptions.filter(sub => sub.isOptedOut).map(sub => sub.personId)
  );
  const [isLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
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
      
      {/* Person-specific subscriptions */}
      {emailSubscriptions.length > 0 && !globalOptOut && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            People you&apos;re following
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            You&apos;ll receive email notifications when there are updates about these people.
          </p>
          <div className="space-y-3">
            {emailSubscriptions.map((subscription) => (
              <div key={subscription.personId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {subscription.firstName} {subscription.lastName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {subscription.townName}
                  </div>
                </div>
                <div className="ml-4">
                  {subscription.isOptedOut ? (
                    <button
                      onClick={() => handlePersonOptOutChange(subscription.personId, false)}
                      disabled={isUpdating}
                      className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                    >
                      Resubscribe
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePersonOptOutChange(subscription.personId, true)}
                      disabled={isUpdating}
                      className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      Unsubscribe
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* No subscriptions message */}
      {emailSubscriptions.length === 0 && !globalOptOut && (
        <div className="mt-6 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
          <p>You&apos;re not currently following any detained persons.</p>
          <p className="mt-2">When you leave a message of support on someone&apos;s profile, you&apos;ll automatically receive email updates about them.</p>
        </div>
      )}
    </div>
  );
}

export default function ProfileClient({ user }: { user: ProfileUser }) {
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
        body: JSON.stringify({ email }),
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
                <p className="text-indigo-100 mt-1">@{user.username}</p>
              </div>
            </div>
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{user.email}</span>
                  <button
                    onClick={() => setIsEditingEmail(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Change Email
                  </button>
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
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            {/* Password Section */}
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
            
            {/* Email Preferences Section */}
            <div className="px-6 py-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BellSlashIcon className="h-5 w-5 mr-2 text-gray-500" />
                Email Preferences
              </h2>
              <EmailPreferences 
                initialOptOutOfAllEmail={user.optOutOfAllEmail}
                emailSubscriptions={user.emailSubscriptions}
              />
            </div>
            
            {/* Roles Section - Only show if user has roles */}
            {user.roles.length > 0 && (
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
                <div className="space-y-3">
                  {user.townAccess.map((access) => (
                    <Link
                      key={access.id}
                      href={`/${access.town.slug}`}
                      className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-all duration-200 block border border-gray-200 hover:border-indigo-300"
                    >
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {access.town.name}, {access.town.state}
                        </p>
                        <p className="text-sm text-gray-600">Access Level: {access.accessLevel}</p>
                      </div>
                      <div className="flex items-center text-gray-400 group-hover:text-indigo-600">
                        <span className="text-xs mr-2">View Town</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
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
                <div className="space-y-3">
                  {user.personAccess.map((access) => (
                    <Link
                      key={access.id}
                      href={`/${access.person.townSlug}/${access.person.slug}`}
                      className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition-all duration-200 block border border-gray-200 hover:border-indigo-300"
                    >
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {access.person.firstName} {access.person.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {access.person.townName}, {access.person.townState} • Access Level: {access.accessLevel}
                        </p>
                      </div>
                      <div className="flex items-center text-gray-400 group-hover:text-indigo-600">
                        <span className="text-xs mr-2">View Profile</span>
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}