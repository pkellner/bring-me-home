'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AnonymousCommentFormWithRecaptcha from './AnonymousCommentFormWithRecaptcha';
import { getCookie, setCookie, deleteCookie } from '@/lib/cookies';
import { isSupportMapEnabled } from '@/app/actions/support-map';
import * as gtag from '@/lib/gtag';

// Dynamic import for the map component to avoid SSR issues
const SupportMap = dynamic(() => import('./SupportMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

interface SupportSectionProps {
  personId: string;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  state?: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
    warning?: string;
  };
  stats?: {
    anonymousSupport: { total: number; last24Hours: number };
    messages: { total: number; last24Hours: number };
  };
  isAdmin?: boolean;
  supportMapMetadata?: {
    hasIpAddresses: boolean;
    messageLocationCount: number;
    supportLocationCount: number;
  };
  localSupportIncrement?: number;
  onLocalSupportIncrement?: () => void;
  updateId?: string | null;
  shouldAddComment?: boolean;
  magicUid?: string | null;
}

export default function SupportSection({
  personId,
  onSubmit,
  isPending,
  state,
  stats,
  isAdmin = false,
  supportMapMetadata,
  localSupportIncrement = 0,
  onLocalSupportIncrement,
  updateId,
  shouldAddComment,
  magicUid,
}: SupportSectionProps) {
  const [showForm, setShowForm] = useState(shouldAddComment || false);
  const [hasQuickSupported, setHasQuickSupported] = useState(false);
  const [quickSupportState, setQuickSupportState] = useState<'ready' | 'sending' | 'thanking'>('ready');
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showMessages, setShowMessages] = useState(true);
  const [showSupport, setShowSupport] = useState(true);
  const [mapMessageCount, setMapMessageCount] = useState(supportMapMetadata?.messageLocationCount || 0);
  const [mapSupportCount, setMapSupportCount] = useState(supportMapMetadata?.supportLocationCount || 0);
  const [mapEnabled, setMapEnabled] = useState<boolean | null>(null);
  const [hasLocationData, setHasLocationData] = useState<boolean | null>(supportMapMetadata?.hasIpAddresses ?? null);
  const [magicLinkData, setMagicLinkData] = useState<{
    user: { email: string };
    previousComment?: {
      email: string;
      firstName: string;
      lastName: string;
      occupation?: string | null;
      birthdate?: Date | null;
      city?: string | null;
      state?: string | null;
    };
  } | null>(null);
  const [currentUserData, setCurrentUserData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  // Check if map feature is enabled
  useEffect(() => {
    isSupportMapEnabled(isAdmin).then(setMapEnabled);
  }, [isAdmin]);
  
  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user/current');
        const data = await response.json();
        if (data.user && data.user.email && data.user.firstName && data.user.lastName) {
          setCurrentUserData({
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
          });
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    // Only fetch if not using magic link
    if (!magicUid) {
      fetchCurrentUser();
    }
  }, [magicUid]);
  
  // Verify magic link and fetch previous comment data
  useEffect(() => {
    if (magicUid && shouldAddComment) {
      import('@/app/actions/magic-links').then(({ verifyMagicLink }) => {
        verifyMagicLink(magicUid).then(result => {
          if (result.success && result.data) {
            setMagicLinkData(result.data);
          }
        });
      });
    }
  }, [magicUid, shouldAddComment]);
  
  // Only fetch support map metadata if not provided from cache
  useEffect(() => {
    if (mapEnabled && supportMapMetadata === undefined) {
      fetch(`/api/persons/${personId}/support-map`)
        .then(res => res.json())
        .then(data => {
          setHasLocationData(data.hasIpAddresses || false);
          setMapMessageCount(data.locations.messages.length);
          setMapSupportCount(data.locations.support.length);
        })
        .catch(() => setHasLocationData(false));
    } else if (supportMapMetadata) {
      // Use cached data
      setHasLocationData(supportMapMetadata.hasIpAddresses);
      setMapMessageCount(supportMapMetadata.messageLocationCount);
      setMapSupportCount(supportMapMetadata.supportLocationCount);
    }
  }, [personId, mapEnabled, supportMapMetadata]);

  // Check if user has already quick supported
  useEffect(() => {
    const supportCookie = getCookie(`quick_supported_${personId}`);
    if (supportCookie) {
      setHasQuickSupported(true);
      setQuickSupportState('thanking');
    }
  }, [personId]);

  // Handle form submission success and warnings
  useEffect(() => {
    if (state?.success) {
      setHasSubmittedMessage(true);
      setShowForm(false);
      
      if (state.warning) {
        setWarningMessage(state.warning);
        setShowWarning(true);
      }
    }
  }, [state]);

  // Listen for cookie cleared event (from admin panel)
  useEffect(() => {
    const handleCookieCleared = () => {
      // Check if cookie is actually gone
      const supportCookie = getCookie(`quick_supported_${personId}`);
      if (!supportCookie) {
        setHasQuickSupported(false);
        setQuickSupportState('ready');
      }
    };

    // Listen for the supportAdded event which is also triggered when cookie is cleared
    window.addEventListener('supportAdded', handleCookieCleared);
    
    return () => {
      window.removeEventListener('supportAdded', handleCookieCleared);
    };
  }, [personId]);

  // Handle anonymous support
  const handleAnonymousSupport = async () => {
    if (hasQuickSupported || quickSupportState !== 'ready') return;
    
    setQuickSupportState('sending');
    
    // Add a small delay for smoother transition
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const response = await fetch(`/api/persons/${personId}/support`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        console.error('Failed to submit support:', response.status, response.statusText);
        setQuickSupportState('ready');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Set cookie to prevent repeated clicks (expires in 1 year)
        setCookie(`quick_supported_${personId}`, 'true', { expires: 365 });
        
        setHasQuickSupported(true);
        setQuickSupportState('thanking');
        
        // Track anonymous support in GA
        gtag.trackSupportAction('anonymous_support', personId);
        
        // Increment the local counter immediately for instant UI feedback
        if (onLocalSupportIncrement) {
          onLocalSupportIncrement();
        }
        
        // Trigger a stats refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('supportAdded'));
      }
    } catch (error) {
      console.error('Error submitting anonymous support:', error);
      setQuickSupportState('ready');
    }
  };

  // Handle successful named support submission
  useEffect(() => {
    if (state?.success && showForm) {
      // Track message submission in GA
      gtag.trackSupportAction('message', personId);
      
      // Trigger a stats refresh
      window.dispatchEvent(new CustomEvent('supportAdded'));
      
      // Mark as submitted
      setHasSubmittedMessage(true);
      
      // Hide the form
      setShowForm(false);
      
      // Scroll to show the community support section
      setTimeout(() => {
        const commentsSection = document.getElementById('comments');
        if (commentsSection) {
          // Calculate position to show a bit of white space above
          const offsetTop = commentsSection.offsetTop - 40;
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [state?.success, showForm, personId]);

  // Handle cookie clear for admins
  const handleClearCookie = async () => {
    // Start transition back to ready state
    setQuickSupportState('ready');
    
    // Small delay for smooth transition
    setTimeout(async () => {
      // Delete the database record
      try {
        await fetch(`/api/persons/${personId}/support`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error('Error deleting support record:', error);
      }
      
      // Clear the cookie
      deleteCookie(`quick_supported_${personId}`);
      
      // Reset UI state
      setHasQuickSupported(false);
      
      // Trigger stats refresh
      window.dispatchEvent(new CustomEvent('supportAdded'));
    }, 300);
  };

  // Calculate totals for mini stats - include local increment
  const adjustedAnonymousTotal = stats ? stats.anonymousSupport.total + localSupportIncrement : localSupportIncrement;
  const totalSupport = stats ? adjustedAnonymousTotal + stats.messages.total : localSupportIncrement;
  const messagesPercent = totalSupport > 0 ? (stats!.messages.total / totalSupport) * 100 : 0;
  const quickPercent = totalSupport > 0 ? (adjustedAnonymousTotal / totalSupport) * 100 : 0;


  // Remove the early return - we want to show the support options even with no data
  // if (totalSupport === 0) {
  //   return null;
  // }

  return (
      <div className="mb-8">
        {/* Mini stats bar - only show if there's data */}
        {stats && totalSupport > 0 && (
          <div className="mb-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 transition-all duration-500">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span className="font-medium">Community Support</span>
              <span className="font-semibold text-gray-800">
                {totalSupport > 0 ? `${totalSupport} total` : 'Be the first!'}
              </span>
            </div>
            {totalSupport > 0 ? (
              <>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    {messagesPercent > 0 && (
                      <div 
                        className="bg-blue-500 transition-all duration-700 ease-out"
                        style={{ width: `${messagesPercent}%` }}
                        title={`${stats.messages.total} ${stats.messages.total === 1 ? 'message' : 'messages'}`}
                      />
                    )}
                    {quickPercent > 0 && (
                      <div 
                        className="bg-pink-500 transition-all duration-700 ease-out"
                        style={{ width: `${quickPercent}%` }}
                        title={`${stats.anonymousSupport.total} quick supports`}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-gray-600">✍️ {stats.messages.total} {stats.messages.total === 1 ? 'message' : 'messages'}</span>
                  <span className="text-gray-600">💗 {adjustedAnonymousTotal} quick</span>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">Show your support below</p>
              </div>
            )}
          </div>
        )}
        
        {/* View Support Map Button - Only show if feature is enabled, there's data, and location data exists */}
        {mapEnabled && totalSupport > 0 && (hasLocationData || mapMessageCount > 0 || mapSupportCount > 0) && (
          <>
            <div className="mb-4">
              <button
                onClick={() => {
                  setShowMap(!showMap);
                  if (!mapLoaded) {
                    setMapLoaded(true);
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 rounded-lg p-3 transition-all duration-300 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="font-medium text-gray-700">View Support Map</span>
                  {(mapMessageCount > 0 || mapSupportCount > 0) && (
                    <span className="text-sm text-gray-500">
                      ({mapMessageCount + mapSupportCount} {(mapMessageCount + mapSupportCount) === 1 ? 'location' : 'locations'})
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${
                    showMap ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Expandable Map Container */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                showMap ? 'max-h-[600px] opacity-100 mb-4' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-white rounded-lg shadow-lg p-4">
                {/* Map toggle checkboxes */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMessages}
                      onChange={(e) => setShowMessages(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show {mapMessageCount === 1 ? 'Message' : 'Messages'} ({mapMessageCount})
                    </span>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSupport}
                      onChange={(e) => setShowSupport(e.target.checked)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show Support ({mapSupportCount})
                    </span>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </label>
                </div>
                
                {/* Map component - only render if mapLoaded is true */}
                {mapLoaded ? (
                  <SupportMap
                    personId={personId}
                    showMessages={showMessages}
                    showSupport={showSupport}
                    isAdmin={isAdmin}
                    onDataLoaded={(messages, support) => {
                      setMapMessageCount(messages);
                      setMapSupportCount(support);
                    }}
                  />
                ) : null}
              </div>
            </div>
          </>
        )}

        {/* Support options box - hide when form is shown */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
          showForm ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
        }`}>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Named Support Option - Takes 2/3 */}
              <div className="sm:col-span-2">
                {hasSubmittedMessage ? (
                  <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 shadow-md">
                    <div className="text-center">
                      <div className="mb-3 text-4xl flex items-center justify-center gap-2">
                        <span className="animate-bounce" style={{ 
                          animationDuration: '0.5s',
                          animationIterationCount: '4',
                          animationTimingFunction: 'ease-in-out'
                        }}>🌸</span>
                        <span className="animate-bounce" style={{ 
                          animationDuration: '0.5s',
                          animationIterationCount: '4',
                          animationDelay: '0.1s',
                          animationTimingFunction: 'ease-in-out'
                        }}>🌺</span>
                        <span className="animate-bounce" style={{ 
                          animationDuration: '0.5s',
                          animationIterationCount: '4',
                          animationDelay: '0.2s',
                          animationTimingFunction: 'ease-in-out'
                        }}>🌼</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Thank you for your message of support
                      </h4>
                      <p className="text-sm text-gray-600">
                        Your message will be reviewed soon
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    className="group relative bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] w-full"
                  >
                    <div className="text-center">
                      <div className="mb-3 text-4xl">
                        ✍️
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Leave a Message
                      </h4>
                      <p className="text-sm text-gray-600">
                        Share your name and thoughts
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Anonymous Support Option - Takes 1/3 */}
              <div className="relative">{/* Removed the Admin X button from here */}
                
                <button
                  onClick={handleAnonymousSupport}
                  disabled={hasQuickSupported}
                  className={`group relative bg-white rounded-lg shadow-md transition-all duration-500 overflow-hidden w-full ${
                    hasQuickSupported ? 'cursor-default' : 'hover:shadow-lg hover:scale-[1.02]'
                  }`}
                >
                  {/* Background gradient animation */}
                  <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-1000 ${
                    quickSupportState === 'thanking' 
                      ? 'from-pink-100 via-purple-100 to-blue-100 opacity-100' 
                      : 'from-white to-white opacity-0'
                  }`} />
                  
                  {/* Fixed height container to prevent size changes */}
                  <div className="relative h-[140px] flex items-center justify-center">
                    {/* Ready state */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ${
                      quickSupportState === 'ready' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                    }`}>
                      <div className="mb-3 text-4xl">
                        💗
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Anonymous Support
                      </h4>
                      <p className="text-sm text-gray-600">
                        One click, no name needed
                      </p>
                    </div>
                    
                    {/* Sending state */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                      quickSupportState === 'sending' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                    }`}>
                      <div className="animate-spin-smooth">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="2"/>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10" stroke="#9333EA" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Thanking state */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
                      quickSupportState === 'thanking' ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className={`${quickSupportState === 'thanking' ? 'animate-grow-in' : ''}`}>
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <span className="text-2xl animate-fade-in-delay">🌸</span>
                          <span className="text-3xl animate-fade-in">💗</span>
                          <span className="text-2xl animate-fade-in-delay-2">🌺</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">
                          Thank you!
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Your support means a lot
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* Admin clear button - thin full width below the button */}
                {isAdmin && hasQuickSupported && (
                  <button
                    onClick={handleClearCookie}
                    className="mt-2 w-full bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                  >
                    Admin Only - Clear Anonymous Support Cookie
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Show form inline when requested with smooth animation */}
        <div 
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            showForm ? 'max-h-[2000px] opacity-100 mt-6' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t pt-6">
            <AnonymousCommentFormWithRecaptcha
              personId={personId}
              personHistoryId={updateId || undefined}
              onSubmit={onSubmit}
              isPending={isPending}
              state={state}
              onCancel={() => setShowForm(false)}
              isMapExpanded={showMap}
              onContractMap={() => setShowMap(false)}
              magicLinkData={magicLinkData || (currentUserData ? {
                user: { email: currentUserData.email },
                previousComment: {
                  email: currentUserData.email,
                  firstName: currentUserData.firstName,
                  lastName: currentUserData.lastName,
                }
              } : undefined)}
            />
          </div>
        </div>

        {/* Warning Modal */}
        {showWarning && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div 
                className="fixed inset-0 transition-opacity" 
                aria-hidden="true"
                onClick={() => setShowWarning(false)}
              >
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Comment Hidden by Default
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {warningMessage}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          To enable anonymous comments with your email, please log in and update your profile settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowWarning(false)}
                  >
                    Understood
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}