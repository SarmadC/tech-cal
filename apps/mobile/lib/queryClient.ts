import { QueryClient } from '@tanstack/react-query';

export const mobileQueryStaleTimes = {
  live: 30 * 1000,
  short: 60 * 1000,
  medium: 5 * 60 * 1000,
  long: 30 * 60 * 1000,
} as const;

function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 1) {
    return false;
  }

  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return !(
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not found') ||
    message.includes('invalid')
  );
}

export function createMobileQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: mobileQueryStaleTimes.long,
        staleTime: mobileQueryStaleTimes.short,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
