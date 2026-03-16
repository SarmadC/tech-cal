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
  mockGetEventsWithAgenda.mockResolvedValue([]);
  mockEnrichEventsWithCareerImpact.mockImplementation((events: Event[]) => events);
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

    expect(mockGetRecommendedEventsByTags).toHaveBeenCalledWith('u1', baseProfile, supabaseStub, 10);
    expect(result.events).toHaveLength(1);
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
