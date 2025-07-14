'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { PersonImage, ImageStorage } from '@prisma/client';

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
}

export function GalleryImagesTab({ personId }: GalleryImagesTabProps) {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        const response = await fetch(`/api/persons/${personId}/images`);
        
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
      } catch (err) {
        console.error('Error fetching gallery images:', err);
        setError('Failed to load gallery images');
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, [personId]);

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file, index) => {
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
  if (error) {
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
        <h3 className="text-lg font-semibold">Gallery Images</h3>
        <Button type="button" onClick={handleAddImage}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Image
        </Button>
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
                  className="absolute top-2 right-2"
                  onClick={() => handleDeleteImage(image.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                type="text"
                value={image.caption}
                onChange={(e) => handleCaptionChange(image.id, e.target.value)}
                placeholder="Enter caption..."
                className="w-full"
              />
              {image.isNew && (
                <input
                  type="hidden"
                  name={`galleryImage_${image.id}`}
                  value={image.file?.name || ''}
                />
              )}
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
    </div>
  );
}