// src/utils/test-utils.tsx

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';
import { User } from '@supabase/supabase-js';

// Create a new QueryClient for each test run to ensure tests are isolated
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for tests
    },
  },
});

// A helper to create a mock user object
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides,
});

// The custom render function
const customRender = (
  ui: ReactElement,
  {
    mockUser = null, // Allow passing a mock user, defaults to logged out
    ...renderOptions
  }: RenderOptions & { mockUser?: User | null } = {}
) => {
  const testQueryClient = createTestQueryClient();
  const mockAuthContext: Partial<AuthContextType> = {
    user: mockUser,
    loading: false,
    initialized: true,
  };

  const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={testQueryClient}>
      <AuthContext.Provider value={mockAuthContext as AuthContextType}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderHook } from '@testing-library/react';
// Override the default render method with our custom one
export { customRender as render };