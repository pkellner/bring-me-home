'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCookie, setCookie } from '@/lib/cookies';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if cookie banner is enabled via environment variable
    const cookieBannerEnabled = process.env.NEXT_PUBLIC_ENABLE_COOKIE_BANNER === 'true';
    
    if (!cookieBannerEnabled) {
      return;
    }

    // Check if user has already made a choice using actual cookies
    const consent = getCookie('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(consent);
        setPreferences(parsed);
      } catch {
        // Invalid cookie data, show banner again
        setShowBanner(true);
      }
    }
  }, []);

  const saveCookieConsent = (consentData: {
    necessary: boolean;
    analytics: boolean;
    marketing: boolean;
    timestamp: string;
  }) => {
    // Set cookie with 1 year expiration and SameSite=Lax for better compatibility
    setCookie('cookieConsent', JSON.stringify(consentData), {
      expires: 365,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    saveCookieConsent(allAccepted);
    setShowBanner(false);
    // Remove reload to avoid disrupting user experience
  };

  const handleRejectAll = () => {
    const allRejected = {
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    saveCookieConsent(allRejected);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    const savedPreferences = {
      ...preferences,
      timestamp: new Date().toISOString(),
    };
    saveCookieConsent(savedPreferences);
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0 sm:mr-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cookie Notice</h3>
              <p className="text-sm text-gray-600">
                We use cookies to improve your experience on our site. Some cookies are necessary for the site to function, 
                while others help us understand how you use the site. Please choose your cookie preferences.{' '}
                <Link href="/privacy-policy" className="text-indigo-600 hover:text-indigo-500 underline">
                  Learn more
                </Link>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 font-medium text-sm"
              >
                Reject All
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium text-sm"
              >
                Manage Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium text-sm"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Cookie Preferences</h2>
              
              <div className="space-y-4">
                {/* Necessary Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Necessary Cookies</h3>
                    <span className="text-sm text-gray-500">Always Active</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    These cookies are essential for the website to function properly. They enable basic functions 
                    like page navigation and access to secure areas of the website.
                  </p>
                </div>

                {/* Analytics Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Analytics Cookies</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    These cookies help us understand how visitors interact with our website by collecting and 
                    reporting information anonymously.
                  </p>
                </div>

                {/* Marketing Cookies */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Marketing Cookies</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    These cookies are used to track visitors across websites to display ads that are relevant 
                    and engaging for individual users.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowPreferences(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}