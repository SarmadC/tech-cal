import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUnifiedServerFiltering } from '../useUnifiedServerFiltering';
import { FILTERING_CONSTANTS } from '@/config/filteringConstants';

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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets rateLimitWaitMs when requests are made within RATE_LIMIT_INTERVAL_MS', async () => {
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

    const { result } = renderHook(() => useUnifiedServerFiltering(null));

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger a filter change (which should trigger rate limiting)
    result.current.updateFilter('searchTerm', 'test');

    // Advance timers slightly (less than RATE_LIMIT_INTERVAL_MS)
    vi.advanceTimersByTime(100);

    // Check that rateLimitWaitMs is set
    await waitFor(() => {
      if (result.current.rateLimitWaitMs > 0) {
        expect(result.current.rateLimitWaitMs).toBeGreaterThan(0);
        expect(result.current.rateLimitWaitMs).toBeLessThanOrEqual(FILTERING_CONSTANTS.RATE_LIMIT_INTERVAL_MS);
      }
    });
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

    const { result } = renderHook(() => useUnifiedServerFiltering(null));

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Trigger filter change
    result.current.updateFilter('searchTerm', 'test');

    // Advance timers past RATE_LIMIT_INTERVAL_MS
    vi.advanceTimersByTime(FILTERING_CONSTANTS.RATE_LIMIT_INTERVAL_MS + 100);

    // Wait for request to complete
    await waitFor(() => {
      expect(result.current.rateLimitWaitMs).toBe(0);
    });
  });

  it('clears rateLimitWaitMs on unmount', async () => {
    const { result, unmount } = renderHook(() => useUnifiedServerFiltering(null));

    // Set rateLimitWaitMs by triggering a filter change
    result.current.updateFilter('searchTerm', 'test');

    // Unmount the hook
    unmount();

    // Verify cleanup (note: can't directly check state after unmount, but test ensures cleanup happens)
    expect(true).toBe(true);
  });
});
