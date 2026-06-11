import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Event, EventWithCareerImpact, RecommendationCandidateSource, SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';

const mockEnrichEventsWithCareerImpact = vi.fn();
const mockGetEventsWithAgenda = vi.fn();
const mockGetEventsWithColdStartHandling = vi.fn();
const mockSearchEventsByTags = vi.fn();
const mockGetRecommendedEventsByTags = vi.fn();

vi.mock('@/services/eventServices', () => ({
  EventService: {
    enrichEventsWithCareerImpact: (...args: unknown[]) => mockEnrichEventsWithCareerImpact(...args),
    getEventsWithAgenda: (...args: unknown[]) => mockGetEventsWithAgenda(...args),
    getEventsWithColdStartHandling: (...args: unknown[]) => mockGetEventsWithColdStartHandling(...args),
    searchEventsByTags: (...args: unknown[]) => mockSearchEventsByTags(...args),
    getRecommendedEventsByTags: (...args: unknown[]) => mockGetRecommendedEventsByTags(...args),
  },
}));

vi.mock('@/services/tagBasedMatchingService', () => ({
  TagBasedMatchingService: {
    calculateTagSimilarity: () => ({ score: 0.5, matchedTags: ['ai'], explanation: 'test' }),
  },
}));

import {
  rankEventsWithRecommendationPipeline,
  fetchPersonalizedRecommendationCandidates,
  fetchFilteredRecommendationCandidates,
  fetchHybridBestMatchCandidates,
} from '../recommendationPipeline';

const supabaseStub = {} as SupabaseClientType;

const baseProfile: CareerProfile = {
  userId: 'u1',
  profileId: 'p1',
  lastUpdated: new Date().toISOString(),
  primarySkills: ['typescript'],
  skillsToLearn: ['rust'],
  interests: ['backend'],
  careerGoals: ['skill-development'],
  industry: 'technology',
  learningStyle: ['hands-on'],
  timeframe: 'medium-term',
  budget: 'moderate',
  networkingGoals: ['find-peers'],
  preferredEventTypes: ['workshop'],
  currentRole: 'engineer',
  companySize: 'medium',
  seniority: 'mid-level',
  availableTime: 'moderate',
};

function makeEvent(id: string, overrides: Partial<Event> = {}): Event {
  return {
    id,
    createdAt: '2026-01-01T00:00:00Z',
    title: `Event ${id}`,
    description: 'Test event',
    organizer: 'Test Org',
    location: 'Online',
    status: 'confirmed',
    startTime: '2026-06-01T09:00:00Z',
    endTime: '2026-06-01T17:00:00Z',
    sourceUrl: 'https://example.com',
    livestreamUrl: null,
    eventTypeId: 'type-1',
    ...overrides,
  };
}

function makeEventWithScore(id: string, score: number): Event {
  const event = makeEvent(id);
  (event as EventWithCareerImpact).careerImpact = {
    overall: score,
    confidence: 0.8,
    components: { skillRelevance: score, careerStageMatch: 0, networkingValue: 0, industryRelevance: 0, timingBonus: 0 },
    explanation: { reasons: ['test'], matchedSkills: [], speakerHighlights: [], careerImpactCategory: 'moderate', confidenceFactors: [] },
    metadata: { algorithmVersion: 'test-v1', calculatedAt: new Date().toISOString(), careerProfileHash: 'abc', eventDataHash: 'def' },
    isCareerScored: true,
  } as EventWithCareerImpact['careerImpact'];
  return event;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetEventsWithAgenda.mockReset();
  mockEnrichEventsWithCareerImpact.mockReset();
  mockGetEventsWithColdStartHandling.mockReset();
  mockSearchEventsByTags.mockReset();
  mockGetRecommendedEventsByTags.mockReset();
  mockGetEventsWithAgenda.mockResolvedValue([]);
  mockEnrichEventsWithCareerImpact.mockImplementation((events: Event[]) => events);
  mockSearchEventsByTags.mockResolvedValue([]);
  mockGetRecommendedEventsByTags.mockResolvedValue([]);
});

