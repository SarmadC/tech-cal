// src/components/providers/QueryProvider.tsx
'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default time data is considered fresh (e.g., 5 minutes)
            staleTime: 1000 * 60 * 5,
            // Avoids refetching immediately on mount if data is fresh
            refetchOnWindowFocus: false,
            // Prevent memory leaks by limiting cache time
            gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
            // Prevent excessive retries
            retry: (failureCount, error) => {
              // Don't retry on 4xx errors (client errors)
              if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
                if (error.status >= 400 && error.status < 500) {
                  return false;
                }
              }
              // Retry up to 2 times for other errors
              return failureCount < 2;
            },
            // Prevent stale data from being used too long
            refetchOnMount: true,
            // Clean up inactive queries
            refetchOnReconnect: 'always',
          },
          mutations: {
            // Limit mutation retries
            retry: 1,
          },
        },
      })
  );

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear all cached data when the provider unmounts
      queryClient.clear();
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}