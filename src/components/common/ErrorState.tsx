// src/components/common/ErrorState.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { WarningCircle, ArrowClockwise, House, ArrowLeft } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  variant?: 'default' | 'minimal' | 'card';
  showRefresh?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles = {
  default: 'text-center py-12 px-6',
  minimal: 'text-center py-6 px-4',
  card: 'bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6 text-center'
};

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  onGoHome,
  onGoBack,
  variant = 'default',
  showRefresh = true,
  showHome = false,
  showBack = false,
  className,
  icon
}: ErrorStateProps) {
  const hasActions = onRetry || onGoHome || onGoBack;

  return (
    <div className={cn(variantStyles[variant], className)}>
      <div className="flex flex-col items-center space-y-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          {icon || (
            <WarningCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md">
            {message}
          </p>
        </div>

        {/* Actions */}
        {hasActions && (
          <div className="flex flex-wrap gap-3 justify-center">
            {onRetry && showRefresh && (
              <Button
                onClick={onRetry}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowClockwise className="w-4 h-4" />
                Try Again
              </Button>
            )}
            {onGoBack && showBack && (
              <Button
                onClick={onGoBack}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            )}
            {onGoHome && showHome && (
              <Button
                onClick={onGoHome}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <House className="w-4 h-4" />
                Go Home
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Convenience components for common error scenarios
export function LoadingError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <ErrorState
      title="Failed to load data"
      message="There was an error loading the data. Please try again."
      onRetry={onRetry}
      showRefresh={true}
      className={className}
    />
  );
}

export function NetworkError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <ErrorState
      title="Connection error"
      message="Please check your internet connection and try again."
      onRetry={onRetry}
      showRefresh={true}
      className={className}
    />
  );
}

export function NotFoundError({ onGoHome, className }: { onGoHome?: () => void; className?: string }) {
  return (
    <ErrorState
      title="Not found"
      message="The page or resource you're looking for doesn't exist."
      onGoHome={onGoHome}
      showHome={true}
      className={className}
    />
  );
}