describe('rankEventsWithRecommendationPipeline', () => {
  it('returns empty array for empty input', async () => {
    const result = await rankEventsWithRecommendationPipeline({
      events: [],
      careerProfile: baseProfile,
      supabaseClient: supabaseStub,
    });
    expect(result).toEqual([]);
    expect(mockEnrichEventsWithCareerImpact).not.toHaveBeenCalled();
  });

  it('enriches events and decorates recommendation metadata', async () => {
    const events = [makeEvent('e1'), makeEvent('e2')];
    mockEnrichEventsWithCareerImpact.mockResolvedValue(events);

    const result = await rankEventsWithRecommendationPipeline({
      events,
      careerProfile: baseProfile,
      supabaseClient: supabaseStub,
      userId: 'u1',
    });

    expect(result).toHaveLength(2);
    expect(result[0].recommendationMetadata).toBeDefined();
    expect(result[0].recommendationMetadata!.matchScore).toBeDefined();
    expect(result[0].recommendationMetadata!.reasons).toBeInstanceOf(Array);
  });

  it('sorts by career impact score when sortByCareerImpact is true', async () => {
    const events = [makeEventWithScore('e1', 30), makeEventWithScore('e2', 90), makeEventWithScore('e3', 60)];
    mockEnrichEventsWithCareerImpact.mockResolvedValue(events);

    const result = await rankEventsWithRecommendationPipeline({
      events,
      careerProfile: baseProfile,
      supabaseClient: supabaseStub,
      sortByCareerImpact: true,
      careerImpactSortDirection: 'desc',
    });

    expect(result[0].id).toBe('e2');
    expect(result[1].id).toBe('e3');
    expect(result[2].id).toBe('e1');
  });

  it('preserves original order when sortByCareerImpact is false', async () => {
    const events = [makeEventWithScore('e1', 30), makeEventWithScore('e2', 90)];
    mockEnrichEventsWithCareerImpact.mockResolvedValue(events);

    const result = await rankEventsWithRecommendationPipeline({
      events,
      careerProfile: baseProfile,
      supabaseClient: supabaseStub,
      sortByCareerImpact: false,
    });

    expect(result[0].id).toBe('e1');
    expect(result[1].id).toBe('e2');
  });

  it('uses provided candidateSources map', async () => {
    const events = [makeEvent('e1')];
    mockEnrichEventsWithCareerImpact.mockResolvedValue(events);

    const sources = new Map<string, RecommendationCandidateSource[]>([
      ['e1', ['lookalike', 'cold-start']],
    ]);

    const result = await rankEventsWithRecommendationPipeline({
      events,
      careerProfile: baseProfile,
      supabaseClient: supabaseStub,
      candidateSources: sources,
    });

    expect(result[0].recommendationMetadata!.candidateSources).toContain('lookalike');
  });

  it('works with null careerProfile', async () => {
    const events = [makeEvent('e1')];
    mockEnrichEventsWithCareerImpact.mockResolvedValue(events);

    const result = await rankEventsWithRecommendationPipeline({
      events,
      careerProfile: null,
      supabaseClient: supabaseStub,
    });

    expect(result).toHaveLength(1);
    expect(result[0].recommendationMetadata).toBeDefined();
  });
});

