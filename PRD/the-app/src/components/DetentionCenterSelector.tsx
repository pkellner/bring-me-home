'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchDetentionCenters } from '@/app/actions/detention-centers';
import Image from 'next/image';

interface DetentionCenter {
  id: string;
  name: string;
  city: string;
  state: string;
  facilityType: string;
  thumbnailImageId: string | null;
  _count: {
    detainees: number;
  };
}

interface DetentionCenterSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (detentionCenterId: string | null) => void;
  currentDetentionCenterId?: string | null;
}

const states = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
];

export default function DetentionCenterSelector({
  isOpen,
  onClose,
  onSelect,
  currentDetentionCenterId,
}: DetentionCenterSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [detentionCenters, setDetentionCenters] = useState<DetentionCenter[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(
    currentDetentionCenterId || null
  );

  const loadDetentionCenters = useCallback(async () => {
    setLoading(true);
    try {
      const centers = await searchDetentionCenters({
        query: searchQuery,
        state: selectedState || undefined,
        isActive: true,
      });
      setDetentionCenters(centers);
    } catch (error) {
      console.error('Failed to load detention centers:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedState]);

  useEffect(() => {
    if (isOpen) {
      loadDetentionCenters();
    }
  }, [isOpen, searchQuery, selectedState, loadDetentionCenters]);

  function handleSelect() {
    onSelect(selectedCenterId);
    onClose();
  }

  function handleUnassign() {
    onSelect(null);
    onClose();
  }

  // Group centers by state
  const centersByState = detentionCenters.reduce(
    (acc, center) => {
      if (!acc[center.state]) {
        acc[center.state] = [];
      }
      acc[center.state].push(center);
      return acc;
    },
    {} as Record<string, DetentionCenter[]>
  );

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
                <div>
                  <div className="flex items-center justify-between">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Select Detention Center
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-4">
                    {/* Search and Filter Controls */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label htmlFor="search" className="sr-only">
                          Search detention centers
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon
                              className="h-5 w-5 text-gray-400"
                              aria-hidden="true"
                            />
                          </div>
                          <input
                            id="search"
                            name="search"
                            className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Search by name, city, or address"
                            type="search"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="state-filter" className="sr-only">
                          Filter by state
                        </label>
                        <select
                          id="state-filter"
                          name="state-filter"
                          className="block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          value={selectedState}
                          onChange={e => setSelectedState(e.target.value)}
                        >
                          <option value="">All States</option>
                          {states.map(state => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Detention Centers List */}
                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      {loading ? (
                        <div className="p-4 text-center text-gray-500">
                          Loading...
                        </div>
                      ) : detentionCenters.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No detention centers found
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-200">
                          {Object.entries(centersByState).map(
                            ([state, centers]) => (
                              <div key={state}>
                                <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                                  {state} ({centers.length})
                                </div>
                                {centers.map(center => (
                                  <div
                                    key={center.id}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer ${
                                      selectedCenterId === center.id
                                        ? 'bg-indigo-50'
                                        : ''
                                    }`}
                                    onClick={() =>
                                      setSelectedCenterId(center.id)
                                    }
                                  >
                                    <div className="flex items-start space-x-3">
                                      <div className="flex-shrink-0">
                                        {center.thumbnailImageId ? (
                                          <Image
                                            src={`/api/images/${center.thumbnailImageId}`}
                                            alt={center.name}
                                            width={60}
                                            height={45}
                                            className="rounded object-cover"
                                          />
                                        ) : (
                                          <div className="w-[60px] h-[45px] bg-gray-200 rounded flex items-center justify-center">
                                            <span className="text-gray-400 text-xs">
                                              📍
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-grow">
                                        <div className="flex items-center">
                                          <input
                                            type="radio"
                                            name="detention-center"
                                            value={center.id}
                                            checked={
                                              selectedCenterId === center.id
                                            }
                                            onChange={() =>
                                              setSelectedCenterId(center.id)
                                            }
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                          />
                                          <label
                                            htmlFor={`center-${center.id}`}
                                            className="ml-3 block text-sm font-medium text-gray-900"
                                          >
                                            {center.name}
                                          </label>
                                        </div>
                                        <p className="ml-7 text-sm text-gray-600">
                                          {center.city}, {center.state}
                                        </p>
                                        <p className="ml-7 text-xs text-gray-500">
                                          {center.facilityType} •{' '}
                                          {center._count.detainees} detainee
                                          {center._count.detainees !== 1
                                            ? 's'
                                            : ''}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-3 sm:gap-3">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-3 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSelect}
                    disabled={!selectedCenterId}
                  >
                    Select
                  </button>
                  {currentDetentionCenterId && (
                    <button
                      type="button"
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-red-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:col-start-2 sm:mt-0 sm:text-sm"
                      onClick={handleUnassign}
                    >
                      Unassign
                    </button>
                  )}
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
