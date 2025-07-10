'use client';

import { useState } from 'react';

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

  if (!showForm) {
    return (
      <div className="mb-8 bg-blue-50 rounded-lg p-6 text-center">
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
    );
  }

  return (
    <div className="mb-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Add Your Support
      </h3>
      
      <form action={onSubmit} className="space-y-4">
        <input type="hidden" name="personId" value={personId} />
        
        {/* Name fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
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
              <p className="mt-1 text-sm text-red-600">{state.errors.firstName[0]}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
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
              <p className="mt-1 text-sm text-red-600">{state.errors.lastName[0]}</p>
            )}
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
              <p className="mt-1 text-sm text-red-600">{state.errors.email[0]}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
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
              <p className="mt-1 text-sm text-red-600">{state.errors.phone[0]}</p>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Your Message of Support (Optional)
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Share why you support this person, your relationship to them, or any message of encouragement..."
          />
          {state?.errors?.content && (
            <p className="mt-1 text-sm text-red-600">{state.errors.content[0]}</p>
          )}
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
                I want to help more. Please contact me and I will provide a letter of support along with my identification.
              </span>
            </label>
            
            <label className="flex items-start">
              <input
                type="checkbox"
                name="displayNameOnly"
                value="true"
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
        </div>

        {/* Privacy notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            <strong>Privacy Notice:</strong> Your information will be kept confidential and only shared as you indicate above. 
            Contact information will only be used if you volunteer to provide additional support.
          </p>
        </div>

        {state?.error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{state.error}</div>
          </div>
        )}

        {state?.success && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700">
              Thank you for your support! Your message has been submitted and will be reviewed by the family.
            </div>
          </div>
        )}

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
    </div>
  );
}