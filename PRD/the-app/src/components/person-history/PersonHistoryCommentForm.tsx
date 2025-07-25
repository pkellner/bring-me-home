'use client';

import { useState, useTransition } from 'react';
import { submitComment } from '@/app/actions/comments';
import AnonymousCommentFormWithRecaptcha from '@/components/person/AnonymousCommentFormWithRecaptcha';

interface PersonHistoryCommentFormProps {
  personId: string;
  personHistoryId: string;
  updateDescription: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PersonHistoryCommentForm({
  personId,
  personHistoryId,
  updateDescription,
  onSuccess,
  onCancel,
}: PersonHistoryCommentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{
    success?: boolean;
    error?: string;
    errors?: Record<string, string[]>;
  }>({});

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
          Commenting on update: <span className="font-medium">&ldquo;{updateDescription.substring(0, 50)}...&rdquo;</span>
        </p>
      </div>
      <AnonymousCommentFormWithRecaptcha
        personId={personId}
        personHistoryId={personHistoryId}
        onSubmit={handleSubmit}
        isPending={isPending}
        state={state}
        onCancel={onCancel}
        title="Comment On This"
        submitButtonText="Post Comment"
      />
    </div>
  );
}