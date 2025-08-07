'use client';

import { useState, useTransition, useEffect } from 'react';
import { submitComment } from '@/app/actions/comments';
import AnonymousCommentFormWithRecaptcha from '@/components/person/AnonymousCommentFormWithRecaptcha';

interface PersonHistoryCommentFormProps {
  personId: string;
  personHistoryId: string; // Add personHistoryId
  updateTitle: string;
  onSuccess: () => void;
  onCancel: () => void;
  magicToken?: string | null;
}

export default function PersonHistoryCommentForm({
  personId,
  personHistoryId,
  updateTitle,
  onSuccess,
  onCancel,
  magicToken,
}: PersonHistoryCommentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
    warning?: string;
    recaptchaScore?: number;
    recaptchaDetails?: {
      success: boolean;
      score: number;
      action: string;
      hostname: string;
      challenge_ts: string;
      'error-codes'?: string[];
    };
  }>({});
  const [currentUserData, setCurrentUserData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user/current');
        const data = await response.json();
        if (data.user && data.user.email && data.user.firstName && data.user.lastName) {
          setCurrentUserData({
            email: data.user.email,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
          });
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    // Only fetch if not using magic token
    if (!magicToken) {
      fetchCurrentUser();
    }
  }, [magicToken]);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await submitComment(state, formData);
      setState(result);
      
      if (result.success) {
        onSuccess();
      }
    });
  };

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Commenting on update: <span className="font-medium">&ldquo;{updateTitle}&rdquo;</span>
        </p>
      </div>
      <AnonymousCommentFormWithRecaptcha
        personId={personId}
        personHistoryId={personHistoryId} // Pass personHistoryId
        onSubmit={handleSubmit}
        isPending={isPending}
        state={state}
        onCancel={onCancel}
        title="Comment On This"
        submitButtonText="Post Comment"
        magicToken={magicToken}
        magicLinkData={currentUserData ? {
          user: { email: currentUserData.email },
          previousComment: {
            email: currentUserData.email,
            firstName: currentUserData.firstName,
            lastName: currentUserData.lastName,
          }
        } : undefined}
      />
    </div>
  );
}