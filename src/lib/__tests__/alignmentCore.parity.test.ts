import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateBaseScore } from '@/lib/recommendation/baseScorer';
import { enrichEventsWithCareerImpact } from '@/services/careerImpactEnrichmentService';
import { LocationScoringService } from '@/services/locationScoringService';
import type { Event, SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';

// Sample career profile for testing
const sampleCareerProfile: CareerProfile = {
  userId: 'test-user-123',
  profileId: 'test-profile-123',
  lastUpdated: new Date().toISOString(),
  currentRole: 'Senior Software Engineer',
  seniority: 'senior',
  industry: 'Technology',
  companySize: 'medium',
  primarySkills: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL'],
  skillsToLearn: ['Kubernetes', 'Go', 'Machine Learning'],
  interests: ['AI', 'Cloud Architecture', 'DevOps'],
  careerGoals: ['skill-development', 'leadership-growth'],
  timeframe: 'medium-term',
  learningStyle: ['hands-on', 'interactive'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: ['find-peers', 'find-mentors'],
  preferredEventTypes: ['workshop', 'conference', 'meetup']
};

// Sample events
const events: Event[] = [
  {
    id: 'e1',
    title: 'Advanced Kubernetes Workshop for Senior Engineers',
    description: 'Hands-on workshop covering Kubernetes best practices for senior engineers.',
    startTime: '2025-11-01T10:00:00Z',
    endTime: '2025-11-01T17:00:00Z',
    location: 'Online',
    format: 'virtual',
    cost: 'paid',
    eventTypeId: '1'
  } as unknown as Event,
  {
    id: 'e2',
    title: 'React Conference 2025: Advanced Patterns',
    description: 'Interactive Q&A and deep dive into React patterns.',
    startTime: '2025-11-15T09:00:00Z',
    endTime: '2025-11-15T18:00:00Z',
    location: 'San Francisco, CA',
    format: 'in-person',
    cost: 'paid',
    eventTypeId: '2'
  } as unknown as Event,
  {
    id: 'e3',
    title: 'Introduction to Python for Beginners',
    description: 'Beginner-friendly Python bootcamp with hands-on projects.',
    startTime: '2025-12-01T10:00:00Z',
    endTime: '2025-12-01T15:00:00Z',
    location: 'Virtual',
    format: 'virtual',
    cost: 'free',
    eventTypeId: '3'
  } as unknown as Event
];

// Stub supabase client (not used by enrichment when strategy=server)
const supabaseStub = {} as unknown as SupabaseClientType;

describe('Alignment Core vs Enrichment parity', () => {
  let originalStrategy: string | undefined;

  beforeAll(() => {
    originalStrategy = process.env.DISCOVERY_SCORING;
    process.env.DISCOVERY_SCORING = 'server';
  });

  afterAll(() => {
    process.env.DISCOVERY_SCORING = originalStrategy;
  });

  it('enrichment overall = core score + tag affinity + location adjustment', async () => {
    // Enrichment deliberately layers two adjustments on top of the alignment core:
    //  - tag affinity: min(20, round(tagSimilarity * 0.2)), exposed in metadata
    //  - location: (locationScore - 0.8) * 10, e.g. +2 for virtual events
    // This test pins that exact relationship so any further drift between the
    // core and the enrichment path fails loudly instead of silently diverging.
    const LOCATION_NEUTRAL_SCORE = 0.8;

    const coreScores = events.map(e => calculateBaseScore(e, sampleCareerProfile).overall);

    const enriched = await enrichEventsWithCareerImpact(
      events,
      sampleCareerProfile,
      supabaseStub,
      'test-user'
    );

    expect(enriched.length).toBe(coreScores.length);

    enriched.forEach((enrichedEvent, idx) => {
      const careerImpact = enrichedEvent.careerImpact;
      expect(careerImpact).toBeDefined();

      const tagAffinityContribution = Number(careerImpact?.metadata?.tagAffinityContribution ?? 0);
      expect(tagAffinityContribution).toBeGreaterThanOrEqual(0);
      expect(tagAffinityContribution).toBeLessThanOrEqual(20);

      const locationAdjustment =
        (LocationScoringService.calculateLocationScore(events[idx]).score - LOCATION_NEUTRAL_SCORE) * 10;

      const expected = Math.max(
        0,
        Math.min(100, Math.min(100, coreScores[idx] + tagAffinityContribution) + locationAdjustment)
      );

      expect(careerImpact?.overall).toBe(expected);
    });
  });
});


