import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileEventEngagementSchema } from '@kurecal/domain';

import { PATCH } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  isEventTracked: vi.fn(),
  getFeatureLimits: vi.fn(),
  getSubscriptionByUserId: vi.fn(),
  getTrackedEvents: vi.fn(),
  setAttendanceStatus: vi.fn(),
  toggleBookmark: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/userEventService', () => ({
  UserEventService: {
    getTrackedEvents: (...args: unknown[]) => mocks.getTrackedEvents(...args),
    toggleBookmark: (...args: unknown[]) => mocks.toggleBookmark(...args),
    setAttendanceStatus: (...args: unknown[]) => mocks.setAttendanceStatus(...args),
    isEventTracked: (...args: unknown[]) => mocks.isEventTracked(...args),
  },
}));

vi.mock('@/lib/subscription', () => ({
  getFeatureLimits: (...args: unknown[]) => mocks.getFeatureLimits(...args),
  getSubscriptionByUserId: (...args: unknown[]) =>
    mocks.getSubscriptionByUserId(...args),
}));

describe('/api/mobile/events/[id]/engagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.toggleBookmark.mockResolvedValue({});
    mocks.setAttendanceStatus.mockResolvedValue({});
    mocks.getSubscriptionByUserId.mockResolvedValue(null);
    mocks.getFeatureLimits.mockReturnValue({
      bookmarkLimit: Infinity,
      historyDays: Infinity,
      maxRecommendations: Infinity,
    });
    mocks.getTrackedEvents.mockResolvedValue([]);
    mocks.isEventTracked.mockResolvedValue({
      isTracked: true,
      isBookmarked: false,
      status: 'attending',
    });
  });

  it('blocks free users from adding bookmarks over the server-side limit', async () => {
    mocks.getFeatureLimits.mockReturnValueOnce({
      bookmarkLimit: 5,
      historyDays: 30,
      maxRecommendations: 3,
    });
    mocks.getTrackedEvents.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, index) => ({
        eventId: `event-${index}`,
        isBookmarked: true,
      }))
    );

    const response = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/engagement', {
        method: 'PATCH',
        body: JSON.stringify({
          isBookmarked: true,
        }),
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain('free bookmark limit');
    expect(mocks.toggleBookmark).not.toHaveBeenCalled();
  });

  it('allows unlimited bookmark creation for paid tiers', async () => {
    mocks.getFeatureLimits.mockReturnValueOnce({
      bookmarkLimit: Infinity,
      historyDays: Infinity,
      maxRecommendations: Infinity,
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/engagement', {
        method: 'PATCH',
        body: JSON.stringify({
          isBookmarked: true,
        }),
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.getTrackedEvents).not.toHaveBeenCalled();
    expect(mocks.toggleBookmark).toHaveBeenCalledWith(
      'user-1',
      'event-1',
      true,
      {}
    );
  });

  it('updates bookmark and attendance state and returns the combined engagement contract', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/engagement', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBookmarked: true,
          status: 'attending',
        }),
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.toggleBookmark).toHaveBeenCalledWith(
      'user-1',
      'event-1',
      true,
      {}
    );
    expect(mocks.setAttendanceStatus).toHaveBeenCalledWith(
      'user-1',
      'event-1',
      'attending',
      undefined,
      {}
    );
    expect(mobileEventEngagementSchema.parse(payload.data).status).toBe(
      'attending'
    );
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/engagement', {
        method: 'PATCH',
      }),
      {
        params: Promise.resolve({ id: 'event-1' }),
      }
    );

    expect(response.status).toBe(401);
  });

  it('records and removes confirmed attendance through the existing endpoint', async () => {
    mocks.isEventTracked
      .mockResolvedValueOnce({
        isTracked: true,
        isBookmarked: true,
        status: 'attended',
      })
      .mockResolvedValueOnce({
        isTracked: true,
        isBookmarked: true,
        status: null,
      });

    const attendedResponse = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/engagement', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'attended' }),
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    );
    const clearedResponse = await PATCH(
      new Request('http://localhost/api/mobile/events/event-1/engagement', {
        method: 'PATCH',
        body: JSON.stringify({ status: null }),
      }),
      { params: Promise.resolve({ id: 'event-1' }) }
    );

    expect(mocks.setAttendanceStatus).toHaveBeenNthCalledWith(
      1,
      'user-1',
      'event-1',
      'attended',
      undefined,
      {}
    );
    expect(mocks.setAttendanceStatus).toHaveBeenNthCalledWith(
      2,
      'user-1',
      'event-1',
      null,
      undefined,
      {}
    );
    expect(
      mobileEventEngagementSchema.parse((await attendedResponse.json()).data).status
    ).toBe('attended');
    expect(
      mobileEventEngagementSchema.parse((await clearedResponse.json()).data).status
    ).toBeNull();
  });
});
