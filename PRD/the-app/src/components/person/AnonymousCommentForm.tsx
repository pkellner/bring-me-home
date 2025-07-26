'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { useSafeRecaptcha } from '@/hooks/useRecaptcha';
import CommentConfirmationModal from './CommentConfirmationModal';

const debugCaptcha = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === 'true';

export interface AnonymousCommentFormProps {
  personId: string;
  personHistoryId?: string;
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  state?: {
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
    warning?: string;
  };
  onCancel?: () => void;
  title?: string;
  submitButtonText?: string;
}

export default function AnonymousCommentForm({
  personId,
  personHistoryId,
  onSubmit,
  isPending,
  state,
  onCancel,
  title = "Add Your Support",
  submitButtonText = "Submit Support",
}: AnonymousCommentFormProps) {
  // Removed showForm state as we always show the form directly
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [commentLength, setCommentLength] = useState(0);
  const [privateNoteLength, setPrivateNoteLength] = useState(0);
  const [displayNameOnly, setDisplayNameOnly] = useState(false);
  const [showCityState, setShowCityState] = useState(true);
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [isExecutingRecaptcha, setIsExecutingRecaptcha] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedFormData, setSavedFormData] = useState<Record<string, string>>({});
  const [showOccupation, setShowOccupation] = useState(true);
  const [showBirthdate, setShowBirthdate] = useState(true);
  const [showComment, setShowComment] = useState(true);
  const [emailBlockWarning, setEmailBlockWarning] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { executeRecaptcha, isReady } = useSafeRecaptcha();

  if (debugCaptcha) {
    console.log('[AnonymousCommentForm] Component mounted, reCAPTCHA ready:', isReady);
  }

  // Track form changes
  const handleFormChange = useCallback(() => {
    if (!formRef.current) return;
    
    const currentFormData = new FormData(formRef.current);
    const formValues: Record<string, string> = {};
    
    // Get all form values
    for (const [key, val] of currentFormData.entries()) {
      if (typeof val === 'string') {
        formValues[key] = val;
      }
    }
    
    // Check if form is dirty by comparing with saved data
    const hasChanges = Object.keys(formValues).some(key => {
      if (key === 'personId' || key === 'recaptchaToken') return false;
      return formValues[key] !== (savedFormData[key] || '');
    });
    
    setIsDirty(hasChanges);
  }, [savedFormData]);


  // Handle cancel
  const handleCancel = useCallback(() => {
    // Reset form state
    setCommentLength(0);
    setPrivateNoteLength(0);
    setDisplayNameOnly(false);
    setShowCityState(true);
    setPrivacyRequired(false);
    setShowOccupation(true);
    setShowBirthdate(true);
    setShowComment(true);
    setIsDirty(false);
    setSavedFormData({});
    if (formRef.current) {
      formRef.current.reset();
    }
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Scroll to first error
  const scrollToError = useCallback(() => {
    if (!state?.errors) return;
    
    // Find first field with error
    const errorFields = Object.keys(state.errors);
    if (errorFields.length > 0) {
      const firstErrorField = document.getElementById(errorFields[0]);
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
    }
  }, [state?.errors]);

  // Scroll to error when errors occur
  useEffect(() => {
    if (state?.errors) {
      scrollToError();
    }
  }, [state?.errors, scrollToError]);

  // Don't reset form on success - user needs to refresh for new submission
  useEffect(() => {
    if (state?.success) {
      // Just mark as no longer dirty since submission was successful
      setIsDirty(false);
    }
  }, [state?.success]);


  return (
    <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
      <form
        ref={formRef}
        id="support-form"
        onChange={handleFormChange}
        action={async formData => {
          setRecaptchaError(null);
          
          if (debugCaptcha) {
            console.log('[AnonymousCommentForm] Form submitted, checking reCAPTCHA...');
            console.log('[AnonymousCommentForm] reCAPTCHA ready:', isReady);
          }
          
          // Execute reCAPTCHA
          if (!isReady) {
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
            if (token) {
              formData.append('recaptchaToken', token);
            } else {
              throw new Error('Failed to get reCAPTCHA token');
            }
            
            // Check if email has anonymous comments blocked
            const emailValue = formData.get('email') as string;
            if (emailValue) {
              try {
                const response = await fetch('/api/profile/anonymous-comments?' + new URLSearchParams({ email: emailValue }));
                if (response.ok) {
                  const data = await response.json();
                  if (!data.allowAnonymousComments) {
                    setEmailBlockWarning('Comments from this email will be hidden by default. The owner of this email address has disabled anonymous comments. They must log in and enable anonymous comments in their profile settings to make them visible.');
                  } else {
                    setEmailBlockWarning(null);
                  }
                }
              } catch (error) {
                console.error('Failed to check email status:', error);
              }
            }
            
            // Capture form data and show confirmation modal
            setPendingFormData(formData);
            setShowConfirmModal(true);
          } catch (error) {
            if (debugCaptcha) {
              console.error('[AnonymousCommentForm] reCAPTCHA execution error:', error);
              console.error('[AnonymousCommentForm] Error type:', error instanceof Error ? error.constructor.name : typeof error);
              console.error('[AnonymousCommentForm] Error message:', error instanceof Error ? error.message : String(error));
            }
            
            // Use the error message from our safe hook if available
            const errorMessage = error instanceof Error ? error.message : 'reCAPTCHA verification failed. Please try again.';
            setRecaptchaError(errorMessage);
          } finally {
            setIsExecutingRecaptcha(false);
          }
        }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {title}
          </h3>
          <div className="flex items-center gap-2">
            {isDirty && (
              <button
                type="submit"
                disabled={isPending || isExecutingRecaptcha}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExecutingRecaptcha ? 'Verifying...' : isPending ? 'Submitting...' : submitButtonText}
              </button>
            )}
            {onCancel && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            )}
          </div>
        </div>

        <input type="hidden" name="personId" value={personId} />
        {personHistoryId && (
          <input type="hidden" name="personHistoryId" value={personHistoryId} />
        )}
        <input type="hidden" name="requiresFamilyApproval" value="true" />

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
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setDisplayNameOnly(isChecked);
                  if (isChecked) {
                    // When display name only is selected, disable display preferences
                    setShowOccupation(false);
                    setShowBirthdate(false);
                    setShowCityState(false);
                  }
                }}
                disabled={privacyRequired}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Display just my name as supporting (hide occupation, age, and location)
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="showComment"
                value="true"
                checked={showComment}
                onChange={(e) => setShowComment(e.target.checked)}
                disabled={privacyRequired}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Display my comment text (requires family approval)
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="privacyRequiredDoNotShowPublicly"
                value="true"
                checked={privacyRequired}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setPrivacyRequired(isChecked);
                  if (isChecked) {
                    // Disable and uncheck all display-related checkboxes
                    setDisplayNameOnly(false);
                    setShowOccupation(false);
                    setShowBirthdate(false);
                    setShowCityState(false);
                    setShowComment(false);
                  }
                }}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Please don&apos;t publicly show my name, just let the family know I support them
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
                checked={showOccupation}
                onChange={(e) => setShowOccupation(e.target.checked)}
                disabled={displayNameOnly || privacyRequired}
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
                checked={showBirthdate}
                onChange={(e) => setShowBirthdate(e.target.checked)}
                disabled={displayNameOnly || privacyRequired}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Show my age publicly (if birthdate provided)
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="showCityState"
                value="true"
                checked={showCityState}
                onChange={(e) => setShowCityState(e.target.checked)}
                disabled={displayNameOnly || privacyRequired}
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
            disabled={!isDirty || isPending || isExecutingRecaptcha}
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
              submitButtonText
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <CommentConfirmationModal
        isOpen={showConfirmModal}
        isSubmitting={isPending}
        title={personHistoryId ? "Review Your Comment" : "Review Your Support Message"}
        description={personHistoryId 
          ? "Your comment is being reviewed by the family to make sure it is OK with them."
          : "Your message is being reviewed by the family to make sure it is OK with them."
        }
        confirmButtonText={personHistoryId ? "OK, Post My Comment" : "OK, Post My Support"}
        warningMessage={emailBlockWarning}
        onConfirm={() => {
          if (pendingFormData) {
            startTransition(() => {
              onSubmit(pendingFormData);
            });
            setShowConfirmModal(false);
            setPendingFormData(null);
            setEmailBlockWarning(null);
          }
        }}
        onCancel={() => {
          setShowConfirmModal(false);
          setPendingFormData(null);
          setEmailBlockWarning(null);
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
          requiresFamilyApproval: true,
          showOccupation: pendingFormData?.get('showOccupation') === 'true',
          showBirthdate: pendingFormData?.get('showBirthdate') === 'true',
          showCityState: pendingFormData?.get('showCityState') === 'true',
          showComment: pendingFormData?.get('showComment') === 'true',
          privateNoteToFamily:
            (pendingFormData?.get('privateNoteToFamily') as string) || undefined,
        }}
      />
    </div>
  );
}
