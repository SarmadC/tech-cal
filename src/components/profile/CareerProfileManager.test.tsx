import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

import CareerProfileManager from './CareerProfileManager';
import { filteredEventKeys } from '@/lib/queryKeys';

const mockCompleteOnboarding = vi.fn();
const mockRefreshAuthProfile = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockShowError = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
    user: { id: 'user-1' },
    refreshProfile: mockRefreshAuthProfile,
  }),
}));

vi.mock('@/hooks/useCareerProfile', () => ({
  useCareerProfile: () => ({
    careerProfile: null,
    hasCompletedOnboarding: false,
    isLoading: false,
    error: null,
    saveCareerProfile: vi.fn(),
    completeOnboarding: mockCompleteOnboarding,
    refreshProfile: vi.fn(),
    optionalSections: null,
    optionalSectionSnoozes: null,
    optionalSectionTimestamps: null,
    markOptionalSectionComplete: vi.fn(),
    snoozeOptionalSection: vi.fn(),
  }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showError: mockShowError }),
}));

vi.mock('@/hooks/useDeviceDetection', () => ({
  useIsMobile: () => false,
}));

vi.mock('./quick-edit', () => ({
  default: () => null,
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

vi.mock('@/services/analyticsService', () => ({
  AnalyticsService: {
    logProfilePromptEvent: vi.fn(),
  },
}));

describe('CareerProfileManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteOnboarding.mockResolvedValue(undefined);
    mockRefreshAuthProfile.mockResolvedValue(undefined);
    mockInvalidateQueries.mockResolvedValue(undefined);
  });

  it('refreshes auth profile and invalidates filtered event queries after completion', async () => {
    const { getByText } = render(<CareerProfileManager />);

    fireEvent.click(getByText('Complete Profile'));
    fireEvent.click(getByText('finish-onboarding'));

    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1));
    expect(mockRefreshAuthProfile).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: filteredEventKeys.all });
  });
});
