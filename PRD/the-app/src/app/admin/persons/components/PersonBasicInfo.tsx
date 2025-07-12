'use client';

import { Town } from '@prisma/client';

interface PersonBasicInfoProps {
  person?: {
    firstName?: string;
    lastName?: string;
    middleName?: string | null;
    townId?: string;
    dateOfBirth?: Date | null;
    lastKnownAddress?: string;
    isActive?: boolean;
  };
  towns: Town[];
  errors: Record<string, string[]>;
}

export default function PersonBasicInfo({ person, towns, errors }: PersonBasicInfoProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-medium text-gray-700"
          >
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
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-gray-700"
          >
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
          <label
            htmlFor="middleName"
            className="block text-sm font-medium text-gray-700"
          >
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
          <label
            htmlFor="townId"
            className="block text-sm font-medium text-gray-700"
          >
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
            {towns.map(town => (
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
          <label
            htmlFor="dateOfBirth"
            className="block text-sm font-medium text-gray-700"
          >
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
          <label
            htmlFor="lastKnownAddress"
            className="block text-sm font-medium text-gray-700"
          >
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
            <p className="mt-1 text-sm text-red-600">
              {errors.lastKnownAddress[0]}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          defaultChecked={person?.isActive ?? true}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label
          htmlFor="isActive"
          className="ml-2 block text-sm text-gray-900"
        >
          Active (visible to public)
        </label>
      </div>
    </>
  );
}