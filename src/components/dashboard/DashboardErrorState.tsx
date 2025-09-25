'use client';

import { ErrorState } from '@/components/common/ErrorState';

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
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
      showRefresh={showRefresh}
      variant="card"
      className="min-h-[200px]"
    />
  );
}
