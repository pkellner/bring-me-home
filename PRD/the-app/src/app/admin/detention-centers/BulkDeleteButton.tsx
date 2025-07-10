'use client';

import { useState } from 'react';
import { deleteEmptyDetentionCenters } from '@/app/actions/detention-centers';

interface BulkDeleteButtonProps {
  state?: string;
  label?: string;
  className?: string;
}

export default function BulkDeleteButton({
  state,
  label,
  className = '',
}: BulkDeleteButtonProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleBulkDelete() {
    const message = state
      ? `Are you sure you want to delete all detention centers without detainees in ${state}?`
      : 'Are you sure you want to delete ALL detention centers without detainees?';

    if (!confirm(message)) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteEmptyDetentionCenters(state);

      if (result.success) {
        if (result.deletedCount > 0) {
          alert(
            `Successfully deleted ${result.deletedCount} empty detention center(s)`
          );
        } else {
          alert('No empty detention centers found to delete');
        }
      } else if (result.errors) {
        alert(
          `Error: ${
            result.errors._form?.[0] || 'Failed to delete detention centers'
          }`
        );
      }
    } catch (error) {
      console.error('Failed to delete detention centers:', error);
      alert('Failed to delete detention centers');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleBulkDelete}
      disabled={deleting}
      className={`inline-flex items-center text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {deleting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Deleting...
        </>
      ) : (
        <>
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          {label || 'Delete Empty Centers'}
        </>
      )}
    </button>
  );
}
