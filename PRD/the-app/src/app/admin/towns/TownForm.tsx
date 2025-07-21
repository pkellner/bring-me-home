'use client';

import Link from '@/components/OptimizedLink';
import { createTown, updateTown } from '@/app/actions/towns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SanitizedTown, SanitizedLayout, SanitizedTheme } from '@/types/sanitized';

interface TownFormProps {
  town?: SanitizedTown;
  layouts: SanitizedLayout[];
  themes: SanitizedTheme[];
}

export default function TownForm({ town, layouts, themes }: TownFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(formData: FormData) {
    const result = town
      ? await updateTown(town.id, formData)
      : await createTown(formData);

    if (result.errors) {
      setErrors(result.errors);
    } else if (result.success) {
      router.push('/admin/towns');
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Town Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={town?.name}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., San Francisco"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="state"
            className="block text-sm font-medium text-gray-700"
          >
            State
          </label>
          <input
            type="text"
            id="state"
            name="state"
            defaultValue={town?.state}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., California"
          />
        </div>

        <div>
          <label
            htmlFor="county"
            className="block text-sm font-medium text-gray-700"
          >
            County
          </label>
          <input
            type="text"
            id="county"
            name="county"
            defaultValue={town?.county || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., San Francisco County"
          />
        </div>

        <div>
          <label
            htmlFor="zipCode"
            className="block text-sm font-medium text-gray-700"
          >
            ZIP Code
          </label>
          <input
            type="text"
            id="zipCode"
            name="zipCode"
            defaultValue={town?.zipCode || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., 94102"
          />
        </div>

        <div>
          <label
            htmlFor="fullAddress"
            className="block text-sm font-medium text-gray-700"
          >
            Full Address
          </label>
          <input
            type="text"
            id="fullAddress"
            name="fullAddress"
            defaultValue={town?.fullAddress}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., San Francisco, CA 94102, USA"
          />
        </div>

        <div>
          <label
            htmlFor="latitude"
            className="block text-sm font-medium text-gray-700"
          >
            Latitude
          </label>
          <input
            type="number"
            id="latitude"
            name="latitude"
            defaultValue={town?.latitude || ''}
            step="any"
            min="-90"
            max="90"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., 37.7749"
          />
        </div>

        <div>
          <label
            htmlFor="longitude"
            className="block text-sm font-medium text-gray-700"
          >
            Longitude
          </label>
          <input
            type="number"
            id="longitude"
            name="longitude"
            defaultValue={town?.longitude || ''}
            step="any"
            min="-180"
            max="180"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., -122.4194"
          />
        </div>

        <div>
          <label
            htmlFor="defaultLayoutId"
            className="block text-sm font-medium text-gray-700"
          >
            Default Layout
          </label>
          <select
            id="defaultLayoutId"
            name="defaultLayoutId"
            defaultValue={town?.defaultLayoutId || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">None (use system default)</option>
            {layouts.map(layout => (
              <option key={layout.id} value={layout.id}>
                {layout.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="defaultThemeId"
            className="block text-sm font-medium text-gray-700"
          >
            Default Theme
          </label>
          <select
            id="defaultThemeId"
            name="defaultThemeId"
            defaultValue={town?.defaultThemeId || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">None (use system default)</option>
            {themes.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={town?.description || ''}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          placeholder="Describe the town and its significance"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          defaultChecked={town?.isActive ?? true}
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
          href="/admin/towns"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          {town ? 'Update' : 'Create'} Town
        </button>
      </div>
    </form>
  );
}
