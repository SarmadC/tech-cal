import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateBaseScore } from '@/lib/recommendation/baseScorer';
import { enrichEventsWithCareerImpact } from '@/services/careerImpactEnrichmentService';
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

  it('enrichment overall scores match core scores for the same inputs', async () => {
    const coreScores = events.map(e => calculateBaseScore(e, sampleCareerProfile).overall);

    const enriched = await enrichEventsWithCareerImpact(
      events,
      sampleCareerProfile,
      supabaseStub,
      'test-user'
    );

    const enrichmentScores = enriched.map(e => e.careerImpact?.overall ?? 0);

    expect(enrichmentScores.length).toBe(coreScores.length);
    enrichmentScores.forEach((score, idx) => {
      const delta = Math.abs(score - coreScores[idx]);
      expect(delta).toBeLessThanOrEqual(2);
    });
  });
});


