'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface PersonEditNavigationProps {
  personId: string;
  hasChanges?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
}

export function PersonEditNavigation({ 
  personId, 
  hasChanges = false, 
  onSave,
  isSaving = false 
}: PersonEditNavigationProps) {
  const pathname = usePathname();
  
  const isDetailsPage = pathname === `/admin/persons/${personId}/edit`;
  const isPersonImagePage = pathname === `/admin/persons/${personId}/edit/person-image`;
  const isGalleryPage = pathname === `/admin/persons/${personId}/edit/gallery-images`;

  return (
    <div className="border-b mb-6">
      <div className="flex items-center justify-between">
        <nav className="flex -mb-px">
          <Link
            href={`/admin/persons/${personId}/edit`}
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
        </nav>
        
        {onSave && (
          <Button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            variant={hasChanges ? "default" : "outline"}
            className="mb-2"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>
    </div>
  );
}