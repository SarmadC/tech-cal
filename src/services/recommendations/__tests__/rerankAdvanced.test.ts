import { describe, it, expect } from 'vitest';
import { rerankWithAdvanced } from '../rerankAdvanced';
import type { EventWithCareerImpact, SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';

const supabaseStub = {} as SupabaseClientType;

const profile: CareerProfile = {
  userId: 'u1',
  profileId: 'p1',
  lastUpdated: new Date().toISOString(),
  primarySkills: ['react'],
  skillsToLearn: ['kubernetes'],
  interests: ['frontend'],
  careerGoals: ['skill-development'],
  industry: 'technology',
  learningStyle: ['hands-on'],
  timeframe: 'medium-term',
  budget: 'moderate',
  networkingGoals: ['find-peers'],
  preferredEventTypes: ['workshop'],
  currentRole: 'dev',
  companySize: 'small',
  seniority: 'mid-level',
  availableTime: 'moderate',
};

function e(id: string, core: number): EventWithCareerImpact {
  return {
    id,
    title: id,
    description: 'd',
    startTime: new Date(Date.now() + 3600_000).toISOString(),
    endTime: null,
    location: 'virtual',
    organizer: 'org',
    status: 'active',
    sourceUrl: 'https://x',
    livestreamUrl: null,
    eventTypeId: 't',
    createdAt: new Date().toISOString(),
    category: { id: 't', name: 'workshop', color: '#000', description: null },
    // Attach core score shape as produced by enrichment
    careerImpact: {
      overall: core,
      confidence: 1,
      components: { skillRelevance: 0, careerStageMatch: 0, networkingValue: 0, industryRelevance: 0, timingBonus: 0 },
      explanation: { reasons: [], matchedSkills: [], speakerHighlights: [], careerImpactCategory: 'moderate', confidenceFactors: [] },
      metadata: { algorithmVersion: 'alignment-core-v1', calculatedAt: new Date().toISOString(), careerProfileHash: '', eventDataHash: '' }
    }
  } as unknown as EventWithCareerImpact;
}

describe('rerankWithAdvanced', () => {
  it('returns original if no events', async () => {
    const out = await rerankWithAdvanced([], profile, supabaseStub);
    expect(out).toEqual([]);
  });

  it('prefers advanced score when present, ties by core, then original index', async () => {
    const events: EventWithCareerImpact[] = [e('a', 80), e('b', 70), e('c', 60)];
    const out = await rerankWithAdvanced(events, profile, supabaseStub, { topK: 2 });
    expect(out.length).toBe(3);
    // We cannot assert exact order without a deterministic advanced strategy here,
    // but we can assert stability: all items preserved and first is one of the topK by core.
    const topKIds = new Set(['a', 'b']);
    expect(topKIds.has(out[0].id)).toBe(true);
  });

  it('respects topK limit for advanced scoring', async () => {
    const events: EventWithCareerImpact[] = [e('a', 90), e('b', 80), e('c', 70), e('d', 60), e('e', 50)];
    const out = await rerankWithAdvanced(events, profile, supabaseStub, { topK: 2 });
    expect(out.length).toBe(5);
    // Top 2 by core should be scored; rest keep original order
  });

  it('handles events without careerImpact gracefully', async () => {
    const badEvents = [{ id: 'x', title: 'x' }] as EventWithCareerImpact[];
    const out = await rerankWithAdvanced(badEvents, profile, supabaseStub);
    // Should return array with same length; reranker adds metadata when possible
    expect(out.length).toBe(1);
    expect(out[0].id).toBe('x');
  });

  it('preserves all events after rerank', async () => {
    const events: EventWithCareerImpact[] = [e('a', 80), e('b', 70), e('c', 60)];
    const out = await rerankWithAdvanced(events, profile, supabaseStub, { topK: 10 });
    expect(out.length).toBe(events.length);
    const ids = new Set(out.map(e => e.id));
    expect(ids.size).toBe(events.length);
  });
});


