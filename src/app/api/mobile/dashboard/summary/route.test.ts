import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mobileDashboardSummarySchema } from '@kurecal/domain';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  fetchPersonalizedRecommendationCandidates: vi.fn(),
  getCareerProfile: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  getAllContactsForViewer: vi.fn(),
  getAllFeedbackForUser: vi.fn(),
  getAllSummariesForUser: vi.fn(),
  getEventCount: vi.fn(),
  getEvents: vi.fn(),
  getProfile: vi.fn(),
  getTrackedEvents: vi.fn(),
  hydrateContacts: vi.fn(),
  loadEngagementMap: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/userEventService', () => ({
  UserEventService: {
    getTrackedEvents: (...args: unknown[]) => mocks.getTrackedEvents(...args),
  },
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: (...args: unknown[]) => mocks.getCareerProfile(...args),
  },
}));

vi.mock('@/services/profileService', () => ({
  ProfileService: {
    getProfile: (...args: unknown[]) => mocks.getProfile(...args),
  },
}));

vi.mock('@/services/eventFeedbackService', () => ({
  EventFeedbackService: {
    getAllFeedbackForUser: (...args: unknown[]) =>
      mocks.getAllFeedbackForUser(...args),
  },
}));

vi.mock('@/services/eventNetworkingSummaryService', () => ({
  EventNetworkingSummaryService: {
    getAllSummariesForUser: (...args: unknown[]) =>
      mocks.getAllSummariesForUser(...args),
  },
}));

vi.mock('@/services/userNetworkingContactService', () => ({
  UserNetworkingContactService: {
    getAllContactsForViewer: (...args: unknown[]) =>
      mocks.getAllContactsForViewer(...args),
    hydrateContacts: (...args: unknown[]) => mocks.hydrateContacts(...args),
  },
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEvents: (...args: unknown[]) => mocks.getEvents(...args),
    getEventCount: (...args: unknown[]) => mocks.getEventCount(...args),
  },
}));

vi.mock('@/services/recommendations/recommendationPipeline', () => ({
  fetchPersonalizedRecommendationCandidates: (...args: unknown[]) =>
    mocks.fetchPersonalizedRecommendationCandidates(...args),
}));

vi.mock('@/app/api/mobile/engagement', () => ({
  engagementFromTrackedEvent: (record: { isBookmarked: boolean; status: string | null }) => ({
    isBookmarked: record.isBookmarked,
    status: record.status,
  }),
  loadEngagementMap: (...args: unknown[]) => mocks.loadEngagementMap(...args),
}));

const trackedEvent = {
  trackingId: 'tracking-1',
  userId: 'user-1',
  eventId: 'event-1',
  status: 'attending',
  notes: null,
  trackedAt: '2026-04-01T00:00:00.000Z',
  isBookmarked: true,
  bookmarkedAt: '2026-04-01T00:00:00.000Z',
  event: {
    id: 'event-1',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    title: 'Tracked Event',
    description: 'Already on the user plan.',
    organizer: 'KureCal',
    location: 'Remote',
    status: 'confirmed',
    startTime: '2099-04-12T18:00:00.000Z',
    endTime: '2099-04-12T19:00:00.000Z',
    sourceUrl: 'https://example.com/events/tracked',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    eventTypeId: 'meetup',
    eventFormat: 'Online',
    priceMin: 0,
    priceRange: 'Free',
    eventImageUrl: null,
    organization: { id: 'org-1', name: 'KureCal', logo: null },
    tags: [],
  },
};

