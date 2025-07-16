'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';
import { SerializedPerson } from '../LayoutRenderer';
import { useImageUrl } from '@/hooks/useImageUrl';

interface PersonInfoProps {
  person: SerializedPerson;
  isAdmin: boolean;
}

export default function PersonInfo({ person, isAdmin }: PersonInfoProps) {
  const { generateUrl } = useImageUrl();
  
  return (
    <div className="info-section space-y-4 text-theme-primary">
      <h1 className="text-3xl font-bold text-theme-primary">
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
      <div className="text-lg text-theme-secondary">
        <span className="font-semibold">Home Town:</span> {person.town.name},{' '}
        {person.town.state}
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4">
        {person.detentionDate && person.showDetentionDate && (
          <div>
            <span className="font-semibold">Detention Date:</span>{' '}
            {formatDate(person.detentionDate)}
          </div>
        )}
        {person.lastHeardFromDate && person.showLastHeardFrom && (
          <div>
            <span className="font-semibold">Last Heard From:</span>{' '}
            {formatDate(person.lastHeardFromDate)}
          </div>
        )}
        {person.notesFromLastContact && (
          <div className="mt-2">
            <span className="font-semibold">Notes from Last Contact:</span>
            <p className="mt-1 text-theme-primary">
              {person.notesFromLastContact}
            </p>
          </div>
        )}
        <div>
          <span className="font-semibold">Represented by Lawyer:</span>{' '}
          {person.representedByLawyer ? 'Yes' : 'No'}
        </div>
      </div>

      {person.detentionCenter && person.showDetentionInfo && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-grow">
              <h3 className="text-sm font-bold text-red-800 mb-2">
                Detention Information
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-semibold text-red-700">
                    Detention Center:
                  </span>{' '}
                  <span className="text-red-800">
                    {person.detentionCenter.name}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-red-700">Location:</span>{' '}
                  <span className="text-red-800">
                    {person.detentionCenter.address},{' '}
                    {person.detentionCenter.city},{' '}
                    {person.detentionCenter.state}{' '}
                    {person.detentionCenter.zipCode}
                  </span>
                </div>
                {person.detentionCenter.phoneNumber && (
                  <div>
                    <span className="font-semibold text-red-700">Phone:</span>{' '}
                    <span className="text-red-800">
                      {person.detentionCenter.phoneNumber}
                    </span>
                  </div>
                )}
                {person.detentionDate && person.showDetentionDate && (
                  <div>
                    <span className="font-semibold text-red-700">
                      Detained Since:
                    </span>{' '}
                    <span className="text-red-800">
                      {formatDate(person.detentionDate)}
                    </span>
                  </div>
                )}
              {person.bondAmount && (
                <div>
                  <span className="font-semibold text-red-700">
                    Bond Amount:
                  </span>{' '}
                  <span className="text-red-800">${person.bondAmount}</span>
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
                  <span className="text-4xl text-theme-muted">🏢</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}