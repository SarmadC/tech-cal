import { describe, expect, it } from 'vitest';

import {
  buildDiscoveryBreadth,
  buildEngagementStreak,
  buildNetworkPulse,
  buildPredictionAccuracy,
} from './dashboardMetrics';

function makeTrackedEvent({
  id,
  title,
  status = 'attended',
  startTime,
  endTime,
  organizer = 'KureCal',
  category,
  eventFormat = 'Online',
  tags = [],
}: {
  id: string;
  title: string;
  status?: 'attending' | 'attended' | 'cancelled' | null;
  startTime: string;
  endTime?: string;
  organizer?: string;
  category?: string;
  eventFormat?: string | null;
  tags?: Array<{ name: string }>;
}) {
  return {
    trackingId: `tracking-${id}`,
    userId: 'user-1',
    eventId: id,
    status,
    notes: null,
    trackedAt: '2026-01-01T00:00:00.000Z',
    isBookmarked: true,
    bookmarkedAt: '2026-01-01T00:00:00.000Z',
    event: {
      id,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      title,
      description: `${title} description`,
      organizer,
      location: 'Remote',
      status: 'confirmed',
      startTime,
      endTime: endTime ?? startTime,
      sourceUrl: 'https://example.com',
      livestreamUrl: null,
      registrationUrl: 'https://example.com/register',
      eventTypeId: 'meetup',
      eventFormat,
      priceMin: 0,
      priceRange: 'Free',
      eventImageUrl: null,
      organization: { id: `org-${id}`, name: organizer, logo: null },
      category: category ? { id: `cat-${category}`, name: category } : null,
      tags,
    },
  } as const;
}

describe('dashboardMetrics builders', () => {
  it('builds a current and longest engagement streak from ISO weeks', () => {
    const trackedEvents = [
      makeTrackedEvent({
        id: 'event-1',
        title: 'Current week',
        startTime: '2026-04-07T18:00:00.000Z',
      }),
      makeTrackedEvent({
        id: 'event-2',
        title: 'Last week',
        startTime: '2026-03-31T18:00:00.000Z',
      }),
      makeTrackedEvent({
        id: 'event-3',
        title: 'Two weeks back',
        startTime: '2026-03-24T18:00:00.000Z',
      }),
      makeTrackedEvent({
        id: 'event-4',
        title: 'Four weeks back',
        startTime: '2026-03-10T18:00:00.000Z',
      }),
    ];

    const result = buildEngagementStreak({
      trackedEvents: trackedEvents as never,
      now: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(result.currentWeekStreak).toBe(3);
    expect(result.longestWeekStreak).toBe(3);
    expect(result.recentWeeks).toHaveLength(8);
    expect(result.recentWeeks[result.recentWeeks.length - 1]?.active).toBe(true);
  });

  it('returns a zero current streak when the current ISO week is empty', () => {
    const trackedEvents = [
      makeTrackedEvent({
        id: 'event-1',
        title: 'Last week',
        startTime: '2026-03-31T18:00:00.000Z',
      }),
    ];

    const result = buildEngagementStreak({
      trackedEvents: trackedEvents as never,
      now: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(result.currentWeekStreak).toBe(0);
    expect(result.longestWeekStreak).toBe(1);
  });

  it('classifies discovery breadth using unique attended categories', () => {
    const trackedEvents = [
      makeTrackedEvent({
        id: 'event-1',
        title: 'AI Summit',
        startTime: '2026-03-01T18:00:00.000Z',
        organizer: 'Org A',
        category: 'AI',
        eventFormat: 'Online',
      }),
      makeTrackedEvent({
        id: 'event-2',
        title: 'Design Jam',
        startTime: '2026-03-08T18:00:00.000Z',
        organizer: 'Org B',
        category: 'Design',
        eventFormat: 'In-person',
      }),
      makeTrackedEvent({
        id: 'event-3',
        title: 'Product Circle',
        startTime: '2026-03-15T18:00:00.000Z',
        organizer: 'Org C',
        category: 'Product',
        eventFormat: 'Hybrid',
      }),
      makeTrackedEvent({
        id: 'event-4',
        title: 'Cloud Meetup',
        startTime: '2026-03-22T18:00:00.000Z',
        organizer: 'Org D',
        category: 'Cloud',
        eventFormat: 'Online',
      }),
    ];

    const result = buildDiscoveryBreadth({
      trackedEvents: trackedEvents as never,
      now: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(result.categoryCount).toBe(4);
    expect(result.organizerCount).toBe(4);
    expect(result.formatCounts.virtual).toBe(2);
    expect(result.formatCounts['in-person']).toBe(1);
    expect(result.formatCounts.hybrid).toBe(1);
    expect(result.breadthLabel).toBe('broad');
  });

  it('joins top-connection feedback back to the attended event title', () => {
    const trackedEvents = [
      makeTrackedEvent({
        id: 'event-1',
        title: 'Builders Mixer',
        startTime: '2026-03-01T18:00:00.000Z',
        tags: [{ name: 'networking' }],
      }),
      makeTrackedEvent({
        id: 'event-2',
        title: 'AI Forum',
        startTime: '2026-03-10T18:00:00.000Z',
      }),
    ];

    const result = buildNetworkPulse({
      trackedEvents: trackedEvents as never,
      feedbackList: [
        {
          id: 'feedback-1',
          eventId: 'event-1',
          userId: 'user-1',
          actualValueRating: 4,
          careerBenefit: null,
          connectionsMade: 5,
          eventAttended: true,
          feedbackDate: '2026-03-02T00:00:00.000Z',
          feedbackText: null,
          predictedScore: 81,
          skillsGained: null,
          wouldRecommend: true,
        },
        {
          id: 'feedback-2',
          eventId: 'event-2',
          userId: 'user-1',
          actualValueRating: 3,
          careerBenefit: null,
          connectionsMade: 2,
          eventAttended: true,
          feedbackDate: '2026-03-11T00:00:00.000Z',
          feedbackText: null,
          predictedScore: 55,
          skillsGained: null,
          wouldRecommend: false,
        },
      ],
      now: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(result.totalConnectionsMade).toBe(7);
    expect(result.connectionsPerEvent).toBe(3.5);
    expect(result.topConnectingEvent?.title).toBe('Builders Mixer');
    expect(result.networkingEventRatio).toBe(50);
  });

  it('gates prediction accuracy confidence by sample size', () => {
    const result = buildPredictionAccuracy({
      feedbackList: [
        {
          id: 'feedback-1',
          eventId: 'event-1',
          userId: 'user-1',
          actualValueRating: 5,
          careerBenefit: null,
          connectionsMade: 1,
          eventAttended: true,
          feedbackDate: '2026-03-02T00:00:00.000Z',
          feedbackText: null,
          predictedScore: 90,
          skillsGained: null,
          wouldRecommend: true,
        },
        {
          id: 'feedback-2',
          eventId: 'event-2',
          userId: 'user-1',
          actualValueRating: 2,
          careerBenefit: null,
          connectionsMade: 0,
          eventAttended: true,
          feedbackDate: '2026-03-09T00:00:00.000Z',
          feedbackText: null,
          predictedScore: 40,
          skillsGained: null,
          wouldRecommend: false,
        },
      ],
    });

    expect(result.sampleSize).toBe(2);
    expect(result.confidenceLabel).toBe('not_enough_data');
    expect(result.state).toBe('learning');
    expect(result.unlockMessage).toContain('1 more rated event');
  });
});
