'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import CommentConfirmationModal from './CommentConfirmationModal';

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
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [commentLength, setCommentLength] = useState(0);
  const [displayNameOnly, setDisplayNameOnly] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form and hide when submission is successful
  useEffect(() => {
    if (state?.success) {
      setShowForm(false);
      setCommentLength(0);
      setDisplayNameOnly(false);
      if (formRef.current) {
        formRef.current.reset();
      }
    }
  }, [state?.success]);

  if (!showForm) {
    return (
      <div className="mb-8">
        {/* Success message after submission */}
        {state?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Thank you for your support!
                </h3>
                <p className="mt-2 text-sm text-green-700">
                  Your message has been submitted and will be reviewed by the
                  family before being posted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show support button */}
        <div className="bg-blue-50 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Show Your Support
          </h3>
          <p className="text-gray-600 mb-4">
            Your support matters. Add your voice to help bring this person home.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add Your Support
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Add Your Support
      </h3>

      <form
        ref={formRef}
        action={formData => {
          // Capture form data and show confirmation modal instead of submitting
          setPendingFormData(formData);
          setShowConfirmModal(true);
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
                checked={displayNameOnly ? false : undefined}
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

        {/* Success message is now handled by hiding the form */}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Submitting...' : 'Submit Support'}
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      <CommentConfirmationModal
        isOpen={showConfirmModal}
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
        }}
      />
    </div>
  );
}
