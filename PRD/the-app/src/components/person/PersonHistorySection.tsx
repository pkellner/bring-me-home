'use client';

import { useState, useEffect } from 'react';
import { SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';
import { formatDateForDisplay } from '@/lib/date-utils';

interface PersonHistorySectionProps {
  history: SanitizedPersonHistory[];
  personName: string;
}

export default function PersonHistorySection({ 
  history, 
  personName
}: PersonHistorySectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showButton, setShowButton] = useState(true);
  
  // Get initial show count from environment variable or default to 2
  const parsedCount = process.env.NEXT_PUBLIC_PERSON_HISTORY_INITIAL_SHOW_COUNT 
    ? parseInt(process.env.NEXT_PUBLIC_PERSON_HISTORY_INITIAL_SHOW_COUNT, 10) 
    : NaN;
  const initialShowCount = isNaN(parsedCount) ? 2 : parsedCount;

  useEffect(() => {
    if (showAll && showButton) {
      // Start the transition
      setIsTransitioning(true);
      
      // Fade out the button first
      const buttonTimer = setTimeout(() => {
        setShowButton(false);
      }, 300);

      // Clean up the transitioning state after animations complete
      const transitionTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 1000);

      return () => {
        clearTimeout(buttonTimer);
        clearTimeout(transitionTimer);
      };
    }
  }, [showAll, showButton]);

  if (history.length === 0) {
    return null;
  }

  // Sort history in reverse chronological order (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Determine which entries to show
  const entriesToShow = showAll ? sortedHistory : sortedHistory.slice(0, initialShowCount);
  const hasMore = sortedHistory.length > initialShowCount;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-light tracking-wide text-gray-800 border-b border-gray-200 pb-3">
        Updates on {personName}
      </h2>
      
      <div className="space-y-4">
        {entriesToShow.map((note, index) => {
          // Calculate staggered delay for entries beyond the initial show count
          const delay = showAll && index >= initialShowCount ? `${(index - initialShowCount) * 150 + 400}ms` : '0ms';
          
          return (
            <div 
              key={note.id} 
              className={`bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all duration-700 ease-out ${
                showAll && index >= initialShowCount 
                  ? 'opacity-0 translate-y-4' 
                  : 'opacity-100 translate-y-0'
              }`}
              style={{
                ...(showAll && index >= initialShowCount && {
                  animation: `fadeInUp 0.7s ease-out ${delay} forwards`
                })
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="text-sm font-medium text-gray-700">
                  {format(formatDateForDisplay(note.date), 'MMMM d, yyyy')}
                </div>
                <div className="text-xs text-gray-500">
                  Posted by {note.createdByUsername}
                </div>
              </div>
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {note.description}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && showButton && (
        <div className={`text-center pt-2 transition-all duration-300 ease-out ${
          isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}>
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center px-6 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
          >
            Show more updates
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}