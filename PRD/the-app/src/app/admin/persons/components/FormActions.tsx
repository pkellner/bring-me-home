'use client';

import Link from 'next/link';

interface FormActionsProps {
  isSubmitting: boolean;
  isEditMode: boolean;
}

export default function FormActions({ isSubmitting, isEditMode }: FormActionsProps) {
  return (
    <div className="flex justify-end space-x-3">
      <Link
        href="/admin/persons"
        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
      >
        Cancel
      </Link>
      <button
        type="submit"
        disabled={isSubmitting}
        className={`px-4 py-2 rounded-md text-white ${
          isSubmitting 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isEditMode ? 'Updating...' : 'Creating...'}
          </span>
        ) : (
          `${isEditMode ? 'Update' : 'Create'} Person`
        )}
      </button>
    </div>
  );
}