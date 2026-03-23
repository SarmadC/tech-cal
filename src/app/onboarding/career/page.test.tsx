import type { ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

import CareerOnboardingPage from './page';
import { filteredEventKeys } from '@/lib/queryKeys';

const mockCompleteOnboarding = vi.fn();
const mockRefreshAuthProfile = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockRouterPush = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockShowInfo = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
    }),
  };
});

vi.mock('@/contexts', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', user_metadata: {} },
    profile: {
      id: 'user-1',
      fullName: 'Test User',
      avatarUrl: null,
      timezone: 'America/Edmonton',
      preferences: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    refreshProfile: mockRefreshAuthProfile,
  }),
}));

vi.mock('@/hooks/useCareerProfile', () => ({
  useCareerProfile: () => ({
    hasCompletedOnboarding: false,
    isLoading: false,
    completeOnboarding: mockCompleteOnboarding,
  }),
}));

vi.mock('@/components/providers/SupabaseProvider', () => ({
  useSupabaseSafe: () => ({
    supabase: {},
    isReady: true,
  }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
  useSnackbar: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: mockShowInfo,
  }),
}));

vi.mock('@/hooks/useDeviceDetection', () => ({
  useIsMobile: () => false,
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

vi.mock('@/components/onboarding/CareerOnboarding', () => ({
  default: ({ onComplete }: { onComplete: (data: unknown) => Promise<void> }) => (
    <button onClick={() => void onComplete({})}>finish-onboarding</button>
  ),
}));

vi.mock('@/components/onboarding/mobile/MobileCareerOnboarding', () => ({
  MobileCareerOnboarding: ({ onComplete }: { onComplete: (data: unknown) => Promise<void> }) => (
    <button onClick={() => void onComplete({})}>finish-onboarding-mobile</button>
  ),
}));

vi.mock('@/components/onboarding/OnboardingErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children }: { children: ReactNode }) => children,
  },
}));

describe('CareerOnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteOnboarding.mockResolvedValue(undefined);
    mockRefreshAuthProfile.mockResolvedValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it('refreshes auth profile and invalidates filtered event queries after completion', async () => {
    const { getByText } = render(<CareerOnboardingPage />);

    fireEvent.click(getByText('finish-onboarding'));

    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1));
    expect(mockRefreshAuthProfile).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: filteredEventKeys.all });
    expect(mockRouterPush).toHaveBeenCalledWith('/discover');
  });
});
