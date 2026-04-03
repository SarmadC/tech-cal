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
});
