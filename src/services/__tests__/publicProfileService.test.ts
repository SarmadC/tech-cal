import { describe, expect, it, vi } from 'vitest';
import { PublicProfileService } from '../publicProfileService';
import type { SupabaseClientType } from '@/types';

function createEventQuery(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (
      onFulfilled?: (result: { data: unknown[]; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve({ data, error: null }).then(onFulfilled, onRejected),
  };

  return query;
}

type RecentEventReader = {
  getRecentAttendingEvents: (input: {
    readClient: SupabaseClientType;
    userId: string;
    viewerId: string | null;
    isViewerOwner: boolean;
    canViewAttendance: boolean;
  }) => Promise<unknown[]>;
};

describe('PublicProfileService recent journey', () => {
  it('excludes a stale attended activity after attendance is removed', async () => {
    const stalePastEvent = {
      id: 'event-1',
      slug: 'data-saturday-chicago-2026',
      title: 'Data Saturday Chicago 2026',
      start_time: '2026-03-14T07:00:00.000Z',
      end_time: null,
      location: 'Palatine, USA',
      user_events: [{
        user_id: 'user-1',
        activity_type: 'attended',
        role: null,
        status: null,
      }],
    };
    const readClient = {
      from: vi.fn()
        .mockReturnValueOnce(createEventQuery([]))
        .mockReturnValueOnce(createEventQuery([stalePastEvent])),
    } as unknown as SupabaseClientType;

    const events = await (PublicProfileService as unknown as RecentEventReader).getRecentAttendingEvents({
      readClient,
      userId: 'user-1',
      viewerId: 'user-1',
      isViewerOwner: false,
      canViewAttendance: true,
    });

    expect(events).toEqual([]);
  });

  it('retains speaking activity independently of removed attendance', async () => {
    const speakingEvent = {
      id: 'event-2',
      slug: 'speaker-event',
      title: 'Speaker Event',
      start_time: '2026-03-14T07:00:00.000Z',
      end_time: null,
      location: null,
      user_events: [{
        user_id: 'user-1',
        activity_type: 'speaking',
        role: 'Speaker',
        status: null,
      }],
    };
    const readClient = {
      from: vi.fn()
        .mockReturnValueOnce(createEventQuery([]))
        .mockReturnValueOnce(createEventQuery([speakingEvent])),
    } as unknown as SupabaseClientType;

    const events = await (PublicProfileService as unknown as RecentEventReader).getRecentAttendingEvents({
      readClient,
      userId: 'user-1',
      viewerId: null,
      isViewerOwner: false,
      canViewAttendance: true,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'event-2', activityType: 'speaking' });
  });
});
