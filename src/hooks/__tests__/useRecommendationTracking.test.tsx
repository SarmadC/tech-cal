import type { ReactNode } from 'react';
import { act, renderHook, waitFor, createMockUser } from '@/utils/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { useRecommendationTracking } from '../useRecommendationTracking';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  sendTelemetryEvent: vi.fn(),
  getAnalyticsConsent: vi.fn(),
  trackInteraction: vi.fn(),
  forceFlushUser: vi.fn(),
}));

vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    from: mocks.from,
  })),
}));

vi.mock('@/utils/telemetryClient', () => ({
  sendTelemetryEvent: mocks.sendTelemetryEvent,
}));

vi.mock('@/services/behavioralAnalyticsService', () => ({
  BehavioralAnalyticsService: {
    getAnalyticsConsent: mocks.getAnalyticsConsent,
    trackInteraction: mocks.trackInteraction,
    forceFlushUser: mocks.forceFlushUser,
  },
}));

describe('useRecommendationTracking', () => {
  const user = createMockUser({
    id: '00000000-0000-4000-8000-000000000001',
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={{
      user,
      loading: false,
      initialized: true,
    } as AuthContextType}>
      {children}
    </AuthContext.Provider>
  );

  const eventId = '11111111-1111-4111-8111-111111111111';
  const recommendationBatchId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.from.mockImplementation((table: string) => {
      if (table === 'recommendation_batches') {
        return {
          insert: mocks.insert,
        };
      }

      return {
        insert: vi.fn(),
        select: vi.fn(),
      };
    });

    mocks.insert.mockReturnValue({
      select: mocks.select,
    });

    mocks.select.mockReturnValue({
      single: mocks.single,
    });

    mocks.single.mockResolvedValue({
      data: { id: recommendationBatchId },
      error: null,
    });

    mocks.getAnalyticsConsent.mockResolvedValue(true);
    mocks.trackInteraction.mockResolvedValue(undefined);
  });

  it('persists recommendation display and links subsequent interactions to the batch', async () => {
    const { result } = renderHook(
      () => useRecommendationTracking({ enableTracking: true }),
      { wrapper }
    );

    await act(async () => {
      await result.current.trackRecommendationDisplay(
        'for_you',
        [{ eventId, score: 91.5, position: 1 }],
        'v2.0'
      );
    });

    await act(async () => {
      await result.current.trackClick(eventId, 'for_you', 1);
    });

    await waitFor(() => {
      expect(mocks.trackInteraction).toHaveBeenCalled();
    });

    const lastCall = mocks.trackInteraction.mock.calls[mocks.trackInteraction.mock.calls.length - 1];

    expect(lastCall[0]).toBe(user.id);
    expect(lastCall[1]).toBe('click');
    expect(lastCall[2]).toMatchObject({
      eventId,
      section: 'for_you',
      recommendationBatchId,
    });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it('dedupes rapid duplicate display tracking for the same section payload', async () => {
    const { result } = renderHook(
      () => useRecommendationTracking({ enableTracking: true }),
      { wrapper }
    );

    const payload = [{ eventId, score: 88.2, position: 1 }];

    await act(async () => {
      await result.current.trackRecommendationDisplay('trending', payload, 'v2.0');
      await result.current.trackRecommendationDisplay('trending', payload, 'v2.0');
    });

    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
});
