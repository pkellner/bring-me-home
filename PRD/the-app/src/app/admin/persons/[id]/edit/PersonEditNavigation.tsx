'use client';

import React from 'react';
import Link from '@/components/OptimizedLink';
import { usePathname } from 'next/navigation';
import { Save, AlertCircle } from 'lucide-react';

interface PersonEditNavigationProps {
  personId: string;
  hasChanges?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  onNavigate?: (href: string) => void;
}

export function PersonEditNavigation({ 
  personId, 
  hasChanges = false, 
  onSave,
  isSaving = false,
  onNavigate
}: PersonEditNavigationProps) {
  const pathname = usePathname();
  
  const isDetailsPage = pathname === `/admin/persons/${personId}/edit`;
  const isPersonImagePage = pathname === `/admin/persons/${personId}/edit/person-image`;
  const isGalleryPage = pathname === `/admin/persons/${personId}/edit/gallery-images`;
  const isHistoryPage = pathname === `/admin/persons/${personId}/edit/history`;

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (hasChanges && pathname !== href) {
      e.preventDefault();
      if (onNavigate) {
        onNavigate(href);
      }
    }
  };

  return (
    <div className="border-b mb-6">
      <div className="flex items-center justify-between">
        <nav className="flex -mb-px">
          <Link
            href={`/admin/persons/${personId}/edit`}
            onClick={(e) => handleNavClick(e, `/admin/persons/${personId}/edit`)}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${isDetailsPage 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Person Details
          </Link>
          <Link
            href={`/admin/persons/${personId}/edit/person-image`}
            onClick={(e) => handleNavClick(e, `/admin/persons/${personId}/edit/person-image`)}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${isPersonImagePage 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Primary Image
          </Link>
          <Link
            href={`/admin/persons/${personId}/edit/gallery-images`}
            onClick={(e) => handleNavClick(e, `/admin/persons/${personId}/edit/gallery-images`)}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${isGalleryPage 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Gallery Images
          </Link>
          <Link
            href={`/admin/persons/${personId}/edit/history`}
            onClick={(e) => handleNavClick(e, `/admin/persons/${personId}/edit/history`)}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${isHistoryPage 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            History
          </Link>
        </nav>
        
        <div className="flex items-center gap-4 mb-2">
          {hasChanges && (
            <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
              <AlertCircle className="mr-2 h-4 w-4" />
              <span className="text-sm font-semibold">Changes pending... press save to update</span>
            </div>
          )}
          
          {onSave && (
            <button
              onClick={onSave}
              disabled={!hasChanges || isSaving}
              className={`
                inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                ${hasChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
                ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}
                transition-colors duration-200
              `}
            >
              <Save className={`mr-2 h-4 w-4 ${hasChanges ? 'text-white' : 'text-gray-400'}`} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}