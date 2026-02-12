import { describe, expect, it } from 'vitest';
import type { CareerImpactScore, Event } from '@/types';
import type { CareerProfile } from '@/utils/profileTypeGuards';
import { buildEvent } from '@/tests/factories/eventFactories';
import { buildDiscoverySections } from '../useDiscoverySections';

type EventWithImpact = Event & { careerImpact?: CareerImpactScore };

function buildEventWithImpact(params: {
  id: string;
  overall: number;
  matchedGoals?: string[];
  matchedSkills?: string[];
  attendeeCount?: number;
  startOffsetHours?: number;
  durationHours?: number;
}): EventWithImpact {
  const {
    id,
    overall,
    matchedGoals = [],
    matchedSkills = [],
    attendeeCount,
    startOffsetHours = 24,
    durationHours = 2,
  } = params;

  const start = new Date(Date.now() + startOffsetHours * 60 * 60 * 1000);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  const category: CareerImpactScore['explanation']['careerImpactCategory'] =
    overall >= 85 ? 'high' : overall >= 50 ? 'moderate' : 'low';

  return {
    ...buildEvent({
      id,
      title: `Event ${id}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      attendeeCount: attendeeCount ?? null,
    }),
    careerImpact: {
      overall,
      confidence: 1,
      components: {
        skillRelevance: 0,
        careerStageMatch: 0,
        networkingValue: 0,
        industryRelevance: 0,
        timingBonus: 0,
      },
      explanation: {
        reasons: ['test'],
        matchedSkills,
        matchedGoals,
        speakerHighlights: [],
        careerImpactCategory: category,
        confidenceFactors: [],
        alignmentReasons: [{ type: 'goal', reason: 'Goal match', contribution: 10 }],
      },
      metadata: {
        algorithmVersion: 'test',
        calculatedAt: new Date().toISOString(),
        careerProfileHash: 'test',
        eventDataHash: 'test',
      },
    },
  };
}

describe('buildDiscoverySections', () => {
  it('uses strict goal matching based on matchedGoals', () => {
    const profile: CareerProfile = {
      careerGoals: ['skill-development', 'networking'],
      skillsToLearn: [],
    };

    const events: EventWithImpact[] = [
      buildEventWithImpact({
        id: 'skill-only',
        overall: 95,
        matchedGoals: ['skill-development'],
      }),
      buildEventWithImpact({
        id: 'network-only',
        overall: 90,
        matchedGoals: ['networking'],
      }),
      buildEventWithImpact({
        id: 'shared',
        overall: 85,
        matchedGoals: ['skill-development', 'networking'],
      }),
    ];

    const sections = buildDiscoverySections({
      events,
      profile,
      heroEventIds: new Set<string>(),
    });

    const skillSection = sections.find(section => section.id === 'goal-skill-development');
    const networkSection = sections.find(section => section.id === 'goal-networking');

    expect(skillSection).toBeDefined();
    expect(networkSection).toBeDefined();

    const networkIds = new Set(networkSection?.events.map(event => event.id) ?? []);
    expect(networkIds.has('network-only')).toBe(true);
    expect(networkIds.has('skill-only')).toBe(false);
  });

  it('keeps sections mostly unique when enough unique events exist', () => {
    const events: EventWithImpact[] = [
      buildEventWithImpact({
        id: 'quick-1',
        overall: 95,
        attendeeCount: 800,
        startOffsetHours: 24,
        durationHours: 2,
      }),
      buildEventWithImpact({
        id: 'quick-2',
        overall: 90,
        attendeeCount: 700,
        startOffsetHours: 48,
        durationHours: 2,
      }),
      buildEventWithImpact({
        id: 'trending-1',
        overall: 80,
        attendeeCount: 600,
        startOffsetHours: 24 * 10,
        durationHours: 2,
      }),
      buildEventWithImpact({
        id: 'trending-2',
        overall: 78,
        attendeeCount: 500,
        startOffsetHours: 24 * 12,
        durationHours: 2,
      }),
      buildEventWithImpact({
        id: 'deep-1',
        overall: 88,
        attendeeCount: 0,
        startOffsetHours: 24 * 3,
        durationHours: 9,
      }),
      buildEventWithImpact({
        id: 'deep-2',
        overall: 84,
        attendeeCount: 0,
        startOffsetHours: 24 * 4,
        durationHours: 10,
      }),
    ];

    const sections = buildDiscoverySections({
      events,
      profile: null,
      heroEventIds: new Set<string>(),
    });

    const quickWins = sections.find(section => section.id === 'quick-wins');
    const trending = sections.find(section => section.id === 'trending');
    const deepDives = sections.find(section => section.id === 'deep-dives');

    expect(quickWins).toBeDefined();
    expect(trending).toBeDefined();
    expect(deepDives).toBeDefined();

    const quickIds = new Set(quickWins?.events.map(event => event.id) ?? []);
    const trendingIds = new Set(trending?.events.map(event => event.id) ?? []);
    const deepDiveIds = new Set(deepDives?.events.map(event => event.id) ?? []);

    expect([...quickIds].every(id => !trendingIds.has(id))).toBe(true);
    expect([...quickIds].every(id => !deepDiveIds.has(id))).toBe(true);
    expect([...trendingIds].every(id => !deepDiveIds.has(id))).toBe(true);
  });

  it('allows overlap only as fallback when a section has too few unique events', () => {
    const profile: CareerProfile = {
      careerGoals: ['skill-development', 'networking'],
      skillsToLearn: [],
    };

    const events: EventWithImpact[] = [
      buildEventWithImpact({
        id: 'shared-1',
        overall: 92,
        matchedGoals: ['skill-development', 'networking'],
      }),
      buildEventWithImpact({
        id: 'shared-2',
        overall: 88,
        matchedGoals: ['skill-development', 'networking'],
      }),
    ];

    const sections = buildDiscoverySections({
      events,
      profile,
      heroEventIds: new Set<string>(),
    });

    const firstGoal = sections.find(section => section.id === 'goal-skill-development');
    const secondGoal = sections.find(section => section.id === 'goal-networking');

    expect(firstGoal?.events.length).toBe(2);
    expect(secondGoal?.events.length).toBe(2);

    const firstGoalIds = new Set(firstGoal?.events.map(event => event.id) ?? []);
    const overlappingIds = (secondGoal?.events ?? []).filter(event => firstGoalIds.has(event.id));
    expect(overlappingIds.length).toBe(2);
  });
});
