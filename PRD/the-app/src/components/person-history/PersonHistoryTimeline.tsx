'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SanitizedPersonHistory } from '@/types/sanitized';
import PersonHistoryItem from './PersonHistoryItem';
import { getCommentCountsByPersonHistoryIds } from '@/app/actions/comments';

interface PersonHistoryTimelineProps {
  history: SanitizedPersonHistory[];
  personId: string;
  personName: string;
  townSlug?: string;
  personSlug?: string;
  isPersonAdmin?: boolean;
  isTownAdmin?: boolean;
  isSiteAdmin?: boolean;
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function PersonHistoryTimeline({ 
  history, 
  personId,
  personName,
  townSlug,
  personSlug,
  isPersonAdmin,
  isTownAdmin,
  isSiteAdmin,
  searchParams
}: PersonHistoryTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map());
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Extract URL parameters
  const targetUpdateId = searchParams?.update ? String(searchParams.update) : null;
  const shouldAddComment = searchParams?.addComment === 'true';
  const magicToken = searchParams?.uid ? String(searchParams.uid) : null;
  
  // Show only the most recent update by default
  const initialShowCount = 1;

  // Load comment counts
  useEffect(() => {
    const loadCommentCounts = async () => {
      setIsLoadingCounts(true);
      const historyIds = history.map(h => h.id);
      const counts = await getCommentCountsByPersonHistoryIds(historyIds);
      setCommentCounts(counts);
      
      // Auto-expand based on URL parameter or first item with comments
      if (targetUpdateId && history.some(h => h.id === targetUpdateId)) {
        // If there's a target update ID in URL, expand that and show all updates
        setExpandedItems(new Set([targetUpdateId]));
        setShowAll(true);
      } else if (history.length > 0) {
        // Otherwise, auto-expand the first item if it has comments
        const sortedHistory = [...history].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const firstItem = sortedHistory[0];
        const firstItemCommentCount = counts.get(firstItem.id) || 0;
        if (firstItemCommentCount > 0) {
          setExpandedItems(new Set([firstItem.id]));
        }
      }
      
      setIsLoadingCounts(false);
    };

    if (history.length > 0) {
      loadCommentCounts();
    }
  }, [history, targetUpdateId]);

  // Scroll to target update after render
  useEffect(() => {
    if (targetUpdateId && !isLoadingCounts) {
      // Small delay to ensure DOM is ready
      const scrollTimer = setTimeout(() => {
        const element = document.getElementById(`history-item-${targetUpdateId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      return () => clearTimeout(scrollTimer);
    }
  }, [targetUpdateId, isLoadingCounts]);

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
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h2 className="text-2xl font-light tracking-wide text-gray-800">
          Updates on {personName}
        </h2>
        {(isPersonAdmin || isTownAdmin || isSiteAdmin) && (
          <Link
            href={`/admin/persons/${personId}/edit/history`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            [Manage and Add Updates]
          </Link>
        )}
      </div>
      
      <div className="space-y-6">
        {entriesToShow.map((note, index) => (
          <div key={note.id} id={`history-item-${note.id}`}>
            <PersonHistoryItem
              historyItem={note}
              personId={personId}
              personName={personName}
              commentCount={commentCounts.get(note.id) || 0}
              isLoadingComments={isLoadingCounts}
              showAnimation={showAll && index >= initialShowCount}
              animationDelay={showAll && index >= initialShowCount ? `${(index - initialShowCount) * 150 + 400}ms` : '0ms'}
              isExpanded={expandedItems.has(note.id)}
              onExpandedChange={(expanded) => {
                setExpandedItems(prev => {
                  const newSet = new Set(prev);
                  if (expanded) {
                    newSet.add(note.id);
                  } else {
                    newSet.delete(note.id);
                  }
                  return newSet;
                });
              }}
              townSlug={townSlug}
              personSlug={personSlug}
              shouldTriggerAddComment={targetUpdateId === note.id && shouldAddComment}
              magicToken={targetUpdateId === note.id ? magicToken : null}
            />
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <div className="text-center pt-2">
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center px-6 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
          >
            Show {sortedHistory.length - initialShowCount} Previous {sortedHistory.length - initialShowCount === 1 ? 'Update' : 'Updates'}
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}