const attendedTrackedEvent = {
  trackingId: 'tracking-2',
  userId: 'user-1',
  eventId: 'event-3',
  status: 'attended',
  notes: null,
  trackedAt: '2026-03-01T00:00:00.000Z',
  isBookmarked: true,
  bookmarkedAt: '2026-02-20T00:00:00.000Z',
  event: {
    id: 'event-3',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    title: 'Attended Event',
    description: 'A completed event with useful career signal.',
    organizer: 'KureCal',
    location: 'Calgary',
    status: 'confirmed',
    startTime: '2026-03-10T18:00:00.000Z',
    endTime: '2026-03-10T19:30:00.000Z',
    sourceUrl: 'https://example.com/events/attended',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/register',
    eventTypeId: 'meetup',
    eventFormat: 'In Person',
    priceMin: 0,
    priceRange: 'Free',
    eventImageUrl: null,
    organization: { id: 'org-1', name: 'KureCal', logo: null },
    tags: [{ name: 'product-strategy' }, { name: 'networking' }],
  },
};

const recommendedEvent = {
  id: 'event-2',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  title: 'Recommended Event',
  description: 'Fresh opening from the catalog.',
  organizer: 'KureCal',
  location: 'Edmonton',
  status: 'confirmed',
  startTime: '2099-04-15T18:00:00.000Z',
  endTime: '2099-04-15T20:00:00.000Z',
  sourceUrl: 'https://example.com/events/recommended',
  livestreamUrl: null,
  registrationUrl: 'https://example.com/register',
  eventTypeId: 'conference',
  eventFormat: 'Hybrid',
  priceMin: 20,
  priceRange: '$20+',
  eventImageUrl: null,
  organization: { id: 'org-2', name: 'KureCal', logo: null },
  tags: [],
  recommendationMetadata: {
    matchScore: 87,
  },
};

function buildRecommendedEvent(
  id: string,
  options: Partial<{
    score: number;
    organizer: string;
    eventTypeId: string;
    startTime: string;
    title: string;
  }> = {}
) {
  return {
    ...recommendedEvent,
    id,
    title: options.title ?? `Recommended ${id}`,
    startTime: options.startTime ?? recommendedEvent.startTime,
    eventTypeId: options.eventTypeId ?? recommendedEvent.eventTypeId,
    organizer: options.organizer ?? recommendedEvent.organizer,
    organization: {
      id: `org-${id}`,
      name: options.organizer ?? recommendedEvent.organizer,
      logo: null,
    },
    recommendationMetadata: {
      matchScore: options.score ?? 87,
    },
  };
}

