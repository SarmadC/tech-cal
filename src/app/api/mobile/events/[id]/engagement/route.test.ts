import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileEventEngagementSchema } from '@kurecal/domain';

import { PATCH } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  isEventTracked: vi.fn(),
  setAttendanceStatus: vi.fn(),
  toggleBookmark: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/userEventService', () => ({
  UserEventService: {
    toggleBookmark: (...args: unknown[]) => mocks.toggleBookmark(...args),
    setAttendanceStatus: (...args: unknown[]) => mocks.setAttendanceStatus(...args),
    isEventTracked: (...args: unknown[]) => mocks.isEventTracked(...args),
  },
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
    mocks.isEventTracked.mockResolvedValue({
      isTracked: true,
      isBookmarked: true,
      status: 'attending',
    });
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
