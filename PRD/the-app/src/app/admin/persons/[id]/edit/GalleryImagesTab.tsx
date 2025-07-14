'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Save } from 'lucide-react';
import { PersonImage, ImageStorage } from '@prisma/client';
import { showSuccessAlert, showErrorAlert } from '@/lib/alertBox';

interface GalleryImage {
  id: string;
  file?: File;
  preview?: string;
  caption: string;
  originalCaption?: string;
  isNew?: boolean;
  toDelete?: boolean;
  personImage?: PersonImage;
}

interface GalleryImagesTabProps {
  personId: string;
  onChangeDetected?: (hasChanges: boolean) => void;
  onSaveRegistered?: (save: () => Promise<void>) => void;
  onSavingChange?: (isSaving: boolean) => void;
  hideButtons?: boolean;
}

export function GalleryImagesTab({ 
  personId,
  onChangeDetected,
  onSaveRegistered,
  onSavingChange,
  hideButtons = false
}: GalleryImagesTabProps) {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialImagesRef = useRef<string>('');

  // Fetch images when component mounts or personId changes
  useEffect(() => {
    const fetchImages = async () => {
      if (!personId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/persons/${personId}/images?type=gallery`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }

        const personImages: (PersonImage & { image: ImageStorage })[] = await response.json();
        
        const initialImages: GalleryImage[] = personImages
          .filter(img => img.imageType === 'gallery')
          .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
          .map(img => ({
            id: img.image.id,
            caption: img.image.caption || '',
            originalCaption: img.image.caption || '',
            personImage: img,
            preview: `/api/images/${img.imageId}?t=${new Date().getTime()}`
          }));
          
        setGalleryImages(initialImages);
        // Store only the relevant fields for comparison
        initialImagesRef.current = JSON.stringify(initialImages.map(img => ({
          id: img.id,
          caption: img.caption,
          isNew: img.isNew,
          toDelete: img.toDelete
        })));
      } catch (err) {
        console.error('Error fetching gallery images:', err);
        setError('Failed to load gallery images');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [personId]);

  // Track changes
  useEffect(() => {
    const currentState = JSON.stringify(galleryImages.map(img => ({
      id: img.id,
      caption: img.caption,
      isNew: img.isNew,
      toDelete: img.toDelete
    })));
    
    setHasChanges(currentState !== initialImagesRef.current);
  }, [galleryImages]);

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

  const handleAddImage = () => {
    // Check if we've reached the 15 image limit
    const currentImageCount = galleryImages.filter(img => !img.toDelete).length;
    if (currentImageCount >= 15) {
      showErrorAlert('You can upload a maximum of 15 gallery images', 5000);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const currentImageCount = galleryImages.filter(img => !img.toDelete).length;
    const remainingSlots = 15 - currentImageCount;
    
    if (remainingSlots <= 0) {
      showErrorAlert('You have reached the maximum limit of 15 gallery images', 5000);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      showErrorAlert(`Only ${remainingSlots} images were selected due to the 15 image limit`, 5000);
    }

    filesToUpload.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: GalleryImage = {
          id: `new-${Date.now()}-${index}`,
          file,
          preview: reader.result as string,
          caption: '',
          isNew: true
        };
        
        setGalleryImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = (imageId: string) => {
    setGalleryImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, toDelete: true } : img
    ));
  };

  const handleCaptionChange = (imageId: string, caption: string) => {
    setGalleryImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, caption } : img
    ));
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      
      // Add new images
      const newImages = galleryImages.filter(img => img.isNew && !img.toDelete);
      newImages.forEach((img) => {
        if (img.file) {
          formData.append(`galleryImage_${img.id}`, img.file);
          formData.append(`galleryCaption_${img.id}`, img.caption);
        }
      });

      // Add images to delete
      const imagesToDelete = galleryImages.filter(img => img.toDelete && !img.isNew);
      imagesToDelete.forEach(img => {
        formData.append('deleteImages', img.personImage?.imageId || '');
      });

      // Add caption updates
      const captionUpdates = galleryImages.filter(img => 
        !img.isNew && !img.toDelete && img.caption !== img.originalCaption
      );
      captionUpdates.forEach(img => {
        formData.append(`updateCaption_${img.id}`, img.caption);
      });

      const response = await fetch(`/api/persons/${personId}/gallery`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save gallery images');
      }

      showSuccessAlert('Gallery images updated successfully!', 3000);
      setHasChanges(false);
      
      // Refresh the images
      const imageResponse = await fetch(`/api/persons/${personId}/images?type=gallery`);
      if (imageResponse.ok) {
        const personImages: (PersonImage & { image: ImageStorage })[] = await imageResponse.json();
        
        const refreshedImages: GalleryImage[] = personImages
          .filter(img => img.imageType === 'gallery')
          .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
          .map(img => ({
            id: img.image.id,
            caption: img.image.caption || '',
            originalCaption: img.image.caption || '',
            personImage: img,
            preview: `/api/images/${img.imageId}?t=${new Date().getTime()}`
          }));
          
        setGalleryImages(refreshedImages);
        // Store only the relevant fields for comparison
        initialImagesRef.current = JSON.stringify(refreshedImages.map(img => ({
          id: img.id,
          caption: img.caption,
          isNew: img.isNew,
          toDelete: img.toDelete
        })));
      }
    } catch (err) {
      console.error('Error saving gallery images:', err);
      setError('Failed to save gallery images');
      showErrorAlert('Failed to save gallery images', 5000);
    } finally {
      setIsSaving(false);
    }
  }, [personId, galleryImages]);

  // Register save function with parent
  useEffect(() => {
    onSaveRegistered?.(handleSave);
  }, [onSaveRegistered, handleSave]);

  const visibleImages = galleryImages.filter(img => !img.toDelete);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Gallery Images</h3>
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-md" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="relative">
              <CardContent className="p-4">
                <div className="aspect-square mb-3 bg-gray-200 animate-pulse rounded-md" />
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !hasChanges) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Gallery Images</h3>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gallery Images</h3>
          <p className="text-sm text-gray-500">
            {visibleImages.length} of 15 images (maximum)
          </p>
        </div>
        <div className="flex gap-4">
          <Button 
            type="button" 
            onClick={handleAddImage} 
            disabled={isSaving || visibleImages.length >= 15}
            title={visibleImages.length >= 15 ? "Maximum 15 images allowed" : "Add new image"}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Image
          </Button>
          {hasChanges && !hideButtons && (
            <Button onClick={handleSave} disabled={isSaving} variant="default">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageSelect}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleImages.map((image) => (
          <Card key={image.id} className="relative">
            <CardContent className="p-4">
              <div className="relative aspect-square mb-3">
                <Image
                  src={image.preview || `/api/images/${image.personImage?.imageId}?t=${new Date().getTime()}`}
                  alt={image.caption || 'Gallery image'}
                  fill
                  className="object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 hover:scale-110 text-white shadow-lg border-2 border-white transition-all duration-200"
                  onClick={() => handleDeleteImage(image.id)}
                  disabled={isSaving}
                  title="Delete this image"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
              <Input
                type="text"
                value={image.caption}
                onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                placeholder="Enter caption..."
                className="w-full"
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {visibleImages.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No gallery images yet. Click &quot;Add New Image&quot; to get started.</p>
          </CardContent>
        </Card>
      )}
      
      {hasChanges && !hideButtons && (
        <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
          You have unsaved changes. Please save before leaving this page.
        </div>
      )}
    </div>
  );
}