'use client';

import { useState, useActionState, useEffect } from 'react';
import { uploadPersonImage } from '@/app/actions/upload';

interface ImageUploadProps {
  personId: string;
  personName: string;
}

interface UploadState {
  success?: boolean;
  error?: string;
  imageUrl?: string;
  errors?: {
    personId?: string[];
    caption?: string[];
    isPrimary?: string[];
  };
}

export default function ImageUpload({
  personId,
  personName,
}: ImageUploadProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState<UploadState, FormData>(
    uploadPersonImage,
    { success: false }
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowForm(false);
    const fileInput = document.getElementById(
      'file-upload'
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = (formData: FormData) => {
    formAction(formData);
  };

  // Check if upload was successful and handle it
  useEffect(() => {
    if (state.success && showForm) {
      resetForm();
      // Refresh the page to show the new image
      window.location.reload();
    }
  }, [state.success, showForm]);

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        <svg
          className="h-4 w-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add Photo
      </button>

      {showForm && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          onClick={() => setShowForm(false)}
        >
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />

            <div
              className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <form action={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Add Photo for {personName}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <input type="hidden" name="personId" value={personId} />

                  <div className="space-y-4">
                    {/* File Upload */}
                    <div>
                      <label
                        htmlFor="file-upload"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Select Image
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                        <div className="space-y-1 text-center">
                          {previewUrl ? (
                            <div className="mb-4">
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="mx-auto h-32 w-32 object-cover rounded-lg"
                              />
                            </div>
                          ) : (
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              <span>Upload a file</span>
                              <input
                                id="file-upload"
                                name="file"
                                type="file"
                                className="sr-only"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileSelect}
                                required
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, WebP up to 5MB
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Caption */}
                    <div>
                      <label
                        htmlFor="caption"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Caption (Optional)
                      </label>
                      <input
                        type="text"
                        id="caption"
                        name="caption"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Describe this photo..."
                      />
                      {state?.errors?.caption && (
                        <p className="mt-2 text-sm text-red-600">
                          {state.errors.caption[0]}
                        </p>
                      )}
                    </div>

                    {/* Set as Primary */}
                    <div className="flex items-center">
                      <input
                        id="isPrimary"
                        name="isPrimary"
                        type="checkbox"
                        value="true"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isPrimary"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Set as primary photo
                      </label>
                    </div>

                    {state?.error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <div className="text-sm text-red-700">
                          {state.error}
                        </div>
                      </div>
                    )}

                    {state?.success && (
                      <div className="rounded-md bg-green-50 p-4">
                        <div className="text-sm text-green-700">
                          Photo uploaded successfully!
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="submit"
                    disabled={isPending || !selectedFile}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isPending ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
