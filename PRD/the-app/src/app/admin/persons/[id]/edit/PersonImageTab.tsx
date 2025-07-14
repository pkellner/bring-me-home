'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Upload } from 'lucide-react';
import { PersonImage, ImageStorage } from '@prisma/client';
import { useTabs } from './TabsProvider';

interface PersonImageTabProps {
  currentImage?: PersonImage & { image: ImageStorage };
  onImageChange?: (image: File | null, shouldClear?: boolean) => void;
}

export function PersonImageTab({ currentImage, onImageChange }: PersonImageTabProps) {
  const { imageUpdateTrigger } = useTabs();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload image when trigger changes
  useEffect(() => {
    if (imageUpdateTrigger > 0) {
      // Force reload by adding timestamp to image URL
      setDisplayImage(currentImage ? { ...currentImage, updatedAt: new Date() } : undefined);
    }
  }, [imageUpdateTrigger, currentImage]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageChange?.(file);
      
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
    onImageChange?.(null, true); // Pass true to indicate we want to clear the image
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectImageClick = () => {
    fileInputRef.current?.click();
  };

  const imageToShow = imagePreview || (displayImage ? `/api/images/${displayImage.imageId}?t=${displayImage.updatedAt?.getTime()}` : null);

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