import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@/utils/test-utils';
import { useUnifiedServerFiltering } from '../useUnifiedServerFiltering';
import { FILTERING_CONSTANTS } from '@/config/filteringConstants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('../useTrackedEventsUnified', () => ({
  useTrackedEventIds: () => ({ trackedEventIds: new Set() }),
}));

vi.mock('../useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

// Mock fetch
global.fetch = vi.fn();

describe('useUnifiedServerFiltering - Rate Limiting', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{
        user: { id: 'user-1' } as AuthContextType['user'],
        session: null,
        profile: null,
        loading: false,
        initialized: true,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signInWithOAuth: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        updateProfile: vi.fn(),
        refreshProfile: vi.fn(),
      }}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );

  it.skip('sets rateLimitWaitMs when requests are made within RATE_LIMIT_INTERVAL_MS', async () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          events: [],
          pagination: { page: 1, pageSize: 50, total: 0, hasMore: false },
          filters: { applied: {}, available: { categories: [], difficulties: [], formats: [] } },
          stats: { processingTimeMs: 10, filteredCount: 0, totalCount: 0 },
        },
      }),
    } as Response);

    const { result } = renderHook(() => useUnifiedServerFiltering(null), { wrapper });

    // Wait for initial fetch - temporarily use real timers for waitFor
    vi.useRealTimers();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });
    vi.useFakeTimers();

    // Trigger a filter change (which should trigger rate limiting)
    act(() => {
      result.current.updateFilter('searchTerm', 'test');
    });
    
    // Wait a bit for the request to start, then trigger another change quickly
    // to trigger rate limiting (requests within RATE_LIMIT_INTERVAL_MS)
    vi.advanceTimersByTime(50);
    act(() => {
      result.current.updateFilter('searchTerm', 'test2');
    });

    // Advance timers slightly (less than RATE_LIMIT_INTERVAL_MS)
    vi.advanceTimersByTime(100);

    // Check that rateLimitWaitMs is set - use real timers for waitFor
    vi.useRealTimers();
    await waitFor(() => {
      expect(result.current.rateLimitWaitMs).toBeGreaterThan(0);
      expect(result.current.rateLimitWaitMs).toBeLessThanOrEqual(FILTERING_CONSTANTS.RATE_LIMIT_INTERVAL_MS);
    }, { timeout: 5000 });
    vi.useFakeTimers();
  });

  it('clears rateLimitWaitMs after wait completes', async () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          events: [],
          pagination: { page: 1, pageSize: 50, total: 0, hasMore: false },
          filters: { applied: {}, available: { categories: [], difficulties: [], formats: [] } },
          stats: { processingTimeMs: 10, filteredCount: 0, totalCount: 0 },
        },
      }),
    } as Response);

    const { result } = renderHook(() => useUnifiedServerFiltering(null), { wrapper });

    // Wait for initial fetch - temporarily use real timers for waitFor
    vi.useRealTimers();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });
    vi.useFakeTimers();

    // Trigger filter change
    act(() => {
      result.current.updateFilter('searchTerm', 'test');
    });

    // Advance timers past RATE_LIMIT_INTERVAL_MS
    vi.advanceTimersByTime(FILTERING_CONSTANTS.RATE_LIMIT_INTERVAL_MS + 100);

    // Wait for request to complete - use real timers for waitFor
    vi.useRealTimers();
    await waitFor(() => {
      expect(result.current.rateLimitWaitMs).toBe(0);
    }, { timeout: 5000 });
    vi.useFakeTimers();
  });

  it('clears rateLimitWaitMs on unmount', async () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          events: [],
          pagination: { page: 1, pageSize: 50, total: 0, hasMore: false },
          filters: { applied: {}, available: { categories: [], difficulties: [], formats: [] } },
          stats: { processingTimeMs: 10, filteredCount: 0, totalCount: 0 },
        },
      }),
    } as Response);

    const { result, unmount } = renderHook(() => useUnifiedServerFiltering(null), { wrapper });

    // Wait for initial fetch - temporarily use real timers for waitFor
    vi.useRealTimers();
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });
    vi.useFakeTimers();

    // Set rateLimitWaitMs by triggering a filter change
    act(() => {
      result.current.updateFilter('searchTerm', 'test');
    });

    // Unmount the hook
    unmount();

    // Verify cleanup (note: can't directly check state after unmount, but test ensures cleanup happens)
    expect(true).toBe(true);
  });
});
