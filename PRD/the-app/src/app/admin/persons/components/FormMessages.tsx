'use client';

interface FormMessagesProps {
  successMessage: string | null;
  errors: Record<string, string[]>;
}

export default function FormMessages({ successMessage, errors }: FormMessagesProps) {
  return (
    <>
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-lg bg-green-50 p-6 border-l-4 border-green-400 shadow-lg transform transition-all duration-300 ease-out animate-bounce">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-green-800">Success!</h3>
              <p className="text-sm text-green-700 mt-1">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {errors._form ? 'Update failed' : 'Please correct the following errors:'}
              </h3>
              {errors._form ? (
                <p className="mt-1 text-sm text-red-700">{errors._form[0]}</p>
              ) : (
                <ul className="mt-2 list-disc list-inside text-sm text-red-700">
                  {Object.entries(errors).map(([field, messages]) => (
                    <li key={field}>
                      {field}: {messages[0]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}