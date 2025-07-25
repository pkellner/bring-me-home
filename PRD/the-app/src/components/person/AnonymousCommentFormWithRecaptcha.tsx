'use client';

import dynamic from 'next/dynamic';
import AnonymousCommentForm from './AnonymousCommentForm';

// Dynamically import RecaptchaProvider with no SSR to prevent hydration issues
const RecaptchaProvider = dynamic(
  () => import('@/components/providers/RecaptchaProvider'),
  { 
    ssr: false,
    loading: () => null 
  }
);

// Export the same props type as AnonymousCommentForm
export type { AnonymousCommentFormProps } from './AnonymousCommentForm';

// Wrapper component that includes RecaptchaProvider
export default function AnonymousCommentFormWithRecaptcha(props: React.ComponentProps<typeof AnonymousCommentForm>) {
  return (
    <RecaptchaProvider>
      <AnonymousCommentForm {...props} />
    </RecaptchaProvider>
  );
}