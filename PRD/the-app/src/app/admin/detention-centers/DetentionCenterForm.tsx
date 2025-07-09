'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DetentionCenter } from '@prisma/client';
import { createDetentionCenter, updateDetentionCenter } from '@/app/actions/detention-centers';
import Image from 'next/image';

interface DetentionCenterFormProps {
  detentionCenter?: DetentionCenter;
}

const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const facilityTypes = [
  'ICE Processing Center',
  'Contract Detention Facility',
  'County Jail',
  'Private Prison',
  'Federal Detention Center',
  'Other'
];

export default function DetentionCenterForm({ detentionCenter }: DetentionCenterFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = detentionCenter
      ? await updateDetentionCenter(detentionCenter.id, formData)
      : await createDetentionCenter(formData);

    if (result.errors) {
      setErrors(result.errors);
    } else if (result.success) {
      router.push('/admin/detention-centers');
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8 divide-y divide-gray-200">
      <div className="space-y-8 divide-y divide-gray-200">
        <div>
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Basic Information
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              General information about the detention center.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Facility Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                defaultValue={detentionCenter?.name}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="facilityType" className="block text-sm font-medium text-gray-700">
                Facility Type
              </label>
              <select
                name="facilityType"
                id="facilityType"
                defaultValue={detentionCenter?.facilityType || ''}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select a type</option>
                {facilityTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.facilityType && (
                <p className="mt-1 text-sm text-red-600">{errors.facilityType[0]}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="operatedBy" className="block text-sm font-medium text-gray-700">
                Operated By
              </label>
              <input
                type="text"
                name="operatedBy"
                id="operatedBy"
                defaultValue={detentionCenter?.operatedBy || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., GEO Group, CoreCivic"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="facilityImage" className="block text-sm font-medium text-gray-700">
                Facility Image
              </label>
              <div className="mt-1">
                {/* Show current image status */}
                {detentionCenter && (
                  <div className="mb-3 text-sm text-gray-600">
                    {detentionCenter.facilityImageId ? (
                      <p>✓ Image uploaded</p>
                    ) : (
                      <p>📷 No image available</p>
                    )}
                  </div>
                )}
                
                <div className="flex items-center space-x-4">
                  {(imagePreview || detentionCenter?.facilityImageId) && (
                    <div className="relative w-32 h-24">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Facility preview"
                          fill
                          className="rounded object-cover"
                        />
                      ) : detentionCenter?.facilityImageId ? (
                        <Image
                          src={`/api/images/${detentionCenter.facilityImageId}`}
                          alt="Facility preview"
                          fill
                          className="rounded object-cover"
                        />
                      ) : null}
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      name="facilityImage"
                      id="facilityImage"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100"
                    />
                  </div>
                </div>
              </div>
              {errors.facilityImage && (
                <p className="mt-1 text-sm text-red-600">{errors.facilityImage[0]}</p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Location Information
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Address and location details.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <input
                type="text"
                name="address"
                id="address"
                defaultValue={detentionCenter?.address}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address[0]}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                name="city"
                id="city"
                defaultValue={detentionCenter?.city}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city[0]}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <select
                name="state"
                id="state"
                defaultValue={detentionCenter?.state || ''}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Select a state</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state[0]}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                ZIP Code
              </label>
              <input
                type="text"
                name="zipCode"
                id="zipCode"
                defaultValue={detentionCenter?.zipCode}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.zipCode && (
                <p className="mt-1 text-sm text-red-600">{errors.zipCode[0]}</p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                Latitude (optional)
              </label>
              <input
                type="number"
                name="latitude"
                id="latitude"
                defaultValue={detentionCenter?.latitude || ''}
                step="any"
                min="-90"
                max="90"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                Longitude (optional)
              </label>
              <input
                type="number"
                name="longitude"
                id="longitude"
                defaultValue={detentionCenter?.longitude || ''}
                step="any"
                min="-180"
                max="180"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Contact Information
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              How to reach the facility.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                id="phoneNumber"
                defaultValue={detentionCenter?.phoneNumber || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="faxNumber" className="block text-sm font-medium text-gray-700">
                Fax Number
              </label>
              <input
                type="tel"
                name="faxNumber"
                id="faxNumber"
                defaultValue={detentionCenter?.faxNumber || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="emailAddress" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="emailAddress"
                id="emailAddress"
                defaultValue={detentionCenter?.emailAddress || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                Website
              </label>
              <input
                type="url"
                name="website"
                id="website"
                defaultValue={detentionCenter?.website || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Facility Details
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Additional information about the facility.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                id="capacity"
                defaultValue={detentionCenter?.capacity || ''}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="currentPopulation" className="block text-sm font-medium text-gray-700">
                Current Population
              </label>
              <input
                type="number"
                name="currentPopulation"
                id="currentPopulation"
                defaultValue={detentionCenter?.currentPopulation || ''}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="visitingHours" className="block text-sm font-medium text-gray-700">
                Visiting Hours
              </label>
              <textarea
                name="visitingHours"
                id="visitingHours"
                rows={3}
                defaultValue={detentionCenter?.visitingHours || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="transportInfo" className="block text-sm font-medium text-gray-700">
                Transportation Information
              </label>
              <textarea
                name="transportInfo"
                id="transportInfo"
                rows={3}
                defaultValue={detentionCenter?.transportInfo || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={4}
                defaultValue={detentionCenter?.notes || ''}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="sm:col-span-6 space-y-4">
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    defaultChecked={detentionCenter?.isActive ?? true}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isActive" className="font-medium text-gray-700">
                    Active
                  </label>
                  <p className="text-gray-500">This facility is currently operational</p>
                </div>
              </div>

              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isICEFacility"
                    name="isICEFacility"
                    type="checkbox"
                    defaultChecked={detentionCenter?.isICEFacility ?? true}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isICEFacility" className="font-medium text-gray-700">
                    ICE Facility
                  </label>
                  <p className="text-gray-500">This is an ICE detention facility</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {errors._form && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{errors._form[0]}</p>
        </div>
      )}

      <div className="pt-5">
        <div className="flex justify-end space-x-3">
          <Link
            href="/admin/detention-centers"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {detentionCenter ? 'Update' : 'Create'} Detention Center
          </button>
        </div>
      </div>
    </form>
  );
}