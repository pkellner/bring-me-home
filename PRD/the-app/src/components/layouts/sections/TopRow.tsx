'use client';

import Image from 'next/image';
import Link from '@/components/OptimizedLink';
import { formatDate } from '@/lib/utils';
import { SerializedPerson } from '../LayoutRenderer';
import { useImageUrl } from '@/hooks/useImageUrl';

// Helper function to get detention center image ID
function getDetentionCenterImageId(person: SerializedPerson): string | null | undefined {
  if (!person.detentionCenter) return null;
  return person.detentionCenter.detentionCenterImage?.imageId || person.detentionCenter.imageId;
}

interface TopRowProps {
  person: SerializedPerson;
  isAdmin: boolean;
}

export default function TopRow({ person, isAdmin }: TopRowProps) {
  const profileImage = person.images?.find(img => img.imageType === 'primary');
  const { generateUrl } = useImageUrl();
  
  const handleScrollToSupport = () => {
    const element = document.getElementById('comments');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  return (
    <div className="top-row-section w-full">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Primary Image - max 300px */}
        <div className="flex-shrink-0 mx-auto lg:mx-0">
          {profileImage ? (
            <div className="relative rounded-lg shadow-lg overflow-hidden w-full max-w-[300px] aspect-square">
              <Image
                src={profileImage.imageUrl || generateUrl(profileImage.id, { width: 600, height: 600, quality: 90 })}
                alt={`${person.firstName} ${person.lastName}`}
                fill
                className="object-cover"
                sizes="(max-width: 300px) 100vw, 300px"
                priority
              />
              {profileImage.caption && (
                <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-semibold">
                  {profileImage.caption}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg bg-gray-100 shadow-inner w-full max-w-[300px] aspect-square">
              <span className="text-xl text-theme-muted">No Photo Available</span>
            </div>
          )}
        </div>

        {/* Person Information */}
        <div className="flex-grow min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {person.firstName} {person.middleName ? `${person.middleName} ` : ''}
            {person.lastName}
            {isAdmin && (
              <Link
                href={`/admin/persons/${person.id}/edit`}
                className="ml-3 text-sm font-normal text-indigo-600 hover:text-indigo-500"
              >
                [Edit Person]
              </Link>
            )}
          </h1>
          <div className="text-base sm:text-lg text-theme-secondary mb-4">
            <span className="font-semibold">Home Town:</span> {person.town.name}, {person.town.state}
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm sm:text-base">
            {person.detentionDate && (
              <div>
                <span className="font-semibold">Detention Date:</span> {formatDate(person.detentionDate)}
              </div>
            )}
            {person.lastHeardFromDate && (
              <div>
                <span className="font-semibold">Last Heard From:</span> {formatDate(person.lastHeardFromDate)}
              </div>
            )}
            <div>
              <span className="font-semibold">Represented by Lawyer:</span> {person.representedByLawyer ? 'Yes' : 'No'}
            </div>
            {person.notesFromLastContact && (
              <div className="mt-2">
                <span className="font-semibold">Notes from Last Contact:</span>
                <p className="mt-1 text-theme-primary">{person.notesFromLastContact}</p>
              </div>
            )}
          </div>

          {person.detentionCenter && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-grow">
                  <h3 className="text-sm font-bold text-red-800 mb-2">Detention Information</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-semibold text-red-700">Detention Center:</span> 
                      <span className="text-red-800"> {person.detentionCenter.name}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-red-700">Location:</span> 
                      <span className="text-red-800"> {person.detentionCenter.city}, {person.detentionCenter.state}</span>
                    </div>
                    {person.bondAmount && (
                      <div>
                        <span className="font-semibold text-red-700">Bond Amount:</span> 
                        <span className="text-red-800"> ${person.bondAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {(() => {
                    const imageId = getDetentionCenterImageId(person);
                    
                    if (imageId) {
                      return (
                        <div className="relative w-[120px] h-[120px]">
                          <Image
                            src={generateUrl(imageId, { width: 300, height: 300, quality: 90 })}
                            alt={person.detentionCenter.name}
                            fill
                            sizes="120px"
                            className="rounded-lg object-cover shadow-sm"
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="w-[120px] h-[120px] bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-4xl text-gray-400">🏢</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Call to Action Section - Show Your Support */}
          <div className="mt-6">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <pattern id="hearts" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M20 25c-5-5-10-5-10-10 0-3 2-5 5-5 2 0 4 1 5 3 1-2 3-3 5-3 3 0 5 2 5 5 0 5-5 5-10 10z" fill="currentColor" opacity="0.3"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#hearts)" />
                </svg>
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-white text-xl font-bold mb-2">
                  Help Bring {person.firstName} Home
                </h3>
                <p className="text-white/90 text-sm mb-4">
                  Every message of support matters. Show {person.firstName} and their family that the community stands with them.
                </p>
                <button
                  onClick={handleScrollToSupport}
                  className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Show Your Support
                  </span>
                </button>
                <p className="text-white/70 text-xs mt-3">
                  Leave a message or show anonymous support below
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}