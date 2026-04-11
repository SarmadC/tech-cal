import { describe, expect, it } from 'vitest';

import {
  buildDiscoverDateOptions,
  buildDiscoverDateRangeLabel,
  buildDiscoverRequest,
  countActiveDiscoverFilters,
  DEFAULT_DISCOVER_FILTERS,
  mergeDiscoverFeedPage,
  toggleDiscoverSelection,
} from './discoverState';

describe('discover state helpers', () => {
  it('builds discover requests with trimmed values and shared defaults', () => {
    expect(
      buildDiscoverRequest(
        'trending',
        ' Expo ',
        {
          ...DEFAULT_DISCOVER_FILTERS,
          tags: ['expo'],
          location: ' Calgary ',
          dateRange: {
            start: '2026-04-10',
            end: '2026-04-20',
          },
          cost: 'free',
        },
        2
      )
    ).toEqual({
      rankingMode: 'trending',
      searchTerm: 'Expo',
      categories: [],
      tags: ['expo'],
      location: 'Calgary',
      dateRange: {
        start: '2026-04-10',
        end: '2026-04-20',
      },
      format: 'all',
      cost: 'free',
      page: 2,
    });
  });

  it('counts active filters and builds readable labels', () => {
    expect(
      countActiveDiscoverFilters('expo', {
        ...DEFAULT_DISCOVER_FILTERS,
        tags: ['expo'],
        location: 'Edmonton',
        dateRange: {
          start: '2026-04-10',
          end: '2026-04-12',
        },
        cost: 'paid',
      })
    ).toBe(5);

    expect(
      buildDiscoverDateRangeLabel({
        start: '2026-04-10',
        end: '2026-04-12',
      })
    ).toBe('Apr 10, 2026 - Apr 12, 2026');
  });

  it('toggles selections and builds future date options', () => {
    expect(toggleDiscoverSelection(['expo', 'react'], 'expo')).toEqual([
      'react',
    ]);
    expect(toggleDiscoverSelection(['expo'], 'react')).toEqual([
      'expo',
      'react',
    ]);

    expect(
      buildDiscoverDateOptions(3, new Date('2026-04-10T12:00:00.000Z'))
    ).toEqual(['2026-04-10', '2026-04-11', '2026-04-12']);
  });

  it('preserves first-page chrome when appending more events', () => {
    const firstPage = {
      header: {
        eyebrow: 'Discover',
        title: 'Find your next event',
      },
      controls: {
        rankingModes: [
          {
            id: 'best-match',
            label: 'Best match',
            description: 'Prioritize strongest career alignment.',
          },
        ],
        activeRankingMode: 'best-match',
      },
      activeState: {
        resultLabel: '3 ranked picks',
        supportingText: 'Career-impact ranking tuned to mobile discovery.',
      },
      results: {
        returnedCount: 2,
        totalCount: 3,
        hasMore: true,
      },
      filters: {
        searchTerm: '',
        categories: [],
        tags: [],
        location: null,
        dateRange: {
          start: null,
          end: null,
        },
        format: 'all',
        cost: 'all',
        activeCount: 0,
      },
      availableFilters: {
        categories: [],
        tags: [],
      },
      counts: {
        format: {
          virtual: 1,
          'in-person': 1,
          hybrid: 1,
        },
        cost: {
          free: 2,
          paid: 1,
        },
        categories: {},
        tags: {},
      },
      topPicks: {
        title: 'Your Top Picks',
        cards: [
          {
            id: 'event-top-1',
            title: 'Top pick 1',
            slug: 'top-pick-1',
            startTime: '2026-04-10T18:00:00.000Z',
          },
        ],
      },
      events: [
        {
          id: 'event-1',
          title: 'Event 1',
          slug: 'event-1',
          startTime: '2026-04-11T18:00:00.000Z',
        },
        {
          id: 'event-2',
          title: 'Event 2',
          slug: 'event-2',
          startTime: '2026-04-12T18:00:00.000Z',
        },
      ],
    } as const;

    const pageTwo = {
      ...firstPage,
      results: {
        returnedCount: 1,
        totalCount: 3,
        hasMore: false,
      },
      topPicks: null,
      events: [
        {
          id: 'event-3',
          title: 'Event 3',
          slug: 'event-3',
          startTime: '2026-04-13T18:00:00.000Z',
        },
      ],
    } as const;

    const merged = mergeDiscoverFeedPage(
      'more',
      firstPage,
      firstPage.events,
      pageTwo
    );

    expect(merged.feed.topPicks?.title).toBe('Your Top Picks');
    expect(merged.events.map((event) => event.id)).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
    expect(merged.hasMorePages).toBe(false);
  });
});
