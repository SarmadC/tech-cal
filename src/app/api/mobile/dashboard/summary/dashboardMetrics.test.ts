import { describe, expect, it } from 'vitest';

import {
  buildDashboardInsights,
  buildDashboardCareerOutcomes,
  buildDiscoveryBreadth,
  buildEngagementStreak,
  buildNetworkPulse,
  buildPredictionAccuracy,
} from './dashboardMetrics';

function makeNetworkingSummary({
  eventId,
  linkedinRequestsSent,
  lastOutreachLoggedAt = '2026-03-02T00:00:00.000Z',
}: {
  eventId: string;
  linkedinRequestsSent: number | null;
  lastOutreachLoggedAt?: string | null;
}) {
  return {
    id: `summary-${eventId}`,
    eventId,
    userId: 'user-1',
    linkedinRequestsSent,
    lastOutreachLoggedAt,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  } as const;
}

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
  it('builds pipeline score from the recommendation pool instead of tracked upcoming events', () => {
    const trackedEvents = [
      makeTrackedEvent({
        id: 'tracked-upcoming',
        title: 'Tracked Upcoming',
        status: 'attending',
        startTime: '2099-04-12T18:00:00.000Z',
      }),
    ];

    const recommendationCards = [
      {
        id: 'recommended-1',
        title: 'Recommended 87',
        slug: 'recommended-87',
        startTime: '2099-04-12T18:00:00.000Z',
        score: 0.87,
      },
      {
        id: 'recommended-2',
        title: 'Recommended 72',
        slug: 'recommended-72',
        startTime: '2099-04-13T18:00:00.000Z',
        score: 72,
      },
    ];

    const result = buildDashboardInsights({
      trackedEvents: trackedEvents as never,
      recommendationCards: recommendationCards as never,
      careerProfile: null,
      now: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(result.pipeline.trackedUpcomingCount).toBe(1);
    expect(result.pipeline.scoredUpcomingCount).toBe(2);
    expect(result.pipeline.avgScore).toBe(80);
    expect(result.pipeline.highFitCount).toBe(2);
    expect(result.pipeline.topEvents.map((event) => event.score)).toEqual([87, 72]);
  });

  it('returns zero pipeline score when recommendation pool is empty', () => {
    const result = buildDashboardInsights({
      trackedEvents: [] as never,
      recommendationCards: [] as never,
      careerProfile: null,
      now: new Date('2026-04-08T12:00:00.000Z'),
    });

    expect(result.pipeline.trackedUpcomingCount).toBe(0);
    expect(result.pipeline.scoredUpcomingCount).toBe(0);
    expect(result.pipeline.avgScore).toBe(0);
    expect(result.pipeline.highFitCount).toBe(0);
    expect(result.pipeline.topEvents).toEqual([]);
  });

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

  it('builds person-first momentum from confirmed and pending contacts', () => {
    const result = buildNetworkPulse({
      contacts: [
        {
          row: {
            id: 'contact-1',
            viewerUserId: 'user-1',
            targetKind: 'speaker',
            targetUserId: null,
            targetSpeakerId: 'speaker-1',
            sourceEventId: 'event-1',
            linkedinRequestedAt: '2026-03-12T00:00:00.000Z',
            confirmedConnectedAt: null,
            createdAt: '2026-03-12T00:00:00.000Z',
            updatedAt: '2026-03-12T00:00:00.000Z',
          },
          contact: {
            kind: 'speaker',
            id: 'speaker-1',
            username: null,
            name: 'Jamie Chen',
            avatarUrl: null,
            headline: 'Product leader',
            linkedinUrl: 'https://linkedin.com/in/jamie-chen',
            sourceEvent: {
              id: 'event-1',
              slug: 'builders-mixer',
              title: 'Builders Mixer',
              startTime: '2026-03-01T18:00:00.000Z',
              location: 'Remote',
              format: 'Online',
            },
          },
          networkingState: {
            status: 'requested',
            linkedinRequestedAt: '2026-03-12T00:00:00.000Z',
            confirmedConnectedAt: null,
          },
        },
        {
          row: {
            id: 'contact-2',
            viewerUserId: 'user-1',
            targetKind: 'profile',
            targetUserId: 'profile-1',
            targetSpeakerId: null,
            sourceEventId: null,
            linkedinRequestedAt: '2026-03-01T00:00:00.000Z',
            confirmedConnectedAt: '2026-03-20T00:00:00.000Z',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-20T00:00:00.000Z',
          },
          contact: {
            kind: 'profile',
            id: 'profile-1',
            username: 'ada',
            name: 'Ada Lovelace',
            avatarUrl: null,
            headline: 'ML Engineer',
            linkedinUrl: null,
            sourceEvent: null,
          },
          networkingState: {
            status: 'connected',
            linkedinRequestedAt: '2026-03-01T00:00:00.000Z',
            confirmedConnectedAt: '2026-03-20T00:00:00.000Z',
          },
        },
      ],
    });

    expect(result.confirmedConnectionCount).toBe(1);
    expect(result.pendingRequestCount).toBe(1);
    expect(result.nextContactToConfirm?.kind).toBe('speaker');
    expect(result.nextContactToConfirm?.name).toBe('Jamie Chen');
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

  it('surfaces the most recent event that still needs connection confirmation', () => {
    const trackedEvents = [
      makeTrackedEvent({
        id: 'event-1',
        title: 'AI Mixer',
        startTime: '2026-03-20T18:00:00.000Z',
      }),
      makeTrackedEvent({
        id: 'event-2',
        title: 'Builders Night',
        startTime: '2026-03-10T18:00:00.000Z',
      }),
    ];

    const result = buildDashboardCareerOutcomes({
      trackedEvents: trackedEvents as never,
      feedbackList: [
        {
          id: 'feedback-1',
          eventId: 'event-1',
          userId: 'user-1',
          actualValueRating: 4,
          careerBenefit: null,
          connectionsMade: 1,
          eventAttended: true,
          feedbackDate: '2026-03-21T00:00:00.000Z',
          feedbackText: null,
          predictedScore: 80,
          skillsGained: null,
          wouldRecommend: true,
        },
        {
          id: 'feedback-2',
          eventId: 'event-2',
          userId: 'user-1',
          actualValueRating: 4,
          careerBenefit: null,
          connectionsMade: 2,
          eventAttended: true,
          feedbackDate: '2026-03-11T00:00:00.000Z',
          feedbackText: null,
          predictedScore: 70,
          skillsGained: null,
          wouldRecommend: true,
        },
      ],
      networkingSummaries: [
        makeNetworkingSummary({
          eventId: 'event-1',
          linkedinRequestsSent: 3,
          lastOutreachLoggedAt: '2026-03-21T00:00:00.000Z',
        }),
        makeNetworkingSummary({
          eventId: 'event-2',
          linkedinRequestsSent: 2,
          lastOutreachLoggedAt: '2026-03-11T00:00:00.000Z',
        }),
      ],
      now: new Date('2026-04-08T12:00:00.000Z'),
      toSummary: (event) => ({
        id: event.id,
        title: event.title,
        slug: event.title.toLowerCase().replace(/\s+/g, '-'),
        startTime: event.startTime,
      }),
    });

    expect(result.nextEventToConfirmConnections?.id).toBe('event-1');
  });
});
