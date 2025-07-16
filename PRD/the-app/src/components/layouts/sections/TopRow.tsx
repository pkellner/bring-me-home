'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { SerializedPerson } from '../LayoutRenderer';
import { useImageUrl } from '@/hooks/useImageUrl';

interface TopRowProps {
  person: SerializedPerson;
  isAdmin: boolean;
}

export default function TopRow({ person, isAdmin }: TopRowProps) {
  const profileImage = person.images?.find(img => img.imageType === 'primary');
  const { generateUrl } = useImageUrl();
  
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
                  {person.detentionCenter.imageId ? (
                    <Image
                      src={generateUrl(person.detentionCenter.imageId, { width: 300, height: 300, quality: 90 })}
                      alt={person.detentionCenter.name}
                      width={120}
                      height={120}
                      className="rounded-lg object-cover shadow-sm"
                    />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-4xl text-gray-400">🏢</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}