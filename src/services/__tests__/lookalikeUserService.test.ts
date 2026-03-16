import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerProfile } from '@/types/career';
import type { Event } from '@/types';

const {
  mockGetCareerProfile,
  mockTransformRowToCareerProfile,
  mockEnhanceRecommendations,
  mockLogTelemetryEvent,
} = vi.hoisted(() => ({
  mockGetCareerProfile: vi.fn(),
  mockTransformRowToCareerProfile: vi.fn(),
  mockEnhanceRecommendations: vi.fn(),
  mockLogTelemetryEvent: vi.fn(),
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: (...args: unknown[]) => mockGetCareerProfile(...args),
    transformRowToCareerProfile: (...args: unknown[]) => mockTransformRowToCareerProfile(...args),
  },
}));

vi.mock('@/services/diversityEnhancementService', () => ({
  DiversityEnhancementService: {
    enhanceRecommendations: (...args: unknown[]) => mockEnhanceRecommendations(...args),
  },
}));

vi.mock('@/utils/transformers', () => ({
  eventDetailedTransformer: {
    toApp: (event: Event) => event,
  },
}));

vi.mock('@/utils/supabase/telemetry', () => ({
  logTelemetryEvent: (...args: unknown[]) => mockLogTelemetryEvent(...args),
}));

import { LookalikeUserService } from '../lookalikeUserService';

const userProfile: CareerProfile = {
  userId: 'user-1',
  profileId: 'profile-1',
  lastUpdated: '2026-01-01T00:00:00Z',
  currentRole: 'UX Designer',
  seniority: 'junior',
  industry: 'technology',
  companySize: 'medium',
  primarySkills: ['Figma'],
  skillsToLearn: ['Framer'],
  interests: ['UI/UX Design'],
  careerGoals: ['skill-development'],
  timeframe: 'short-term',
  learningStyle: ['hands-on'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: ['find-peers'],
  preferredEventTypes: ['conference'],
};

function buildEvent(id: string, attendeeCount: number, startTime: string): Event {
  return {
    id,
    title: `Event ${id}`,
    description: 'Test event',
    organizer: 'Kure',
    location: 'Online',
    status: 'active',
    startTime,
    endTime: null,
    sourceUrl: `https://example.com/${id}`,
    livestreamUrl: null,
    eventTypeId: 'conference',
    attendeeCount,
    createdAt: '2026-01-01T00:00:00Z',
    tags: [],
  };
}

function buildSupabaseMock(events: Event[]) {
  const similarProfiles = Array.from({ length: 5 }, (_, index) => ({
    user_id: `similar-${index + 1}`,
    current_role: 'UX Designer',
    industry: 'technology',
  }));

  const careerProfilesChain = {
    neq: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
  };
  careerProfilesChain.neq.mockReturnValue(careerProfilesChain);
  careerProfilesChain.eq.mockReturnValue(careerProfilesChain);
  careerProfilesChain.limit.mockResolvedValue({ data: similarProfiles, error: null });

  const userEventsRows = [
    { event_id: events[0].id, events_detailed: events[0] },
    { event_id: events[0].id, events_detailed: events[0] },
    { event_id: events[1].id, events_detailed: events[1] },
  ];

  const userEventsChain = {
    in: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  userEventsChain.in.mockReturnValue(userEventsChain);
  userEventsChain.eq.mockReturnValue(userEventsChain);
  userEventsChain.order.mockReturnValue(userEventsChain);
  userEventsChain.limit.mockResolvedValue({ data: userEventsRows, error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === 'career_profiles') {
        return {
          select: vi.fn(() => careerProfilesChain),
        };
      }

      if (table === 'user_events') {
        return {
          select: vi.fn(() => userEventsChain),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('LookalikeUserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCareerProfile.mockResolvedValue(userProfile);
    mockTransformRowToCareerProfile.mockImplementation((row: { user_id: string }) => ({
      ...userProfile,
      userId: row.user_id,
    }));
    mockEnhanceRecommendations.mockImplementation((events: Event[]) => ({
      enhancedRanking: events,
    }));
    mockLogTelemetryEvent.mockResolvedValue(undefined);
  });

  it('orders lookalike candidates by similar-user support without tag or legacy impact scoring', async () => {
    const figmaConfig = buildEvent('config', 5000, '2026-05-01T10:00:00Z');
    const designMeetup = buildEvent('meetup', 200, '2026-04-15T18:00:00Z');
    const supabase = buildSupabaseMock([figmaConfig, designMeetup]);

    const recommendations = await LookalikeUserService.getLookalikeRecommendations(
      'user-1',
      supabase as never,
      5
    );

    expect(recommendations.map((event) => event.id)).toEqual(['config', 'meetup']);
    expect(recommendations[0].recommendationMetadata?.matchScore).toBe(2);
    expect(recommendations[0].recommendationMetadata?.impactScore).toBe(0);
    expect(recommendations[0].recommendationMetadata?.reasons).toContain(
      'Popular with 2 similar professionals'
    );
    expect(recommendations[0].recommendationMetadata?.candidateSources).toEqual(['lookalike', 'cold-start']);
    expect(recommendations[0].recommendationProvenance).toEqual(['lookalike', 'cold-start']);
  });
});
