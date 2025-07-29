'use client';

import Image from 'next/image';
import type { SanitizedDetentionCenter } from '@/types/sanitized';

interface PersonDetentionInfoProps {
  person?: {
    detentionDate?: Date | null;
    detentionStatus?: string | null;
    caseNumber?: string | null;
    bondAmount?: string | null;
    lastHeardFromDate?: Date | null;
    notesFromLastContact?: string | null;
    representedByLawyer?: boolean | null;
    representedByNotes?: string | null;
  };
  selectedDetentionCenter: SanitizedDetentionCenter | null;
  selectedDetentionCenterId: string | null;
  onOpenModal: () => void;
}

export default function PersonDetentionInfo({
  person,
  selectedDetentionCenter,
  selectedDetentionCenterId,
  onOpenModal,
}: PersonDetentionInfoProps) {
  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Detention Information
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detention Center
          </label>
          {selectedDetentionCenter ? (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start space-x-4">
                {selectedDetentionCenter.imageId && (
                  <Image
                    src={`/api/images/${selectedDetentionCenter.imageId}`}
                    alt={selectedDetentionCenter.name}
                    width={80}
                    height={60}
                    className="rounded object-cover"
                    unoptimized
                  />
                )}
                <div className="flex-grow">
                  <h4 className="font-medium text-gray-900">
                    {selectedDetentionCenter.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {selectedDetentionCenter.city},{' '}
                    {selectedDetentionCenter.state}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenModal}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Change detention center
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenModal}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Select detention center
            </button>
          )}
        </div>

        {selectedDetentionCenterId && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="detentionDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Detention Date
                </label>
                <input
                  type="date"
                  id="detentionDate"
                  name="detentionDate"
                  defaultValue={
                    person?.detentionDate
                      ? new Date(person.detentionDate)
                          .toISOString()
                          .split('T')[0]
                      : ''
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="detentionStatus"
                  className="block text-sm font-medium text-gray-700"
                >
                  Detention Status
                </label>
                <select
                  id="detentionStatus"
                  name="detentionStatus"
                  defaultValue={person?.detentionStatus || 'detained'}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="detained">Detained</option>
                  <option value="released">Released</option>
                  <option value="deported">Deported</option>
                  <option value="in-proceedings">In Proceedings</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="caseNumber"
                  className="block text-sm font-medium text-gray-700"
                >
                  Case Number
                </label>
                <input
                  type="text"
                  id="caseNumber"
                  name="caseNumber"
                  defaultValue={person?.caseNumber || ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="bondAmount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Bond Amount
                </label>
                <input
                  type="number"
                  id="bondAmount"
                  name="bondAmount"
                  defaultValue={person?.bondAmount?.toString() || ''}
                  step="0.01"
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="lastHeardFromDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last Heard From Date
                </label>
                <input
                  type="date"
                  id="lastHeardFromDate"
                  name="lastHeardFromDate"
                  defaultValue={
                    person?.lastHeardFromDate
                      ? new Date(person.lastHeardFromDate)
                          .toISOString()
                          .split('T')[0]
                      : ''
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="notesFromLastContact"
                className="block text-sm font-medium text-gray-700"
              >
                Notes from Last Contact
              </label>
              <textarea
                id="notesFromLastContact"
                name="notesFromLastContact"
                rows={3}
                defaultValue={person?.notesFromLastContact || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Any important information from the last contact with the detainee"
              />
            </div>

            <div className="sm:col-span-2 space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="representedByLawyer"
                  name="representedByLawyer"
                  defaultChecked={person?.representedByLawyer ?? false}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="representedByLawyer"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Represented by Lawyer
                </label>
              </div>

              <div>
                <label
                  htmlFor="representedByNotes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Legal Representation Notes
                </label>
                <textarea
                  id="representedByNotes"
                  name="representedByNotes"
                  rows={3}
                  defaultValue={person?.representedByNotes || ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Notes about legal representation (e.g., lawyer name, contact info, case status)"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}