'use client';

import { useState, useEffect } from 'react';
import { SanitizedPersonHistory } from '@/types/sanitized';
import { format } from 'date-fns';
import { formatDateForDisplay } from '@/lib/date-utils';
import { useSession } from 'next-auth/react';
import Link from '@/components/OptimizedLink';
import { getAllCommentsByPersonHistoryId } from '@/app/actions/comments';

interface PersonHistorySectionProps {
  history: SanitizedPersonHistory[];
  personName: string;
  personId: string;
  townSlug: string;
  personSlug: string;
}

export default function PersonHistorySection({ 
  history, 
  personName,
  townSlug,
  personSlug
}: PersonHistorySectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [unapprovedCounts, setUnapprovedCounts] = useState<Map<string, number>>(new Map());
  const { data: session } = useSession();
  
  // Get initial show count from environment variable or default to 2
  const parsedCount = process.env.NEXT_PUBLIC_PERSON_HISTORY_INITIAL_SHOW_COUNT 
    ? parseInt(process.env.NEXT_PUBLIC_PERSON_HISTORY_INITIAL_SHOW_COUNT, 10) 
    : NaN;
  const initialShowCount = isNaN(parsedCount) ? 2 : parsedCount;

  // Check if user has permission to moderate comments
  const canModerateComments = session?.user?.roles?.some(
    role => ['site-admin', 'town-admin', 'person-admin'].includes(role.name)
  ) || false;

  // Load unapproved comment counts if user can moderate
  useEffect(() => {
    if (canModerateComments && history.length > 0) {
      const loadUnapprovedCounts = async () => {
        const counts = new Map<string, number>();
        
        // Load counts for each history item
        await Promise.all(
          history.map(async (item) => {
            try {
              const comments = await getAllCommentsByPersonHistoryId(item.id);
              const unapprovedCount = comments.filter(c => !c.isApproved).length;
              counts.set(item.id, unapprovedCount);
            } catch (error) {
              console.error('Error loading comment counts:', error);
            }
          })
        );
        
        setUnapprovedCounts(counts);
      };
      
      loadUnapprovedCounts();
    }
  }, [canModerateComments, history]);

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
                  {canModerateComments && unapprovedCounts.get(note.id) ? (
                    <Link
                      href={`/admin/comments/${townSlug}/${personSlug}#${note.id}`}
                      className="text-red-600 hover:text-red-700 font-medium"
                    >
                      {unapprovedCounts.get(note.id)} comment{unapprovedCounts.get(note.id) !== 1 ? 's' : ''} unapproved
                    </Link>
                  ) : (
                    <>Posted by {note.createdByUsername}</>
                  )}
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