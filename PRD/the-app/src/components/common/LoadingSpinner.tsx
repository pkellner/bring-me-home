interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'medium',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        className={`inline-block animate-spin rounded-full border-b-2 border-indigo-600 ${sizeClasses[size]}`}
        role="status"
        aria-label={message}
      />
      {message && (
        <p className="mt-4 text-gray-600" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}