'use client';

interface DashboardErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRefresh?: boolean;
}

export function DashboardErrorState({ 
  title = "Something went wrong",
  message = "There was an error loading this section. Please try again.",
  onRetry,
  showRefresh = true
}: DashboardErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-6">
      <div className="text-center">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
          {showRefresh && (
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Refresh Page
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
