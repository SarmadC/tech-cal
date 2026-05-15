import { describe, expect, it } from 'vitest';

import {
  resolveCalendarRenderState,
  resolveCalendarSheetState,
} from './calendarState';

const feed = {
  header: {
    eyebrow: 'Calendar',
    title: 'Plan your month',
  },
  month: {
    monthStart: '2026-04-01',
    monthEnd: '2026-04-30',
    label: 'April 2026',
  },
  today: '2026-04-10',
  metrics: {
    totalCount: 1,
    savedCount: 0,
    attendingCount: 0,
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
    dateKey: `2026-04-${String((index % 30) + 1).padStart(2, '0')}`,
    dayNumber: (index % 30) + 1,
    inCurrentMonth: true,
    isToday: index === 9,
    eventCount: 0,
    savedCount: 0,
    attendingCount: 0,
  })),
  events: [
    {
      id: 'event-1',
      title: 'Event 1',
      slug: 'event-1',
      startTime: '2026-04-10T18:00:00.000Z',
      dateKey: '2026-04-10',
    },
  ],
  emptyState: {
    title: 'No events this month',
    body: 'Try another month.',
  },
} as const;

describe('calendar state helpers', () => {
  it('disables apply and clears stale preview counts after preview errors', () => {
    expect(
      resolveCalendarSheetState({
        feed,
        previewFeed: null,
        previewError: 'Preview unavailable',
      })
    ).toMatchObject({
      activeSheetFeed: feed,
      disableApply: true,
      previewResultCount: null,
    });
  });

  it('keeps the agenda visible after a refresh error when data already exists', () => {
    expect(
      resolveCalendarRenderState({
        error: 'Refresh failed',
        feed,
        loading: false,
      })
    ).toEqual({
      inlineError: 'Refresh failed',
      showAgenda: true,
      showFatalError: false,
      showInitialLoading: false,
    });
  });
});
