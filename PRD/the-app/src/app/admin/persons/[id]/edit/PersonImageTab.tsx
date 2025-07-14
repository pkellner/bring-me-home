'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Upload } from 'lucide-react';
import { PersonImage, ImageStorage } from '@prisma/client';

interface PersonImageTabProps {
  personId: string;
}

export function PersonImageTab({ personId }: PersonImageTabProps) {
  const [currentImage, setCurrentImage] = useState<(PersonImage & { image: ImageStorage }) | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectImageClick = () => {
    fileInputRef.current?.click();
  };

  const imageToShow = imagePreview || (currentImage ? `/api/images/${currentImage.imageId}?t=${new Date().getTime()}` : null);

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
  if (error) {
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
                disabled={!imageToShow}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Image
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleSelectImageClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Image
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}