'use client';

import Link from '@/components/OptimizedLink';
import HeaderNavigation from '@/components/HeaderNavigation';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backLink?: {
    href: string;
    text: string;
  };
  user?: {
    id: string;
    username: string | null;
    email: string | null;
    roles?: Array<{ name: string }>;
  } | null;
  className?: string;
}

export default function PageHeader({ 
  title, 
  subtitle,
  backLink,
  user,
  className = ''
}: PageHeaderProps) {
  return (
    <header className={`bg-white shadow ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            {backLink && (
              <Link
                href={backLink.href}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              >
                {backLink.text}
              </Link>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
              {title}
            </h1>
            {subtitle && (
              <span className="text-gray-600 text-lg">{subtitle}</span>
            )}
          </div>
          <HeaderNavigation user={user ? {
            ...user,
            username: user.username || '',
            firstName: undefined,
          } : null} />
        </div>
      </div>
    </header>
  );
}