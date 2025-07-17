'use client';

import { useState, useEffect } from 'react';
import AnonymousCommentForm from './AnonymousCommentForm';
import { getCookie, setCookie, deleteCookie } from '@/lib/cookies';
import { usePathname } from 'next/navigation';

interface SupportSectionProps {
  personId: string;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  state?: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
  };
  stats?: {
    anonymousSupport: { total: number; last24Hours: number };
    messages: { total: number; last24Hours: number };
  };
}

export default function SupportSection({
  personId,
  onSubmit,
  isPending,
  state,
  stats,
}: SupportSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [hasQuickSupported, setHasQuickSupported] = useState(false);
  const [quickSupportState, setQuickSupportState] = useState<'ready' | 'sending' | 'thanking'>('ready');
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') || false;

  // Check if user has already quick supported
  useEffect(() => {
    const supportCookie = getCookie(`quick_supported_${personId}`);
    if (supportCookie) {
      setHasQuickSupported(true);
      setQuickSupportState('thanking');
    }
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
      
      const data = await response.json();
      
      if (data.success) {
        // Set cookie to prevent repeated clicks (expires in 1 year)
        setCookie(`quick_supported_${personId}`, 'true', 365);
        
        setHasQuickSupported(true);
        setQuickSupportState('thanking');
        
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
      // Trigger a stats refresh
      window.dispatchEvent(new CustomEvent('supportAdded'));
      
      // Reset to show options again (allow multiple messages)
      setShowForm(false);
    }
  }, [state?.success, showForm]);

  // Handle cookie clear for admins
  const handleClearCookie = async () => {
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
    setQuickSupportState('ready');
    
    // Trigger stats refresh
    window.dispatchEvent(new CustomEvent('supportAdded'));
  };

  // Calculate totals for mini stats
  const totalSupport = stats ? stats.anonymousSupport.total + stats.messages.total : 0;
  const messagesPercent = totalSupport > 0 ? (stats!.messages.total / totalSupport) * 100 : 0;
  const quickPercent = totalSupport > 0 ? (stats!.anonymousSupport.total / totalSupport) * 100 : 0;

  return (
      <div className="mb-8">
        {/* Mini stats bar - always visible */}
        {stats && (
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
                        title={`${stats.messages.total} messages`}
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
                  <span className="text-gray-600">✍️ {stats.messages.total} messages</span>
                  <span className="text-gray-600">💗 {stats.anonymousSupport.total} quick</span>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">Show your support below</p>
              </div>
            )}
          </div>
        )}
        
        {/* Success message for named support */}
        {state?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 animate-slide-in-down">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Thank you! Your message has been submitted for review.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Named Support Option - Takes 2/3 */}
            <button
              onClick={() => setShowForm(true)}
              className="sm:col-span-2 group relative bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
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
        
        {/* Show form inline when requested with smooth animation */}
        <div className={`mt-6 transition-all duration-500 ease-in-out transform ${
          showForm ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'
        }`}>
          {(showForm || state?.success) && (
            <div className="border-t pt-6 animate-slide-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Leave a Message</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </div>
              <AnonymousCommentForm
                personId={personId}
                onSubmit={onSubmit}
                isPending={isPending}
                state={state}
              />
            </div>
          )}
        </div>
    </div>
  );
}