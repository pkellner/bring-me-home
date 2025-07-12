'use client';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string[];
  type: 'success' | 'error';
}

export default function AlertDialog({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  details, 
  type 
}: AlertDialogProps) {
  if (!isOpen) return null;

  const bgColor = type === 'success' ? 'bg-green-100' : 'bg-red-100';
  const borderColor = type === 'success' ? 'border-green-500' : 'border-red-500';
  const titleColor = type === 'success' ? 'text-green-900' : 'text-red-900';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const buttonColor = type === 'success' 
    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
  const iconPath = type === 'success' 
    ? 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
    : 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />
        
        <div className={`relative transform overflow-hidden rounded-lg ${bgColor} text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border-2 ${borderColor}`}>
          <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${type === 'success' ? 'bg-green-200' : 'bg-red-200'} sm:mx-0 sm:h-10 sm:w-10`}>
                <svg className={`h-6 w-6 ${type === 'success' ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d={iconPath} clipRule="evenodd" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                <h3 className={`text-lg font-medium leading-6 ${titleColor}`}>
                  {title}
                </h3>
                <div className="mt-2">
                  <p className={`text-sm ${textColor}`}>
                    {message}
                  </p>
                  {details && details.length > 0 && (
                    <div className="mt-3">
                      <p className={`text-sm font-medium ${textColor}`}>Details:</p>
                      <ul className={`mt-1 list-disc list-inside text-sm ${textColor} space-y-1`}>
                        {details.map((detail, index) => (
                          <li key={index}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto ${buttonColor}`}
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}