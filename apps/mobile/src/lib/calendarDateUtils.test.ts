import { describe, expect, it } from 'vitest';

import type { MobileCalendarFeed } from '@kurecal/domain';

import {
  groupCalendarEventsByDate,
  resolveCurrentMonthStartKey,
  resolveMonthStartKey,
  resolvePreferredSelectedDate,
  shiftMonthKey,
} from './calendarDateUtils';

function buildFeed(overrides: Partial<MobileCalendarFeed> = {}): MobileCalendarFeed {
  return {
    header: {
      eyebrow: 'Calendar',
      title: 'Plan your month',
      subtitle: 'Month-first planning',
    },
    month: {
      monthStart: '2026-05-01',
      monthEnd: '2026-05-31',
      label: 'May 2026',
    },
    today: '2026-05-12',
    metrics: {
      totalCount: 1,
      savedCount: 1,
      attendingCount: 1,
    },
    results: {
      returnedCount: 1,
      totalCount: 1,
    },
    filters: {
      tags: [],
      location: null,
      dateRange: {
        start: null,
        end: null,
      },
      cost: 'all',
      activeCount: 0,
    },
    availableFilters: {
      tags: [],
      eventTypes: [],
    },
    counts: {
      cost: {
        free: 1,
        paid: 0,
      },
      tags: {},
    },
    days: Array.from({ length: 42 }, (_, index) => ({
      dateKey:
        index < 31
          ? (`2026-05-${String(index + 1).padStart(2, '0')}` as const)
          : (`2026-06-${String(index - 30).padStart(2, '0')}` as const),
      dayNumber: index < 31 ? index + 1 : index - 30,
      inCurrentMonth: index < 31,
      isToday: index === 11,
      eventCount: index === 11 ? 1 : 0,
      savedCount: index === 11 ? 1 : 0,
      attendingCount: index === 11 ? 1 : 0,
    })),
    events: [
      {
        id: 'event-1',
        title: 'Calendar event',
        startTime: '2026-05-12T18:00:00.000Z',
        dateKey: '2026-05-12',
        engagement: {
          isBookmarked: true,
          status: 'attending',
        },
      },
    ],
    emptyState: {
      title: 'No events this month',
      description: 'Move to another month.',
      body: 'Move to another month.',
    },
    ...overrides,
  };
}

describe('calendar date helpers', () => {
  it('shifts month keys across year boundaries', () => {
    expect(shiftMonthKey('2026-01-01', -1)).toBe('2025-12-01');
    expect(shiftMonthKey('2026-12-01', 1)).toBe('2027-01-01');
  });

  it('groups agenda events by their calendar date', () => {
    const feed = buildFeed({
      events: [
        {
          id: 'event-1',
          title: 'Morning',
          startTime: '2026-05-12T09:00:00.000Z',
          dateKey: '2026-05-12',
        },
        {
          id: 'event-2',
          title: 'Evening',
          startTime: '2026-05-12T18:00:00.000Z',
          dateKey: '2026-05-12',
        },
      ],
    });
    const grouped = groupCalendarEventsByDate(feed.events);

    expect(grouped.get('2026-05-12')).toHaveLength(2);
    expect(grouped.get('2026-05-12')?.[0]?.title).toBe('Morning');
  });

  it('prefers the current selected day, then today, then the first event', () => {
    const feed = buildFeed();

    expect(resolvePreferredSelectedDate(feed, '2026-05-08')).toBe('2026-05-08');
    expect(resolvePreferredSelectedDate(feed, '2026-04-29')).toBe('2026-05-12');
    expect(
      resolvePreferredSelectedDate(
        buildFeed({
          today: '2026-04-28',
        }),
        null
      )
    ).toBe('2026-05-12');
  });

  it('resolves month starts consistently', () => {
    expect(resolveMonthStartKey('2026-05-18')).toBe('2026-05-01');
    expect(resolveCurrentMonthStartKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