describe('GET /api/mobile/dashboard/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase: {},
      user: { id: 'user-1' },
    });
    mocks.getCareerProfile.mockResolvedValue({
      currentRole: 'Engineer',
      careerGoals: ['networking'],
      skillsToLearn: ['Product Strategy'],
      networkingGoals: ['Meet more product operators'],
    });
    mocks.getProfile.mockResolvedValue({
      preferences: {
        careerOnboardingCompleted: true,
      },
    });
    mocks.getTrackedEvents.mockResolvedValue([trackedEvent, attendedTrackedEvent]);
    mocks.fetchPersonalizedRecommendationCandidates.mockResolvedValue({
      events: [recommendedEvent],
      matchedTags: [],
      candidateSources: new Map(),
    });
    mocks.getAllFeedbackForUser.mockResolvedValue([
      {
        id: 'feedback-1',
        eventId: 'event-3',
        userId: 'user-1',
        actualValueRating: 4,
        careerBenefit: 'Useful',
        connectionsMade: 2,
        eventAttended: true,
        feedbackDate: '2026-03-11T00:00:00.000Z',
        feedbackText: 'Great event',
        predictedScore: 82,
        skillsGained: ['Product Strategy'],
        wouldRecommend: true,
      },
    ]);
    mocks.getAllSummariesForUser.mockResolvedValue([
      {
        id: 'summary-1',
        eventId: 'event-3',
        userId: 'user-1',
        linkedinRequestsSent: 4,
        lastOutreachLoggedAt: '2026-03-11T00:00:00.000Z',
        createdAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z',
      },
    ]);
    mocks.getAllContactsForViewer.mockResolvedValue([
      {
        id: 'contact-1',
        viewerUserId: 'user-1',
        targetKind: 'speaker',
        targetUserId: null,
        targetSpeakerId: 'speaker-1',
        sourceEventId: 'event-3',
        linkedinRequestedAt: '2026-03-11T00:00:00.000Z',
        confirmedConnectedAt: null,
        createdAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z',
      },
      {
        id: 'contact-2',
        viewerUserId: 'user-1',
        targetKind: 'profile',
        targetUserId: 'profile-1',
        targetSpeakerId: null,
        sourceEventId: null,
        linkedinRequestedAt: '2026-03-01T00:00:00.000Z',
        confirmedConnectedAt: '2026-03-12T00:00:00.000Z',
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-12T00:00:00.000Z',
      },
    ]);
    mocks.hydrateContacts.mockResolvedValue([
      {
        row: {
          id: 'contact-1',
          updatedAt: '2026-03-11T00:00:00.000Z',
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
            id: '11111111-1111-4111-8111-111111111111',
            slug: 'attended-event',
            title: 'Attended Event',
            startTime: '2026-03-10T18:00:00.000Z',
            location: 'Calgary',
            format: 'In Person',
          },
        },
        networkingState: {
          status: 'requested',
          linkedinRequestedAt: '2026-03-11T00:00:00.000Z',
          confirmedConnectedAt: null,
        },
      },
      {
        row: {
          id: 'contact-2',
          updatedAt: '2026-03-12T00:00:00.000Z',
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
          confirmedConnectedAt: '2026-03-12T00:00:00.000Z',
        },
      },
    ]);
    mocks.loadEngagementMap.mockResolvedValue(
      new Map([
        [
          recommendedEvent.id,
          {
            isBookmarked: false,
            status: null,
          },
        ],
      ])
    );
  });

  it('returns a typed dashboard summary with hero, metrics, and onboarding state', async () => {
    const response = await GET(
      new Request('http://localhost/api/mobile/dashboard/summary', {
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);

    const parsed = mobileDashboardSummarySchema.parse(payload.data);
    expect(parsed.hero.highlight).toBe('Recommended Event');
    expect(parsed.metrics.find((metric) => metric.id === 'saved')?.value).toBe('2');
    expect(parsed.upcoming[0]?.engagement?.status).toBe('attending');
    expect(parsed.recommendations[0]?.id).toBe('event-2');
    expect(parsed.onboardingState.hasCompleted).toBe(true);
    expect(parsed.topRecommendation?.event.id).toBe('event-2');
    expect(parsed.topRecommendation?.event.score).toBe(87);
    expect(parsed.upcomingCommitments?.[0]?.trackingId).toBe('tracking-1');
    expect(parsed.showOpenCommitmentSlot).toBe(true);
    expect(parsed.insights?.pipeline.trackedUpcomingCount).toBe(1);
    expect(parsed.insights?.pipeline.scoredUpcomingCount).toBe(1);
    expect(parsed.insights?.pipeline.avgScore).toBe(87);
    expect(parsed.insights?.pipeline.highFitCount).toBe(1);
    expect(parsed.monthlyPulse?.trend.length).toBe(4);
    expect(parsed.performance?.summary.attendedCount).toBe(1);
    expect(parsed.performance?.summary.ratedCount).toBe(1);
    expect(parsed.performance?.summary.connectionsMade).toBe(2);
    expect(parsed.performance?.recentWins[0]?.event.id).toBe('event-3');
    expect(parsed.performance?.recentWins[0]?.feedbackSubmitted).toBe(true);
    expect(parsed.engagementStreak?.recentWeeks.length).toBe(8);
    expect(parsed.discoveryBreadth?.organizerCount).toBe(1);
    expect(parsed.networkPulse?.confirmedConnectionCount).toBe(1);
    expect(parsed.networkPulse?.pendingRequestCount).toBe(1);
    expect(parsed.networkPulse?.nextContactToConfirm?.id).toBe('speaker-1');
    expect(parsed.predictionAccuracy?.sampleSize).toBe(1);
    expect(parsed.careerImpact?.totalEvents).toBe(1);
    expect(parsed.careerOutcomes?.feedbackCount).toBe(1);
    expect(parsed.careerOutcomes?.nextEventToRate).toBeNull();
    expect(parsed.careerOutcomes?.nextEventToConfirmConnections?.id).toBe('event-3');
    expect(payload.data.header.title).toBe('Your event runway');
    expect(payload.data.upcomingCount).toBe(1);
    expect(payload.data.savedCount).toBe(2);
    expect(payload.data.recommendationCount).toBe(1);
    expect(payload.data.heroEvent?.id).toBe('event-1');
  });

  it('keeps pipeline score aligned with recommendation score when tracked upcoming events are unscored', async () => {
    mocks.getTrackedEvents.mockResolvedValueOnce([
      {
        ...trackedEvent,
        event: {
          ...trackedEvent.event,
          recommendationMetadata: {
            matchScore: 0,
          },
        },
      },
    ]);
    mocks.fetchPersonalizedRecommendationCandidates.mockResolvedValueOnce({
      events: [
        {
          ...recommendedEvent,
          recommendationMetadata: {
            matchScore: 87,
          },
        },
      ],
      matchedTags: [],
      candidateSources: new Map(),
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/dashboard/summary', {
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();
    const parsed = mobileDashboardSummarySchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.topRecommendation?.event.score).toBe(87);
    expect(parsed.insights?.pipeline.trackedUpcomingCount).toBe(1);
    expect(parsed.insights?.pipeline.avgScore).toBe(87);
    expect(parsed.insights?.pipeline.scoredUpcomingCount).toBe(1);
  });

  it('uses the same diversified top picks slice for dashboard hero and pipeline', async () => {
    const recommendationA = buildRecommendedEvent('event-a', {
      score: 91,
      organizer: 'Org A',
      eventTypeId: 'meetup',
      startTime: '2099-04-12T18:00:00.000Z',
    });
    const recommendationB = buildRecommendedEvent('event-b', {
      score: 88,
      organizer: 'Org B',
      eventTypeId: 'conference',
      startTime: '2099-04-13T18:00:00.000Z',
    });
    const recommendationC = buildRecommendedEvent('event-c', {
      score: 77,
      organizer: 'Org C',
      eventTypeId: 'workshop',
      startTime: '2099-04-14T18:00:00.000Z',
    });
    const recommendationD = buildRecommendedEvent('event-d', {
      score: 85,
      organizer: 'Org A',
      eventTypeId: 'meetup',
      startTime: '2099-04-15T18:00:00.000Z',
    });

    mocks.fetchPersonalizedRecommendationCandidates.mockResolvedValueOnce({
      events: [recommendationA, recommendationD, recommendationB, recommendationC],
      matchedTags: [],
      candidateSources: new Map(),
    });
    mocks.loadEngagementMap.mockResolvedValueOnce(
      new Map([
        [recommendationA.id, { isBookmarked: false, status: null }],
        [recommendationB.id, { isBookmarked: false, status: null }],
        [recommendationC.id, { isBookmarked: false, status: null }],
        [recommendationD.id, { isBookmarked: false, status: null }],
      ])
    );

    const response = await GET(
      new Request('http://localhost/api/mobile/dashboard/summary', {
        headers: { Authorization: 'Bearer mobile-token' },
      })
    );
    const payload = await response.json();
    const parsed = mobileDashboardSummarySchema.parse(payload.data);

    expect(response.status).toBe(200);
    expect(parsed.topRecommendation?.event.id).toBe('event-a');
    expect(parsed.insights?.pipeline.avgScore).toBe(85);
    expect(parsed.insights?.pipeline.highFitCount).toBe(3);
    expect(parsed.insights?.pipeline.scoredUpcomingCount).toBe(3);
    expect(parsed.insights?.pipeline.topEvents.map((event) => event.eventId)).toEqual([
      'event-a',
      'event-b',
      'event-c',
    ]);
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/dashboard/summary')
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });
});
