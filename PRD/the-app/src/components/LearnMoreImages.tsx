'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface ImageData {
  filename: string;
  alt: string;
  caption: string;
}

export default function LearnMoreImages() {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [cdnUrl, setCdnUrl] = useState<string | undefined>();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') || false;

  useEffect(() => {
    // Get CDN URL from environment
    setCdnUrl(process.env.NEXT_PUBLIC_CLOUDFRONT_CDN_URL);
  }, []);

  const images: ImageData[] = [
    {
      filename: '2025-07-19_06-01-06.png',
      alt: 'Family Admin Dashboard showing person-admin role and quick access to comments',
      caption: 'Family Admin Dashboard - Your central hub for managing support'
    },
    {
      filename: '2025-07-19_06-01-35.png',
      alt: 'Comment management interface showing list of pending and approved comments',
      caption: 'Review and approve community messages with full transparency'
    },
    {
      filename: '2025-07-19_06-04-36.png',
      alt: 'Comment moderation modal showing detailed commenter information and privacy controls',
      caption: 'Complete control over comment visibility and privacy settings'
    },
    {
      filename: '2025-07-19_06-06-07.png',
      alt: 'Public view showing community support map and messages',
      caption: 'Visual representation of nationwide community support'
    }
  ];

  const getImageUrl = (filename: string, options?: { width?: number; height?: number; quality?: number }) => {
    const baseUrl = `/api/images/learn-more/${filename}`;
    const params = new URLSearchParams();
    if (options?.width) params.append('w', options.width.toString());
    if (options?.height) params.append('h', options.height.toString());
    if (options?.quality) params.append('q', options.quality.toString());
    
    const apiUrl = `${baseUrl}${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Use CDN URL if available and not in admin
    if (cdnUrl && !isAdminRoute) {
      return `${cdnUrl}${apiUrl}`;
    }
    
    return apiUrl;
  };

  return (
    <>
      {/* Family Admin Dashboard */}
      <div className="mb-16">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="lg:w-1/2">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">Family Admin Dashboard</h4>
            <p className="text-gray-700 mb-4">
              Each family receives a personalized admin dashboard that serves as their command center. Here, families can see at a glance how many people have expressed support for their loved one and quickly access all pending comments that need review. The dashboard is designed to be intuitive and easy to navigate, even for those who aren&apos;t tech-savvy.
            </p>
            <p className="text-gray-700">
              The dashboard shows your role as &quot;person-admin&quot; which gives you full control over your loved one&apos;s profile, including the ability to approve or reject comments, update information, and communicate privately with supporters.
            </p>
          </div>
          <div className="lg:w-1/2">
            <div 
              className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 cursor-pointer"
              onClick={() => setSelectedImage(images[0])}
            >
              <img 
                src={getImageUrl(images[0].filename, { width: 800, quality: 85 })}
                alt={images[0].alt}
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center italic">
              {images[0].caption}
            </p>
          </div>
        </div>
      </div>

      {/* Comment Management */}
      <div className="mb-16">
        <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
          <div className="lg:w-1/2">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">Managing Community Comments</h4>
            <p className="text-gray-700 mb-4">
              The comments management interface gives families complete oversight of all messages left by supporters. You can view all comments in one organized list, see who left each message, and quickly identify which ones are awaiting your approval. Comments marked &quot;Wants to help&quot; indicate supporters who are willing to provide letters of support or other assistance.
            </p>
            <p className="text-gray-700">
              This system ensures that only appropriate, supportive messages appear publicly on your loved one&apos;s profile. You maintain full control over what the community sees, protecting your family&apos;s privacy while building a network of support.
            </p>
          </div>
          <div className="lg:w-1/2">
            <div 
              className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 cursor-pointer"
              onClick={() => setSelectedImage(images[1])}
            >
              <img 
                src={getImageUrl(images[1].filename, { width: 800, quality: 85 })}
                alt={images[1].alt}
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center italic">
              {images[1].caption}
            </p>
          </div>
        </div>
      </div>

      {/* Comment Moderation Modal */}
      <div className="mb-16">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="lg:w-1/2">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">Detailed Comment Moderation</h4>
            <p className="text-gray-700 mb-4">
              When reviewing individual comments, families access a comprehensive moderation interface. Here you can see complete commenter information, read their full message, and control exactly what information is displayed publicly. The yellow-highlighted &quot;Requires family approval&quot; indicator shows that you have the final say on what appears on the profile.
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Private Notes Feature:</strong> One of the most powerful features is the ability for supporters to send private notes directly to the family. These messages never appear publicly but provide a channel for more personal communications, legal support offers, or sensitive information that families need to see.
            </p>
            <p className="text-gray-700">
              The moderation panel also allows you to control privacy settings, add internal notes for your records, and make informed decisions about each message with full context.
            </p>
          </div>
          <div className="lg:w-1/2">
            <div 
              className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 cursor-pointer"
              onClick={() => setSelectedImage(images[2])}
            >
              <img 
                src={getImageUrl(images[2].filename, { width: 800, quality: 85 })}
                alt={images[2].alt}
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center italic">
              {images[2].caption}
            </p>
          </div>
        </div>
      </div>

      {/* Public View */}
      <div className="mb-16">
        <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
          <div className="lg:w-1/2">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">Building Community Support</h4>
            <p className="text-gray-700 mb-4">
              Once approved, messages of support appear on your loved one&apos;s public profile, creating a powerful visual representation of community backing. The support map shows geographic distribution of supporters, while the comment section displays heartfelt messages from community members.
            </p>
            <p className="text-gray-700 mb-4">
              This public display serves multiple purposes: it boosts morale for detained individuals who can see community support, it demonstrates to legal authorities the strong community ties, and it encourages more people to add their voices to the chorus of support.
            </p>
            <p className="text-gray-700">
              The platform tracks both public messages and anonymous support, giving you a complete picture of how many people stand with your family during this difficult time.
            </p>
          </div>
          <div className="lg:w-1/2">
            <div 
              className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200 cursor-pointer"
              onClick={() => setSelectedImage(images[3])}
            >
              <img 
                src={getImageUrl(images[3].filename, { width: 800, quality: 85 })}
                alt={images[3].alt}
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-3 text-center italic">
              {images[3].caption}
            </p>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={e => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image container - 70% of viewport */}
            <div className="relative max-w-[70vw] max-h-[70vh] flex items-center justify-center">
              <img
                src={getImageUrl(selectedImage.filename, { width: 1200, height: 800, quality: 90 })}
                alt={selectedImage.alt}
                className="max-w-full max-h-full object-contain"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '70vw', maxHeight: '70vh' }}
              />
            </div>

            {/* Caption below image */}
            {selectedImage.caption && (
              <div className="mt-4 max-w-[70vw] text-center">
                <p className="text-white text-lg">
                  {selectedImage.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}