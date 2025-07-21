import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * A wrapper around Next.js Link that respects the NEXT_PUBLIC_ENABLE_PREFETCH environment variable
 * Use this component instead of next/link directly to control prefetching globally
 * 
 * Default behavior: prefetching is DISABLED unless explicitly enabled
 */
export default function OptimizedLink(props: ComponentProps<typeof Link>) {
  const enablePrefetch = process.env.NEXT_PUBLIC_ENABLE_PREFETCH === 'true';
  
  return (
    <Link 
      {...props} 
      prefetch={props.prefetch ?? enablePrefetch}
    />
  );
}