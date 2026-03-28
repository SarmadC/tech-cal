import { useEffect, type PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerCustomerInfoSync } from '@/lib/revenuecat';
import { createMobileQueryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/providers/AuthProvider';
import { MobileThemeProvider } from '@/providers/ThemeProvider';

const queryClient = createMobileQueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    return registerCustomerInfoSync();
  }, []);

  return (
    <MobileThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </MobileThemeProvider>
  );
}