describe('fetchPersonalizedRecommendationCandidates', () => {
  it('fetches by tag search when tags are provided', async () => {
    const events = [makeEvent('e1')];
    mockSearchEventsByTags.mockResolvedValue(events);

    const result = await fetchPersonalizedRecommendationCandidates({
      supabaseClient: supabaseStub,
      userId: 'u1',
      careerProfile: baseProfile,
      tags: ['ai'],
    });

    expect(mockSearchEventsByTags).toHaveBeenCalledWith(['ai'], supabaseStub, 10);
    expect(result.events).toHaveLength(1);
    expect(result.matchedTags).toContain('ai');
  });

  it('returns empty when no userId and no tags', async () => {
    const result = await fetchPersonalizedRecommendationCandidates({
      supabaseClient: supabaseStub,
      careerProfile: null,
    });

    expect(result.events).toEqual([]);
    expect(result.matchedTags).toEqual([]);
  });

  it('uses tag-based recommendations when no tags provided', async () => {
    const events = [makeEvent('e1')];
    mockGetRecommendedEventsByTags.mockResolvedValue(events);

    const result = await fetchPersonalizedRecommendationCandidates({
      supabaseClient: supabaseStub,
      userId: 'u1',
      careerProfile: baseProfile,
    });

    expect(mockGetRecommendedEventsByTags).toHaveBeenCalledWith('u1', baseProfile, supabaseStub, 10, undefined);
    expect(result.events).toHaveLength(1);
  });

  it('threads userLocation through to tag-based retrieval', async () => {
    const events = [makeEvent('e1')];
    mockGetRecommendedEventsByTags.mockResolvedValue(events);
    const userLocation = { city: 'berlin', country: 'germany' };

    await fetchPersonalizedRecommendationCandidates({
      supabaseClient: supabaseStub,
      userId: 'u1',
      careerProfile: baseProfile,
      userLocation,
    });

    expect(mockGetRecommendedEventsByTags).toHaveBeenCalledWith('u1', baseProfile, supabaseStub, 10, userLocation);
  });
});

describe('fetchFilteredRecommendationCandidates', () => {
  it('delegates to EventService.getEventsWithColdStartHandling', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValue({
      events: [makeEvent('e1')],
      totalCount: 1,
      isColdStart: false,
    });

    const result = await fetchFilteredRecommendationCandidates({
      supabaseClient: supabaseStub,
      careerProfile: baseProfile,
      userId: 'u1',
      page: 1,
      pageSize: 50,
    });

    expect(result.events).toHaveLength(1);
    expect(result.isColdStart).toBe(false);
    expect(result.candidateSources.get('e1')).toBeDefined();
  });

  it('tags cold-start sources correctly', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValue({
      events: [makeEvent('e1')],
      totalCount: 1,
      isColdStart: true,
    });

    const result = await fetchFilteredRecommendationCandidates({
      supabaseClient: supabaseStub,
      careerProfile: null,
    });

    expect(result.candidateSources.get('e1')).toContain('cold-start');
  });
});

