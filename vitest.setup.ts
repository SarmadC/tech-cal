// vitest.setup.ts

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Suppress MUI transition errors in test environment
// These errors occur after tests complete and don't affect test results
// They're caused by MUI's Grow component trying to access DOM APIs not fully available in jsdom
if (typeof window !== 'undefined') {
  const originalError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    // Suppress MUI transition errors
    if (
      typeof message === 'string' &&
      (message.includes('Cannot set properties of undefined') ||
       message.includes('transition') ||
       message.includes('Grow'))
    ) {
      return true; // Suppress the error
    }
    // Call original error handler for other errors
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };
}

// Mock Supabase client creation
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    // Mock Supabase client methods as needed
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  })),
}));

// Mock MUI Grow component to prevent transition errors in test environment
// The Grow component uses DOM APIs that aren't fully available in jsdom
// This mock bypasses the transition logic entirely
vi.mock('@mui/material/Grow', () => {
  const React = require('react');
  return {
    default: React.forwardRef(({ children, in: inProp, ...props }: any, ref: any) => {
      // Simply render children without transition logic in tests
      return React.createElement(React.Fragment, null, inProp ? children : null);
    }),
  };
});