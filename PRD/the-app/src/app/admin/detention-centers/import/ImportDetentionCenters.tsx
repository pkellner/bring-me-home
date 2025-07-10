'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getDetentionCentersByState,
  importDetentionCenters,
} from '@/app/actions/scrape-detention-centers';

interface Facility {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  facilityType?: string;
  operatedBy?: string;
  phoneNumber?: string;
  imageUrl?: string;
  exists: boolean;
}

interface ImportDetentionCentersProps {
  availableStates: string[];
}

export default function ImportDetentionCenters({
  availableStates,
}: ImportDetentionCentersProps) {
  const router = useRouter();
  const [selectedState, setSelectedState] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: string[];
    failed: { name: string; error: string }[];
    skipped: string[];
  } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleStateChange(state: string) {
    setSelectedState(state);
    setSelectedFacilities(new Set());
    setImportResults(null);

    if (!state) {
      setFacilities([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getDetentionCentersByState(state);
      setFacilities(data);

      // Auto-select facilities that don't exist yet
      const newFacilities = data.filter(f => !f.exists).map(f => f.name);
      setSelectedFacilities(new Set(newFacilities));
    } catch (error) {
      console.error('Failed to load facilities:', error);
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleFacility(name: string) {
    const newSelected = new Set(selectedFacilities);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedFacilities(newSelected);
  }

  function toggleAll() {
    if (selectedFacilities.size === facilities.filter(f => !f.exists).length) {
      setSelectedFacilities(new Set());
    } else {
      const allNew = facilities.filter(f => !f.exists).map(f => f.name);
      setSelectedFacilities(new Set(allNew));
    }
  }

  async function handleImport() {
    if (selectedFacilities.size === 0) return;

    setImporting(true);
    setImportResults(null);

    try {
      const results = await importDetentionCenters(
        selectedState,
        Array.from(selectedFacilities)
      );
      setImportResults(results);

      // Show success message and redirect if successful
      if (results.success.length > 0) {
        setShowSuccess(true);
        setTimeout(() => {
          router.push('/admin/detention-centers');
        }, 2000);
      } else {
        // Refresh the facilities list if no success
        await handleStateChange(selectedState);
      }
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* State Selection */}
      <div className="max-w-md">
        <label
          htmlFor="state"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Select State
        </label>
        <div className="relative">
          <select
            id="state"
            value={selectedState}
            onChange={e => handleStateChange(e.target.value)}
            className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-3 pr-8 rounded-lg shadow-sm leading-tight focus:outline-none focus:shadow-outline focus:border-indigo-500 transition duration-150 ease-in-out"
          >
            <option value="">Choose a state...</option>
            {availableStates.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Import Successful!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Successfully imported {importResults?.success.length}{' '}
                  detention centers.
                </p>
                <p className="mt-1">Redirecting to detention centers list...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResults && !showSuccess && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Import Results
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                {importResults.success.length > 0 && (
                  <p>
                    ✅ Successfully imported: {importResults.success.length}{' '}
                    facilities
                  </p>
                )}
                {importResults.skipped.length > 0 && (
                  <p>
                    ⏭️ Skipped (already exist): {importResults.skipped.length}{' '}
                    facilities
                  </p>
                )}
                {importResults.failed.length > 0 && (
                  <div>
                    <p>❌ Failed: {importResults.failed.length} facilities</p>
                    <ul className="mt-1 ml-4 list-disc">
                      {importResults.failed.map((f, i) => (
                        <li key={i}>
                          {f.name}: {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facilities List */}
      {selectedState && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Available Facilities in {selectedState}
            </h3>
            {facilities.filter(f => !f.exists).length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {selectedFacilities.size ===
                facilities.filter(f => !f.exists).length
                  ? 'Deselect All'
                  : 'Select All New'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center">
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-indigo-600"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading facilities...
              </div>
            </div>
          ) : facilities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No facilities data available for this state
            </div>
          ) : (
            <div className="space-y-2">
              {facilities.map(facility => (
                <div
                  key={facility.name}
                  className={`border rounded-lg p-4 ${
                    facility.exists
                      ? 'bg-gray-50 border-gray-200'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedFacilities.has(facility.name)}
                        onChange={() => toggleFacility(facility.name)}
                        disabled={facility.exists}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </div>
                    <div className="ml-3 flex-grow">
                      <div className="flex justify-between">
                        <div>
                          <label
                            className={`font-medium ${
                              facility.exists
                                ? 'text-gray-500'
                                : 'text-gray-900'
                            }`}
                          >
                            {facility.name}
                            {facility.exists && (
                              <span className="ml-2 text-xs text-gray-500">
                                (Already imported)
                              </span>
                            )}
                          </label>
                          <p className="text-sm text-gray-600">
                            {facility.address}, {facility.city},{' '}
                            {facility.state} {facility.zipCode}
                          </p>
                          <div className="mt-1 text-xs text-gray-500 space-x-4">
                            {facility.facilityType && (
                              <span>Type: {facility.facilityType}</span>
                            )}
                            {facility.operatedBy && (
                              <span>Operated by: {facility.operatedBy}</span>
                            )}
                            {facility.phoneNumber && (
                              <span>Phone: {facility.phoneNumber}</span>
                            )}
                          </div>
                        </div>
                        {facility.imageUrl && (
                          <div className="ml-4 flex-shrink-0">
                            <span className="text-xs text-gray-500">
                              📷 Has image
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Import Button */}
          {selectedFacilities.size > 0 && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/admin/detention-centers')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Importing...
                  </>
                ) : (
                  `Import ${selectedFacilities.size} Facilit${
                    selectedFacilities.size === 1 ? 'y' : 'ies'
                  }`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