describe('fetchHybridBestMatchCandidates', () => {
  it('merges broad and personalized-filtered candidates and unions provenance', async () => {
    const configEventId = 'e6f98ab0-720a-4d2b-8ee6-5646146f51bc';
    const broadEvents = [makeEvent('broad-1'), makeEvent('broad-2')];
    const configEvent = makeEvent(configEventId, {
      title: 'Config 2026',
      recommendationProvenance: ['tag-based'],
    });

    mockGetEventsWithColdStartHandling.mockImplementation(async (filters: { eventIds?: string[] }) => {
      if (filters.eventIds) {
        return {
          events: [configEvent],
          totalCount: 1,
          isColdStart: false,
        };
      }

      return {
        events: broadEvents,
        totalCount: 300,
        isColdStart: false,
      };
    });
    mockGetRecommendedEventsByTags.mockResolvedValue([configEvent]);

    const result = await fetchHybridBestMatchCandidates({
      supabaseClient: supabaseStub,
      careerProfile: baseProfile,
      userId: 'u1',
      page: 1,
      pageSize: 50,
      filters: { status: ['confirmed'] },
    });

    expect(result.retrievalStrategy).toBe('hybrid-best-match-v1');
    expect(result.supplemented).toBe(true);
    expect(result.events.map((event) => event.id)).toEqual(['broad-1', 'broad-2', configEventId]);
    expect(result.candidateSources.get(configEventId)).toEqual(expect.arrayContaining(['filtered', 'tag-based']));
    expect(result.totalCount).toBe(300);
    expect(result.candidateCounts).toEqual({
      broad: 2,
      personalizedRaw: 1,
      personalizedFiltered: 1,
      merged: 3,
    });
  });

  it('excludes personalized candidates that do not survive the current hard filters', async () => {
    const broadEvents = [makeEvent('broad-1')];
    const configEvent = makeEvent('e6f98ab0-720a-4d2b-8ee6-5646146f51bc');

    mockGetEventsWithColdStartHandling.mockResolvedValue({
      events: broadEvents,
      totalCount: 1,
      isColdStart: false,
    });
    mockGetRecommendedEventsByTags.mockResolvedValue([configEvent]);

    const result = await fetchHybridBestMatchCandidates({
      supabaseClient: supabaseStub,
      careerProfile: baseProfile,
      userId: 'u1',
      filters: { eventIds: ['broad-1'] },
    });

    expect(result.retrievalStrategy).toBe('hybrid-best-match-v1');
    expect(result.supplemented).toBe(false);
    expect(result.events.map((event) => event.id)).toEqual(['broad-1']);
    expect(result.candidateCounts.personalizedRaw).toBe(1);
    expect(result.candidateCounts.personalizedFiltered).toBe(0);
  });

  it('merges the personalized supplement for cold-start users with a profile', async () => {
    // Cold-start users who completed a career profile should not be limited to
    // the lookalike pool: their profile-driven candidates are merged in.
    mockGetEventsWithColdStartHandling
      .mockResolvedValueOnce({
        events: [makeEvent('cold-1')],
        totalCount: 1,
        isColdStart: true,
      })
      // Second call re-filters the personalized supplement (skipColdStart path)
      .mockResolvedValueOnce({
        events: [makeEvent('supplement')],
        totalCount: 1,
        isColdStart: false,
      });
    mockGetRecommendedEventsByTags.mockResolvedValue([makeEvent('supplement')]);

    const result = await fetchHybridBestMatchCandidates({
      supabaseClient: supabaseStub,
      careerProfile: baseProfile,
      userId: 'u1',
    });

    expect(result.retrievalStrategy).toBe('hybrid-best-match-v1');
    expect(result.supplemented).toBe(true);
    expect(result.isColdStart).toBe(true);
    expect(result.events.map((event) => event.id)).toEqual(['cold-1', 'supplement']);
  });

  it('skips supplement retrieval when the user is missing profile context', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValue({
      events: [makeEvent('broad-1')],
      totalCount: 1,
      isColdStart: false,
    });

    const result = await fetchHybridBestMatchCandidates({
      supabaseClient: supabaseStub,
      careerProfile: null,
      userId: 'u1',
    });

    expect(result.retrievalStrategy).toBe('filtered-only');
    expect(mockGetRecommendedEventsByTags).not.toHaveBeenCalled();
  });

  it('falls back cleanly when supplement re-filtering fails', async () => {
    mockGetEventsWithColdStartHandling
      .mockResolvedValueOnce({
        events: [makeEvent('broad-1')],
        totalCount: 10,
        isColdStart: false,
      })
      .mockRejectedValueOnce(new Error('supplement refilter failed'));
    mockGetRecommendedEventsByTags.mockResolvedValue([makeEvent('supplement')]);

    const result = await fetchHybridBestMatchCandidates({
      supabaseClient: supabaseStub,
      careerProfile: baseProfile,
      userId: 'u1',
    });

    expect(result.retrievalStrategy).toBe('filtered-only');
    expect(result.supplemented).toBe(false);
    expect(result.events.map((event) => event.id)).toEqual(['broad-1']);
  });

  it('falls back cleanly when the personalized supplement fetch fails', async () => {
    mockGetEventsWithColdStartHandling.mockResolvedValue({
      events: [makeEvent('broad-1')],
      totalCount: 10,
      isColdStart: false,
    });
    mockGetRecommendedEventsByTags.mockRejectedValue(new Error('personalized fetch failed'));

    const result = await fetchHybridBestMatchCandidates({
      supabaseClient: supabaseStub,
      careerProfile: baseProfile,
      userId: 'u1',
    });

    expect(result.retrievalStrategy).toBe('filtered-only');
    expect(result.supplemented).toBe(false);
    expect(result.events.map((event) => event.id)).toEqual(['broad-1']);
  });
});
