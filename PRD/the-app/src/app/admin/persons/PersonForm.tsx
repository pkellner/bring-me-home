'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Person, Town, DetentionCenter } from '@prisma/client';
import { createPerson, updatePerson } from '@/app/actions/persons';
import DetentionCenterSelector from '@/components/DetentionCenterSelector';

interface PersonFormProps {
  person?: Person & {
    town: Town;
    detentionCenter?: DetentionCenter | null;
  };
  towns: Town[];
}

export default function PersonForm({ person, towns }: PersonFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [detentionModalOpen, setDetentionModalOpen] = useState(false);
  const [selectedDetentionCenterId, setSelectedDetentionCenterId] = useState<string | null>(
    person?.detentionCenterId || null
  );
  const [selectedDetentionCenter, setSelectedDetentionCenter] = useState<DetentionCenter | null>(
    person?.detentionCenter || null
  );

  async function handleSubmit(formData: FormData) {
    // Add detention center ID to form data
    if (selectedDetentionCenterId) {
      formData.append('detentionCenterId', selectedDetentionCenterId);
    } else {
      formData.append('detentionCenterId', '');
    }

    const result = person
      ? await updatePerson(person.id, formData)
      : await createPerson(formData);

    if (result.errors) {
      setErrors(result.errors);
    } else if (result.success) {
      router.push('/admin/persons');
    }
  }

  async function handleDetentionCenterSelect(centerId: string | null) {
    setSelectedDetentionCenterId(centerId);
    
    if (centerId) {
      // Fetch the detention center details
      try {
        const response = await fetch(`/api/detention-centers/${centerId}`);
        if (response.ok) {
          const center = await response.json();
          setSelectedDetentionCenter(center);
        }
      } catch (error) {
        console.error('Failed to fetch detention center details:', error);
      }
    } else {
      setSelectedDetentionCenter(null);
    }
  }

  return (
    <>
      <form action={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              defaultValue={person?.firstName}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              defaultValue={person?.lastName}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
              Middle Name
            </label>
            <input
              type="text"
              id="middleName"
              name="middleName"
              defaultValue={person?.middleName || ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="townId" className="block text-sm font-medium text-gray-700">
              Town
            </label>
            <select
              id="townId"
              name="townId"
              required
              defaultValue={person?.townId}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a town</option>
              {towns.map((town) => (
                <option key={town.id} value={town.id}>
                  {town.name}, {town.state}
                </option>
              ))}
            </select>
            {errors.townId && (
              <p className="mt-1 text-sm text-red-600">{errors.townId[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              name="dateOfBirth"
              defaultValue={
                person?.dateOfBirth
                  ? new Date(person.dateOfBirth).toISOString().split('T')[0]
                  : ''
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lastKnownAddress" className="block text-sm font-medium text-gray-700">
              Last Known Address
            </label>
            <input
              type="text"
              id="lastKnownAddress"
              name="lastKnownAddress"
              required
              defaultValue={person?.lastKnownAddress}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.lastKnownAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.lastKnownAddress[0]}</p>
            )}
          </div>
        </div>

        {/* Detention Center Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detention Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detention Center
              </label>
              {selectedDetentionCenter ? (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start space-x-4">
                    {selectedDetentionCenter.thumbnailImageId && (
                      <Image
                        src={`/api/images/${selectedDetentionCenter.thumbnailImageId}`}
                        alt={selectedDetentionCenter.name}
                        width={80}
                        height={60}
                        className="rounded object-cover"
                      />
                    )}
                    <div className="flex-grow">
                      <h4 className="font-medium text-gray-900">{selectedDetentionCenter.name}</h4>
                      <p className="text-sm text-gray-600">
                        {selectedDetentionCenter.city}, {selectedDetentionCenter.state}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDetentionModalOpen(true)}
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
                  onClick={() => setDetentionModalOpen(true)}
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
                    <label htmlFor="detentionDate" className="block text-sm font-medium text-gray-700">
                      Detention Date
                    </label>
                    <input
                      type="date"
                      id="detentionDate"
                      name="detentionDate"
                      defaultValue={
                        person?.detentionDate
                          ? new Date(person.detentionDate).toISOString().split('T')[0]
                          : ''
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="detentionStatus" className="block text-sm font-medium text-gray-700">
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
                    <label htmlFor="caseNumber" className="block text-sm font-medium text-gray-700">
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
                    <label htmlFor="bondAmount" className="block text-sm font-medium text-gray-700">
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
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="story" className="block text-sm font-medium text-gray-700">
            Story
          </label>
          <textarea
            id="story"
            name="story"
            rows={6}
            defaultValue={person?.story || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="primaryPicture" className="block text-sm font-medium text-gray-700">
            Primary Picture
          </label>
          {person?.primaryPicture && (
            <div className="mt-2 mb-4">
              <Image
                src={person.primaryPicture}
                alt={`${person.firstName} ${person.lastName}`}
                width={200}
                height={200}
                className="rounded-lg object-cover"
              />
              <p className="text-sm text-gray-500 mt-1">Current image</p>
            </div>
          )}
          <input
            type="file"
            id="primaryPicture"
            name="primaryPicture"
            accept="image/*"
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-medium
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            Upload a new image to replace the current one
          </p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            defaultChecked={person?.isActive ?? true}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
            Active (visible to public)
          </label>
        </div>

        {errors._form && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{errors._form[0]}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Link
            href="/admin/persons"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            {person ? 'Update' : 'Create'} Person
          </button>
        </div>
      </form>

      <DetentionCenterSelector
        isOpen={detentionModalOpen}
        onClose={() => setDetentionModalOpen(false)}
        onSelect={handleDetentionCenterSelect}
        currentDetentionCenterId={selectedDetentionCenterId}
      />
    </>
  );
}