'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import CommentConfirmationModal from './CommentConfirmationModal';

const debugCaptcha = true;

interface AnonymousCommentFormProps {
  personId: string;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  state?: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
  };
}

export default function AnonymousCommentForm({
  personId,
  onSubmit,
  isPending,
  state,
}: AnonymousCommentFormProps) {
  // Removed showForm state as we always show the form directly
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [commentLength, setCommentLength] = useState(0);
  const [privateNoteLength, setPrivateNoteLength] = useState(0);
  const [displayNameOnly, setDisplayNameOnly] = useState(false);
  const [showCityState, setShowCityState] = useState(true);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [isExecutingRecaptcha, setIsExecutingRecaptcha] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { executeRecaptcha } = useGoogleReCaptcha();

  if (debugCaptcha) {
    console.log('[AnonymousCommentForm] Component mounted, executeRecaptcha available:', !!executeRecaptcha);
  }

  // Reset form when submission is successful
  useEffect(() => {
    if (state?.success) {
      // Don't hide the form, let the parent component handle that
      setCommentLength(0);
      setPrivateNoteLength(0);
      setDisplayNameOnly(false);
      setShowCityState(true);
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  }, [state?.success]);


  return (
    <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Add Your Support
      </h3>

      <form
        ref={formRef}
        action={async formData => {
          setRecaptchaError(null);
          
          if (debugCaptcha) {
            console.log('[AnonymousCommentForm] Form submitted, checking reCAPTCHA...');
            console.log('[AnonymousCommentForm] executeRecaptcha available:', !!executeRecaptcha);
          }
          
          // Execute reCAPTCHA
          if (!executeRecaptcha) {
            const errorMsg = 'reCAPTCHA not loaded. Please refresh the page and try again.';
            if (debugCaptcha) {
              console.error('[AnonymousCommentForm] Error:', errorMsg);
            }
            setRecaptchaError(errorMsg);
            return;
          }
          
          setIsExecutingRecaptcha(true);
          
          try {
            if (debugCaptcha) {
              console.log('[AnonymousCommentForm] Executing reCAPTCHA with action: submit_comment');
            }
            
            const token = await executeRecaptcha('submit_comment');
            
            if (debugCaptcha) {
              console.log('[AnonymousCommentForm] reCAPTCHA token received:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
              console.log('[AnonymousCommentForm] Token length:', token?.length);
              console.log('[AnonymousCommentForm] Token type:', typeof token);
              console.log('[AnonymousCommentForm] Full token (first 100 chars):', token ? token.substring(0, 100) : 'NO TOKEN');
            }
            
            // Add the token to the form data
            formData.append('recaptchaToken', token);
            
            // Capture form data and show confirmation modal
            setPendingFormData(formData);
            setShowConfirmModal(true);
          } catch (error) {
            if (debugCaptcha) {
              console.error('[AnonymousCommentForm] reCAPTCHA execution error:', error);
              console.error('[AnonymousCommentForm] Error type:', error instanceof Error ? error.constructor.name : typeof error);
              console.error('[AnonymousCommentForm] Error message:', error instanceof Error ? error.message : String(error));
            }
            setRecaptchaError('reCAPTCHA verification failed. Please try again.');
          } finally {
            setIsExecutingRecaptcha(false);
          }
        }}
        className="space-y-4"
      >
        <input type="hidden" name="personId" value={personId} />

        {/* Name fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700"
            >
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {state?.errors?.firstName && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.firstName[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700"
            >
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {state?.errors?.lastName && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.lastName[0]}
              </p>
            )}
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email (Optional)
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="your@email.com"
            />
            {state?.errors?.email && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone (Optional)
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="(555) 123-4567"
            />
            {state?.errors?.phone && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.phone[0]}
              </p>
            )}
          </div>
        </div>

        {/* Additional fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="occupation"
              className="block text-sm font-medium text-gray-700"
            >
              Occupation (Optional)
            </label>
            <input
              type="text"
              id="occupation"
              name="occupation"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., Teacher, Engineer, Retired"
            />
            {state?.errors?.occupation && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.occupation[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="birthdate"
              className="block text-sm font-medium text-gray-700"
            >
              Birth Date (Optional)
            </label>
            <input
              type="date"
              id="birthdate"
              name="birthdate"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            {state?.errors?.birthdate && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.birthdate[0]}
              </p>
            )}
          </div>
        </div>

        {/* Address Section */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900">
            Your Address (Optional)
          </h4>
          <p className="text-xs text-gray-600">
            <strong>Privacy Note:</strong> Your full address will NEVER be shown
            publicly. Only city and state can be displayed if you choose.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="streetAddress"
                className="block text-sm font-medium text-gray-700"
              >
                Street Address
              </label>
              <input
                type="text"
                id="streetAddress"
                name="streetAddress"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="123 Main Street"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700"
              >
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="San Diego"
              />
            </div>

            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-gray-700"
              >
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                maxLength={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="CA"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="zipCode"
                className="block text-sm font-medium text-gray-700"
              >
                ZIP Code
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                maxLength={10}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="92101"
              />
            </div>
          </div>
        </div>

        {/* Comment */}
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700"
          >
            Your Message of Support (Optional)
            <span className="text-xs font-normal text-gray-500 ml-1">- May be shown publicly on the site</span>
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            maxLength={500}
            onChange={e => setCommentLength(e.target.value.length)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Share why you support this person, your relationship to them, or any message of encouragement..."
          />
          <div className="mt-1 flex justify-between">
            <div>
              {state?.errors?.content && (
                <p className="text-sm text-red-600">
                  {state.errors.content[0]}
                </p>
              )}
            </div>
            <p
              className={`text-sm ${
                commentLength >= 500 ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {commentLength}/500 characters
            </p>
          </div>
        </div>

        {/* Private Note to Family */}
        <div>
          <label
            htmlFor="privateNoteToFamily"
            className="block text-sm font-medium text-gray-700"
          >
            Private Note to Family (Optional)
          </label>
          <textarea
            id="privateNoteToFamily"
            name="privateNoteToFamily"
            rows={3}
            maxLength={1500}
            onChange={e => setPrivateNoteLength(e.target.value.length)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Share a private message with the family that won't be shown publicly..."
          />
          <div className="mt-1 flex justify-between">
            <div>
              {state?.errors?.privateNoteToFamily && (
                <p className="text-sm text-red-600">
                  {state.errors.privateNoteToFamily[0]}
                </p>
              )}
              <p className="text-sm text-gray-500">
                This message will only be visible to the family members, not publicly displayed.
              </p>
            </div>
            <p
              className={`text-sm ${
                privateNoteLength >= 1500 ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {privateNoteLength}/1500
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3 border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you like to show your support?
          </label>

          <div className="space-y-2">
            <label className="flex items-start">
              <input
                type="checkbox"
                name="wantsToHelpMore"
                value="true"
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                I want to help more. Please contact me and I will provide a
                letter of support along with my identification.
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="displayNameOnly"
                value="true"
                checked={displayNameOnly}
                onChange={(e) => setDisplayNameOnly(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Display just my name as supporting
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="requiresFamilyApproval"
                value="true"
                defaultChecked
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Display my name and comment if the family approves first
              </span>
            </label>
          </div>

          <div className="space-y-2 mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display preferences for optional information:
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="showOccupation"
                value="true"
                defaultChecked={!displayNameOnly}
                disabled={displayNameOnly}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Show my occupation publicly (if provided)
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="showBirthdate"
                value="true"
                defaultChecked={!displayNameOnly}
                disabled={displayNameOnly}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Show my birthdate publicly (if provided)
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="showCityState"
                value="true"
                checked={displayNameOnly ? false : showCityState}
                onChange={(e) => setShowCityState(e.target.checked)}
                disabled={displayNameOnly}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Show my city and state publicly (if provided)
              </span>
            </label>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            <strong>Privacy Notice:</strong> Your information will be kept
            confidential and only shared as you indicate above. Contact
            information will only be used if you volunteer to provide additional
            support.
          </p>
        </div>

        {state?.error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{state.error}</div>
          </div>
        )}

        {recaptchaError && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{recaptchaError}</div>
          </div>
        )}

        {/* Success message is now handled by hiding the form */}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending || isExecutingRecaptcha}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isExecutingRecaptcha ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifying...</span>
              </span>
            ) : isPending ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Submitting...</span>
              </span>
            ) : (
              'Submit Support'
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <CommentConfirmationModal
        isOpen={showConfirmModal}
        isSubmitting={isPending}
        onConfirm={() => {
          if (pendingFormData) {
            startTransition(() => {
              onSubmit(pendingFormData);
            });
            setShowConfirmModal(false);
            setPendingFormData(null);
          }
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingFormData(null);
          // Reset the form
          if (formRef.current) {
            formRef.current.reset();
          }
        }}
        commentData={{
          firstName: (pendingFormData?.get('firstName') as string) || '',
          lastName: (pendingFormData?.get('lastName') as string) || '',
          email: (pendingFormData?.get('email') as string) || undefined,
          phone: (pendingFormData?.get('phone') as string) || undefined,
          content: (pendingFormData?.get('content') as string) || undefined,
          occupation:
            (pendingFormData?.get('occupation') as string) || undefined,
          birthdate: (pendingFormData?.get('birthdate') as string) || undefined,
          streetAddress:
            (pendingFormData?.get('streetAddress') as string) || undefined,
          city: (pendingFormData?.get('city') as string) || undefined,
          state: (pendingFormData?.get('state') as string) || undefined,
          zipCode: (pendingFormData?.get('zipCode') as string) || undefined,
          wantsToHelpMore: pendingFormData?.get('wantsToHelpMore') === 'true',
          displayNameOnly: pendingFormData?.get('displayNameOnly') === 'true',
          requiresFamilyApproval:
            pendingFormData?.get('requiresFamilyApproval') === 'true',
          showOccupation: pendingFormData?.get('showOccupation') === 'true',
          showBirthdate: pendingFormData?.get('showBirthdate') === 'true',
          showCityState: pendingFormData?.get('showCityState') === 'true',
          privateNoteToFamily:
            (pendingFormData?.get('privateNoteToFamily') as string) || undefined,
        }}
      />
    </div>
  );
}
