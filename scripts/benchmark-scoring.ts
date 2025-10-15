/**
 * Performance benchmark for server-side scoring enrichment
 * Run with: npx tsx scripts/benchmark-scoring.ts
 */

import { enrichEventsWithCareerImpact } from '@/services/careerImpactEnrichmentService';
import { rerankWithBehavioral } from '@/services/recommendations/behavioralReranker';
import { calculateBaseScore } from '@/lib/recommendation/baseScorer';
import type { Event, EventWithCareerImpact } from '@/types';
import type { CareerProfile } from '@/types/career';

function makeEvents(n: number): Event[] {
  const base: Omit<Event, 'id'> = {
    title: 'Benchmark Event - Kubernetes workshop hands-on',
    description: 'Hands-on workshop for Kubernetes and DevOps best practices',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    endTime: new Date(Date.now() + 90000000).toISOString(),
    location: 'Online',
    locationType: 'online',
    format: 'virtual',
    cost: 'free',
    eventTypeId: '1'
  } as any;

  return Array.from({ length: n }).map((_, i) => ({ ...base, id: `bench-${i}` })) as Event[];
}

const profile: CareerProfile = {
  userId: 'bench-user',
  profileId: 'bench-profile',
  lastUpdated: new Date().toISOString(),
  currentRole: 'Senior Engineer',
  seniority: 'senior',
  industry: 'Technology',
  companySize: 'medium',
  primarySkills: ['React', 'TypeScript', 'Node.js'],
  skillsToLearn: ['Kubernetes', 'Go'],
  interests: ['DevOps'],
  careerGoals: ['skill-development'],
  timeframe: 'short-term',
  learningStyle: ['hands-on'],
  availableTime: 'moderate',
  budget: 'free-only',
  networkingGoals: [],
  preferredEventTypes: ['workshop']
};

async function run() {
  console.log('=== Core Enrichment Benchmark ===');
  const sizes = [10, 25, 50, 100];
  for (const n of sizes) {
    const events = makeEvents(n);
    const t0 = performance.now();
    await enrichEventsWithCareerImpact(events, profile, {} as any, 'bench');
    const t1 = performance.now();
    const ms = t1 - t0;
    console.log(`N=${n} → ${ms.toFixed(2)}ms (avg ${(ms / n).toFixed(2)}ms/event)`);
  }

  console.log('\n=== Advanced Reranker Benchmark ===');
  for (const { n, k } of [{ n: 10, k: 10 }, { n: 25, k: 25 }, { n: 50, k: 50 }]) {
    const events = makeEvents(n);
    const enriched: EventWithCareerImpact[] = events.map(e => {
      const core = calculateBaseScore(e, profile);
      return {
        ...e,
        careerImpact: {
          overall: core.overall,
          confidence: 1,
          components: core.components,
          explanation: { reasons: [], matchedSkills: [], speakerHighlights: [], careerImpactCategory: 'moderate' as const, confidenceFactors: [] },
          metadata: { algorithmVersion: 'v1', calculatedAt: new Date().toISOString(), careerProfileHash: '', eventDataHash: '' }
        },
        isCareerScored: true,
      };
    });
    const t0 = performance.now();
    await rerankWithBehavioral(enriched, profile, {} as any, { topK: k });
    const t1 = performance.now();
    console.log(`N=${n}, topK=${k} → ${(t1 - t0).toFixed(2)}ms`);
  }
}

run().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});


