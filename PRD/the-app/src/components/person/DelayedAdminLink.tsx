'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CogIcon } from '@heroicons/react/24/outline';

interface DelayedAdminLinkProps {
  personId: string;
  delaySeconds: number;
}

export default function DelayedAdminLink({
  personId,
  delaySeconds,
}: DelayedAdminLinkProps) {
  const [showLink, setShowLink] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLink(true);
    }, delaySeconds * 1000);

    return () => clearTimeout(timer);
  }, [delaySeconds]);

  if (!showLink) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link
        href={`/admin/persons/${personId}/edit`}
        className="inline-flex items-center px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
      >
        <CogIcon className="h-4 w-4 mr-2" />
        Admin Edit (Site Admin Only)
      </Link>
    </div>
  );
}
