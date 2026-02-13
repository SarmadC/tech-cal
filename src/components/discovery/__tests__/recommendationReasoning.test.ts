import { describe, expect, it } from 'vitest';
import type { AlignmentReason, CareerImpactScore, Event } from '@/types';
import { buildEvent } from '@/tests/factories/eventFactories';
import { buildRecommendationHighlights } from '../recommendationReasoning';

type CareerImpactOverrides =
  Omit<Partial<CareerImpactScore>, 'components' | 'explanation' | 'metadata'> & {
    components?: Partial<CareerImpactScore['components']>;
    explanation?: Partial<CareerImpactScore['explanation']>;
    metadata?: Partial<CareerImpactScore['metadata']>;
  };

function buildCareerImpact(overrides: CareerImpactOverrides = {}): CareerImpactScore {
  const {
    components: componentOverrides,
    explanation: explanationOverrides,
    metadata: metadataOverrides,
    ...scalarOverrides
  } = overrides;

  const defaultAlignmentReasons: AlignmentReason[] = [
    { type: 'skill', reason: 'Learn Python', contribution: 25 },
    { type: 'goal', reason: 'Build in-demand skills', contribution: 18 },
    { type: 'learning-style', reason: 'Hands-on workshop format', contribution: 8 },
  ];

  const explanation: CareerImpactScore['explanation'] = {
    reasons: ['Learn Python', 'Advance Python skills', 'Build in-demand skills'],
    matchedSkills: ['Python', 'FastAPI'],
    matchedGoals: ['skill-development'],
    speakerHighlights: [],
    careerImpactCategory: 'high' as const,
    confidenceFactors: [],
    alignmentReasons: defaultAlignmentReasons,
    ...explanationOverrides,
  };

  return {
    overall: scalarOverrides.overall ?? 86,
    confidence: scalarOverrides.confidence ?? 1,
    components: {
      skillRelevance: 40,
      careerStageMatch: 18,
      networkingValue: 0,
      industryRelevance: 0,
      timingBonus: 0,
      ...componentOverrides,
    },
    explanation,
    metadata: {
      algorithmVersion: 'test',
      calculatedAt: new Date().toISOString(),
      careerProfileHash: 'test',
      eventDataHash: 'test',
      ...metadataOverrides,
    },
    ...scalarOverrides,
  };
}

describe('buildRecommendationHighlights', () => {
  it('builds explicit and non-generic top-pick reasons', () => {
    const careerImpact = buildCareerImpact({
      explanation: {
        matchedSkills: ['Python', 'FastAPI'],
        matchedGoals: ['skill-development'],
        alignmentReasons: [
          { type: 'skill', reason: 'Learn Python', contribution: 25 },
          { type: 'skill', reason: 'Advance Python skills', contribution: 15 },
          { type: 'goal', reason: 'Build in-demand skills', contribution: 18 },
          { type: 'learning-style', reason: 'Hands-on workshop format', contribution: 8 },
        ],
      },
    });

    const highlights = buildRecommendationHighlights({
      careerImpact,
      event: { attendeeCount: 320 },
      maxItems: 3,
    });

    expect(highlights.length).toBe(3);
    expect(highlights[0]).toContain('Skill match');
    expect(highlights[0]).toContain('Python');
    expect(highlights[1]).toContain('Goal fit');
    expect(highlights[1]).toContain('Practical skill-building content');
    expect(highlights.some((line) => line.includes('Learning fit'))).toBe(true);
    expect(highlights.some((line) => line.includes('Build in-demand skills'))).toBe(false);
    expect(highlights.some((line) => line.includes('(+'))).toBe(false);
    expect(highlights.filter((line) => line.startsWith('Skill match')).length).toBe(1);
  });

  it('uses attendee evidence for networking highlights', () => {
    const event: Event = buildEvent({
      attendeeCount: 1250,
    });

    const careerImpact = buildCareerImpact({
      explanation: {
        matchedSkills: ['GraphQL'],
        matchedGoals: [],
        alignmentReasons: [
          { type: 'skill', reason: 'Learn GraphQL', contribution: 25 },
          { type: 'networking', reason: 'High-value community access', contribution: 15 },
        ],
      },
    });

    const highlights = buildRecommendationHighlights({
      careerImpact,
      event,
      maxItems: 3,
    });

    const networkingLine = highlights.find((line) => line.includes('Networking value'));
    expect(networkingLine).toBeTruthy();
    expect(networkingLine).toContain('attendees');
  });

  it('uses alignment reasons when matched goals/skills are missing', () => {
    const careerImpact = buildCareerImpact({
      explanation: {
        matchedSkills: [],
        matchedGoals: [],
        alignmentReasons: [
          { type: 'skill', reason: 'Learn Rust', contribution: 24 },
          { type: 'goal', reason: 'Support your role transition', contribution: 16 },
        ],
      },
    });

    const highlights = buildRecommendationHighlights({
      careerImpact,
      maxItems: 3,
    });

    expect(highlights.some((line) => line.startsWith('Skill match:'))).toBe(true);
    expect(highlights.some((line) => line.startsWith('Goal fit:'))).toBe(true);
  });
});
