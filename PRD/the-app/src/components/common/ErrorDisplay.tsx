import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  retry?: () => void;
  className?: string;
}

export default function ErrorDisplay({ 
  error, 
  retry,
  className = ''
}: ErrorDisplayProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-600 text-center max-w-md mb-4">
        {error}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}