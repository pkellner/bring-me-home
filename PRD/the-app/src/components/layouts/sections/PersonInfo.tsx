'use client';

import Link from '@/components/OptimizedLink';
import Image from 'next/image';
import { formatDate } from '@/lib/utils';
import { SerializedPerson } from '../LayoutRenderer';
import { useImageUrl } from '@/hooks/useImageUrl';
import {
  getStatusDisplayInfo,
  shouldShowDetentionCenter,
  getStatusDateField,
  shouldShowSimpleStatusLine,
  formatDetentionInfo
} from '@/types/detention-status';

// Helper function to get detention center image ID
function getDetentionCenterImageId(person: SerializedPerson): string | null | undefined {
  if (!person.detentionCenter) return null;
  // Use the deprecated imageId field as it contains the correct image
  return person.detentionCenter.imageId;
}

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

      {/* Simple Status Line - shown for non-detained statuses */}
      {person.detentionStatus &&
       shouldShowSimpleStatusLine(person.detentionStatus) &&
       person.showDetentionInfo && (
        <div className="mt-2">
          {(() => {
            const statusInfo = getStatusDisplayInfo(person.detentionStatus);
            const statusDate = getStatusDateField(person.detentionStatus, person);
            const textColorClass = `text-${statusInfo.color}-700`;

            return (
              <div className="flex items-center gap-2">
                {statusInfo.icon && (
                  <span className="text-lg" aria-hidden="true">
                    {statusInfo.icon}
                  </span>
                )}
                <span className={`font-semibold ${textColorClass}`}>
                  {statusInfo.label}
                  {statusDate && (
                    <span className="font-normal text-theme-secondary ml-1">
                      ({formatDate(statusDate)})
                    </span>
                  )}
                </span>
                {statusInfo.isFinal && (
                  <span className="text-xs bg-gray-600 text-white px-2 py-0.5 rounded">
                    Final Status
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 mt-4">
        {person.detentionDate && person.showDetentionDate && (() => {
          const detentionInfo = formatDetentionInfo({
            detentionStatus: person.detentionStatus,
            detentionDate: person.detentionDate,
            detentionCenter: person.detentionCenter
          });

          if (!detentionInfo.label) return null;

          return (
            <div>
              <span className="font-semibold">{detentionInfo.label}:</span>{' '}
              {detentionInfo.text && (
                <>
                  {detentionInfo.text}{' '}
                  <span className="font-semibold">on</span>{' '}
                </>
              )}
              {formatDate(person.detentionDate)}
            </div>
          );
        })()}
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

      {/* Detailed Status Box */}
      {person.showDetentionInfo &&
       !shouldShowSimpleStatusLine(person.detentionStatus) && (
        <div className="mt-4">
          {(() => {
            const statusInfo = getStatusDisplayInfo(person.detentionStatus);
            const showDetentionInfo = shouldShowDetentionCenter(person.detentionStatus);

            return (
              <div className={`p-3 ${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg`}>
                {/* Status Header */}
                <div className="flex items-center gap-2 mb-3">
                  {statusInfo.icon && <span className="text-xl">{statusInfo.icon}</span>}
                  <h3 className={`text-sm font-bold text-${statusInfo.color}-800`}>
                    Current Status: {statusInfo.label}
                  </h3>
                  {statusInfo.isFinal && (
                    <span className="ml-auto text-xs bg-gray-600 text-white px-2 py-0.5 rounded">
                      Final Status
                    </span>
                  )}
                </div>

                {/* Status Details */}
                <div className="space-y-2 text-sm">
                  {/* Status-specific information */}
                  {person.detentionStatus === 'bail_posted' && person.bailPostedDate && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Bail Posted:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>
                        {formatDate(person.bailPostedDate)}
                        {person.bailPostedBy && ` by ${person.bailPostedBy}`}
                      </span>
                    </div>
                  )}

                  {person.detentionStatus === 'bail_posted' && person.bailConditions && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Bail Conditions:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>{person.bailConditions}</span>
                    </div>
                  )}

                  {(person.detentionStatus === 'awaiting_hearing' || person.detentionStatus === 'in_proceedings') && person.hearingDate && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Next Hearing:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>
                        {formatDate(person.hearingDate)}
                        {person.hearingLocation && ` at ${person.hearingLocation}`}
                      </span>
                    </div>
                  )}

                  {person.nextCourtDate && ['currently_detained', 'bail_posted', 'awaiting_hearing', 'in_proceedings'].includes(person.detentionStatus || '') && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Court Date:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>
                        {formatDate(person.nextCourtDate)}
                        {person.courtLocation && ` at ${person.courtLocation}`}
                      </span>
                    </div>
                  )}

                  {person.detentionStatus === 'deported' && person.deportationDate && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Deportation Date:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>
                        {formatDate(person.deportationDate)}
                        {person.deportationDestination && ` to ${person.deportationDestination}`}
                      </span>
                    </div>
                  )}

                  {person.detentionStatus === 'visa_granted' && person.visaGrantedDate && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Visa Granted:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>
                        {formatDate(person.visaGrantedDate)}
                        {person.visaGrantedType && ` (${person.visaGrantedType})`}
                      </span>
                    </div>
                  )}

                  {person.finalOutcome && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Final Outcome:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>
                        {person.finalOutcome}
                        {person.finalOutcomeDate && ` on ${formatDate(person.finalOutcomeDate)}`}
                      </span>
                    </div>
                  )}

                  {person.releaseDate && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Release Date:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>{formatDate(person.releaseDate)}</span>
                    </div>
                  )}

                  {person.bondAmount && ['currently_detained', 'awaiting_hearing'].includes(person.detentionStatus || '') && (
                    <div>
                      <span className={`font-semibold text-${statusInfo.color}-700`}>Bond Amount:</span>{' '}
                      <span className={`text-${statusInfo.color}-800`}>
                        ${person.bondAmount}
                        {person.bondStatus && ` (${person.bondStatus})`}
                      </span>
                    </div>
                  )}

                  {/* Detention Center Information (only shown for relevant statuses) */}
                  {showDetentionInfo && person.detentionCenter && (
                    <>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-grow">
                            <h4 className={`text-xs font-bold text-${statusInfo.color}-800 mb-1`}>
                              Detention Facility
                            </h4>
                            <div className="space-y-1 text-xs">
                              <div>
                                <span className={`font-semibold text-${statusInfo.color}-700`}>Facility:</span>{' '}
                                <span className={`text-${statusInfo.color}-800`}>
                                  {person.detentionCenter.name}
                                </span>
                              </div>
                              <div>
                                <span className={`font-semibold text-${statusInfo.color}-700`}>Location:</span>{' '}
                                <span className={`text-${statusInfo.color}-800`}>
                                  {person.detentionCenter.address}, {person.detentionCenter.city},{' '}
                                  {person.detentionCenter.state} {person.detentionCenter.zipCode}
                                </span>
                              </div>
                              {person.detentionCenter.phoneNumber && (
                                <div>
                                  <span className={`font-semibold text-${statusInfo.color}-700`}>Phone:</span>{' '}
                                  <span className={`text-${statusInfo.color}-800`}>
                                    {person.detentionCenter.phoneNumber}
                                  </span>
                                </div>
                              )}
                              {person.detentionDate && person.showDetentionDate && (
                                <div>
                                  <span className={`font-semibold text-${statusInfo.color}-700`}>
                                    Initial Detention:
                                  </span>{' '}
                                  <span className={`text-${statusInfo.color}-800`}>
                                    {formatDate(person.detentionDate)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {(() => {
                              const imageId = getDetentionCenterImageId(person);
                              if (imageId) {
                                return (
                                  <div className="relative w-[100px] h-[100px]">
                                    <Image
                                      src={generateUrl(imageId, { width: 200, height: 200, quality: 85 })}
                                      alt={person.detentionCenter?.name || 'Detention Center'}
                                      fill
                                      sizes="100px"
                                      className="rounded-lg object-cover shadow-sm"
                                      unoptimized
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div className="w-[100px] h-[100px] bg-gray-200 rounded-lg flex items-center justify-center">
                                  <span className="text-3xl text-theme-muted">🏢</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}