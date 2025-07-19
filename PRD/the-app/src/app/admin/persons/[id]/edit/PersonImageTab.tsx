'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Upload, Save } from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';
import type { SanitizedPersonImage } from '@/types/sanitized';

interface PersonImageTabProps {
  personId: string;
  onChangeDetected?: (hasChanges: boolean) => void;
  onSaveRegistered?: (save: () => Promise<void>) => void;
  onSavingChange?: (isSaving: boolean) => void;
  hideButtons?: boolean;
}

export function PersonImageTab({ 
  personId,
  onChangeDetected,
  onSaveRegistered,
  onSavingChange,
  hideButtons = false
}: PersonImageTabProps) {
  const [currentImage, setCurrentImage] = useState<SanitizedPersonImage | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shouldClearImage, setShouldClearImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch primary image when component mounts or personId changes
  useEffect(() => {
    const fetchPrimaryImage = async () => {
      if (!personId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/persons/${personId}/images?type=primary`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch primary image');
        }

        const primaryImage = await response.json();
        setCurrentImage(primaryImage);
      } catch (err) {
        console.error('Error fetching primary image:', err);
        setError('Failed to load primary image');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrimaryImage();
  }, [personId]);

  // Notify parent of changes
  useEffect(() => {
    onChangeDetected?.(hasChanges);
  }, [hasChanges, onChangeDetected]);

  // Notify parent of saving state
  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  // Handle browser navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && !hideButtons) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, hideButtons]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShouldClearImage(false);
      setHasChanges(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    setShouldClearImage(true);
    setHasChanges(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      
      if (selectedFile) {
        formData.append('primaryPicture', selectedFile);
      } else if (shouldClearImage) {
        formData.append('clearPrimaryPicture', 'true');
      }

      const response = await fetch(`/api/persons/${personId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Image save error:', errorData);
        throw new Error(errorData.error || 'Failed to save image');
      }

      showSuccessAlert('Primary image updated successfully!', 3000);
      setHasChanges(false);
      setShouldClearImage(false);
      setSelectedFile(null);
      
      // Refresh the current image
      const imageResponse = await fetch(`/api/persons/${personId}/images?type=primary`);
      if (imageResponse.ok) {
        const primaryImage = await imageResponse.json();
        setCurrentImage(primaryImage);
        setImagePreview(null);
      }
    } catch (err) {
      console.error('Error saving image:', err);
      setError('Failed to save image');
      showErrorAlert('Failed to save image', 5000);
    } finally {
      setIsSaving(false);
    }
  }, [personId, selectedFile, shouldClearImage]);

  // Register save function with parent
  useEffect(() => {
    onSaveRegistered?.(handleSave);
  }, [onSaveRegistered, handleSave]);

  const imageToShow = imagePreview || (currentImage && !shouldClearImage ? `/api/images/${currentImage.imageId}?t=${new Date().getTime()}` : null);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-64 h-64 bg-gray-200 animate-pulse rounded-lg" />
              <div className="flex gap-4">
                <div className="h-10 w-28 bg-gray-200 animate-pulse rounded-md" />
                <div className="h-10 w-28 bg-gray-200 animate-pulse rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !hasChanges) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-red-500">{error}</span>
              </div>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {imageToShow ? (
              <div className="relative w-64 h-64">
                <Image
                  src={imageToShow}
                  alt="Person image"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">No image selected</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              name="primaryPicture"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearImage}
                disabled={!imageToShow || isSaving}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Image
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleSelectImageClick}
                disabled={isSaving}
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Image
              </Button>
            </div>
            
            {hasChanges && !hideButtons && (
              <div className="w-full border-t pt-4 mt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full"
                  variant="default"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {hasChanges && !hideButtons && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
          You have unsaved changes. Please save before leaving this page.
        </div>
      )}
    </div>
  );
}