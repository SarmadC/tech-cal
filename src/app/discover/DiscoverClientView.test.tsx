import type { ReactNode } from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

import type { AppProfile } from '@/types';
import DiscoverClientView from './DiscoverClientView';

const mockUseUnifiedServerFiltering = vi.fn();
const mockUseAuth = vi.fn();
const mockUpdateFilter = vi.fn();

function createProfile(): AppProfile {
  return {
    id: 'user-1',
    fullName: 'Test User',
    avatarUrl: null,
    timezone: 'America/Edmonton',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    preferences: {
      careerProfile: {
        currentRole: 'Designer',
        primarySkills: ['Figma'],
        interests: ['UI/UX Design'],
        careerGoals: ['networking'],
      },
    },
  };
}

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => ({ capture: vi.fn() }),
}));

vi.mock('@/hooks/useUnifiedServerFiltering', () => ({
  useUnifiedServerFiltering: (...args: unknown[]) => mockUseUnifiedServerFiltering(...args),
}));

vi.mock('@/contexts', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/contexts/CalendarContext', () => ({
  CalendarProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/app-sidebar', () => ({
  default: () => null,
}));

vi.mock('@/components/common/MobileBottomNav', () => ({
  default: () => null,
}));

vi.mock('@/components/Loading', () => ({
  SmartLoader: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ui/LoadingStates', () => ({
  EventsLoadingSkeleton: () => null,
}));

vi.mock('@/components/calendar/desktop/discovery/DesktopDiscoveryView', () => ({
  default: () => null,
}));

vi.mock('@/utils/navigation', () => ({
  useNavigation: () => ({ toDate: vi.fn() }),
}));

vi.mock('@/contexts/SnackbarContext', () => ({
  useSnackbar: () => ({ showInfo: vi.fn() }),
}));

vi.mock('@/hooks/useDeviceDetection', () => ({
  useDeviceDetection: () => ({ isMobile: false, isReady: true }),
}));

describe('DiscoverClientView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    mockUseUnifiedServerFiltering.mockReturnValue({
      filteredEvents: [],
      isLoading: false,
      isBackgroundRefetch: false,
      error: null,
      isColdStart: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      totalCount: 0,
      counts: null,
      pagination: { page: 1, pageSize: 50, totalPages: 1, totalItems: 0, hasMore: false },
      filters: {
        searchTerm: '',
        categories: [],
        tags: [],
        locations: [],
        dateRange: { start: null, end: null },
        budget: 'all',
        format: 'all',
        cost: 'all',
        difficulty: 'all',
        availability: 'all',
        popularity: 'all',
        duration: 'all',
        myTracked: false,
        myNetwork: false,
        recommended: false,
        sortBy: 'popularity',
        sortDirection: 'asc',
        page: 1,
        pageSize: 50,
      },
      activeFilterCount: 0,
      updateFilter: mockUpdateFilter,
      resetFilters: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
      applyQuickFilter: vi.fn(),
      applyNearMe: vi.fn(),
      isFilterPanelOpen: false,
      setIsFilterPanelOpen: vi.fn(),
      rateLimitWaitMs: 0,
      isDetectingLocation: false,
    });
  });

  it('prefers the live auth profile over the server prop', () => {
    const authProfile = createProfile();
    mockUseAuth.mockReturnValue({ profile: authProfile });

    render(
      <DiscoverClientView
        initialCategories={[]}
        profile={null}
      />
    );

    expect(mockUseUnifiedServerFiltering).toHaveBeenCalled();
    expect(mockUseUnifiedServerFiltering.mock.calls[0][0]).toBe(authProfile);
  });

  it('updates sort when live profile changes and the current sort still matches the old default', async () => {
    let authProfile: AppProfile | null = null;
    mockUseAuth.mockImplementation(() => ({ profile: authProfile }));

    const { rerender } = render(
      <DiscoverClientView
        initialCategories={[]}
        profile={null}
      />
    );

    authProfile = createProfile();
    rerender(
      <DiscoverClientView
        initialCategories={[]}
        profile={null}
      />
    );

    await waitFor(() => {
      expect(mockUpdateFilter).toHaveBeenCalledWith('sortBy', 'career-impact');
      expect(mockUpdateFilter).toHaveBeenCalledWith('sortDirection', 'desc');
    });
  });
});
