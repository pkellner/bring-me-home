'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Session } from 'next-auth';
import { isSiteAdmin } from '@/lib/permissions';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';
import type { Person, Town, DetentionCenter, Story, ImageStorage } from '@prisma/client';
import { importPersonData } from '@/app/actions/persons';

type SerializedPerson = Omit<Person, 'bondAmount'> & {
  bondAmount: string | null;
  town: Town;
  detentionCenter?: DetentionCenter | null;
  stories?: Story[];
  images?: ImageStorage[];
};

interface FormActionsProps {
  isSubmitting: boolean;
  isEditMode: boolean;
  person?: SerializedPerson;
  session?: Session | null;
}

export default function FormActions({ 
  isSubmitting, 
  isEditMode, 
  person,
  session 
}: FormActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const isSystemAdmin = session ? isSiteAdmin(session) : false;

  const handleExport = async () => {
    if (!person) return;
    
    setIsExporting(true);
    try {
      // Fetch primary picture as base64 if it exists
      let primaryPictureData = null;
      if (person.primaryPicture) {
        try {
          const response = await fetch(person.primaryPicture);
          const blob = await response.blob();
          primaryPictureData = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Failed to fetch primary picture:', error);
        }
      }

      // Fetch additional images as base64
      const imagesWithData = await Promise.all(
        (person.images || []).map(async (img) => {
          try {
            const response = await fetch(`/api/images/${img.id}`);
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            return { 
              imageUrl: `/api/images/${img.id}`,
              caption: img.caption,
              isPrimary: (img as ImageStorage & { imageType?: string }).imageType === 'profile',
              isActive: true,
              displayPublicly: true,
              imageData: base64 
            };
          } catch (error) {
            console.error('Failed to fetch image:', img.id, error);
            return { 
              imageUrl: `/api/images/${img.id}`,
              caption: img.caption,
              isPrimary: (img as ImageStorage & { imageType?: string }).imageType === 'profile',
              isActive: true,
              displayPublicly: true,
              imageData: null 
            };
          }
        })
      );

      // Prepare export data (exclude town, layout, theme, and detention center)
      const exportData = {
        ...person,
        primaryPictureData,
        personImages: imagesWithData,
        townId: undefined,
        town: undefined,
        layoutId: undefined,
        layout: undefined,
        themeId: undefined,
        theme: undefined,
        detentionCenterId: undefined,
        detentionCenter: undefined,
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0'
      };

      // Convert to JSON and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Format date as YYYY-MM-DD--HH-MM-AM/PM
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      const hour12 = hours % 12 || 12;
      const dateTimeString = `${year}-${month}-${day}--${hour12}-${minutes}-${ampm}`;
      
      a.download = `${person.firstName}-${person.lastName}-${person.id}-${dateTimeString}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccessAlert('Person data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      showErrorAlert('Failed to export person data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!person) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setIsImporting(true);
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Confirm overwrite
        if (!confirm(`This will overwrite the current person data for ${person.firstName} ${person.lastName}. Continue?`)) {
          setIsImporting(false);
          return;
        }
        
        // Call server action to import data
        const result = await importPersonData(person.id, importData);
        
        if (result.success) {
          showSuccessAlert(result.message || 'Person data imported successfully');
          // Refresh the page to show updated data
          window.location.reload();
        } else {
          showErrorAlert(result.error || 'Failed to import person data');
        }
        
      } catch (error) {
        console.error('Import failed:', error);
        showErrorAlert('Failed to import person data. Please check the file format.');
      } finally {
        setIsImporting(false);
      }
    };
    
    input.click();
  };
  return (
    <div className="flex justify-between">
      {/* Export/Import buttons for system admins */}
      <div className="flex space-x-2">
        {isSystemAdmin && isEditMode && person && (
          <>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 rounded-md text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              className="px-4 py-2 rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </>
        )}
      </div>
      
      {/* Cancel and Update/Create buttons */}
      <div className="flex space-x-3">
        <Link
          href="/admin/persons"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 rounded-md text-white ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEditMode ? 'Updating...' : 'Creating...'}
            </span>
          ) : (
            `${isEditMode ? 'Update' : 'Create'} Person`
          )}
        </button>
      </div>
    </div>
  );
}