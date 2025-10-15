import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateAlignment } from '@/lib/recommendation/alignmentCore';
import { enrichEventsWithCareerImpact } from '@/services/careerImpactEnrichmentService';
import type { Event } from '@/types';
import type { CareerProfile } from '@/types/career';

// Sample career profile for testing
const sampleCareerProfile: CareerProfile = {
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
  networkingGoals: ['technical-community', 'mentorship'],
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
    locationType: 'online',
    format: 'virtual',
    cost: 'paid',
    eventTypeId: '1'
  },
  {
    id: 'e2',
    title: 'React Conference 2025: Advanced Patterns',
    description: 'Interactive Q&A and deep dive into React patterns.',
    startTime: '2025-11-15T09:00:00Z',
    endTime: '2025-11-15T18:00:00Z',
    location: 'San Francisco, CA',
    locationType: 'in-person',
    format: 'in-person',
    cost: 'paid',
    eventTypeId: '2'
  },
  {
    id: 'e3',
    title: 'Introduction to Python for Beginners',
    description: 'Beginner-friendly Python bootcamp with hands-on projects.',
    startTime: '2025-12-01T10:00:00Z',
    endTime: '2025-12-01T15:00:00Z',
    location: 'Virtual',
    locationType: 'online',
    format: 'virtual',
    cost: 'free',
    eventTypeId: '3'
  }
];

// Stub supabase client (not used by enrichment when strategy=server)
const supabaseStub = {} as unknown;

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
    const coreScores = events.map(e => calculateAlignment(e, sampleCareerProfile).overall);

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


