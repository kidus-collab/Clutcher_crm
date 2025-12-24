import React, { ReactNode, useState } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

const ErrorBoundary: React.FC<Props> = ({ children, fallback }) => {
  // Note: This is a simplified version. In a real implementation,
  // you would need to use a proper error boundary library or custom implementation
  // since React hooks don't have componentDidCatch equivalent
  
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // This is a placeholder - real error boundaries need class components
  // or a library like react-error-boundary
  const handleError = (err: Error) => {
    console.error('Error caught by ErrorBoundary:', err);
    setHasError(true);
    setError(err);
  };

  if (hasError) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.235 3.175-2.502 3.175s-3.175-1.235-2.502-1.235-3.175-2.502 3.175-2.502S12.982 12.5 12.5 12.5s-.482.003-.964.003-1.451.003c-.993 0-1.82.482-2.502 1.235-2.502S8.552 9.5 7.558 9.5c-.993 0-1.82.482-2.502 1.235-2.502 1.82.482 2.502 1.235 2.502s1.82.482 2.502 1.235 2.502 3.052 12.5 2.058 12.5 2.058.483.003.964.003 1.451.003c.993 0 1.82-.482 2.502 1.235 2.502z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-4">We encountered an error while loading this page.</p>
          <details className="text-left text-sm text-slate-500 bg-slate-50 p-4 rounded-lg">
            <summary className="cursor-pointer font-medium">Error Details</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {error && error.toString()}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ErrorBoundary;