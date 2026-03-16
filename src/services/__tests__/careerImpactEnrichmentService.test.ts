import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event, SupabaseClientType } from '@/types';
import type { CareerProfile } from '@/types/career';

const { mockLegacyEnrich, mockRerankWithBehavioral } = vi.hoisted(() => ({
  mockLegacyEnrich: vi.fn(),
  mockRerankWithBehavioral: vi.fn(async (events: Event[]) => events)
}));

vi.mock('@/services/enhancedScoringService', () => ({
  EnhancedScoringService: {
    enrichEventsWithScores: mockLegacyEnrich
  }
}));

vi.mock('@/services/recommendations/behavioralReranker', () => ({
  rerankWithBehavioral: mockRerankWithBehavioral
}));

import { enrichEventsWithCareerImpact } from '../careerImpactEnrichmentService';

const profile: CareerProfile = {
  userId: 'u1',
  profileId: 'p1',
  lastUpdated: new Date().toISOString(),
  currentRole: 'Frontend Engineer',
  seniority: 'mid-level',
  industry: 'technology',
  companySize: 'medium',
  primarySkills: ['React'],
  skillsToLearn: ['TypeScript'],
  interests: ['web performance'],
  careerGoals: ['skill-development'],
  timeframe: 'medium-term',
  learningStyle: ['hands-on'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: ['find-peers'],
  preferredEventTypes: ['workshop']
};

const event: Event = {
  id: 'event-1',
  title: 'React Workshop',
  description: 'Hands-on React workshop',
  startTime: new Date(Date.now() + 86400000).toISOString(),
  endTime: null,
  location: 'Online',
  eventTypeId: 'workshop',
  organizer: 'Kure',
  status: 'active',
  sourceUrl: 'https://example.com/event-1',
  livestreamUrl: 'https://example.com/live',
  createdAt: new Date().toISOString(),
  category: {
    id: 'workshop',
    name: 'Workshop',
    color: '#000000',
    description: null
  },
  tags: []
};

const withEnv = async (
  overrides: Record<string, string | undefined>,
  run: () => Promise<void>
) => {
  const env = process.env as Record<string, string | undefined>;
  const previous: Record<string, string | undefined> = {};

  Object.entries(overrides).forEach(([key, value]) => {
    previous[key] = env[key];
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  });

  try {
    await run();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    });
  }
};

describe('careerImpactEnrichmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLegacyEnrich.mockResolvedValue([
      {
        ...event,
        careerImpact: {
          overall: 72,
          confidence: 0.9,
          components: {
            skillRelevance: 20,
            careerStageMatch: 15,
            networkingValue: 10,
            industryRelevance: 12,
            timingBonus: 15,
          },
          explanation: {
            reasons: ['Legacy scorer result'],
            matchedSkills: ['React'],
            speakerHighlights: [],
            careerImpactCategory: 'moderate',
            confidenceFactors: []
          },
          metadata: {
            algorithmVersion: 'v2.0.0'
          }
        }
      }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses legacy scoring path when DISCOVERY_SCORING=legacy', async () => {
    await withEnv(
      {
        DISCOVERY_SCORING: 'legacy',
        DISCOVERY_RERANK: 'off',
      },
      async () => {
        const enriched = await enrichEventsWithCareerImpact(
          [event],
          profile,
          {} as SupabaseClientType
        );

        expect(mockLegacyEnrich).toHaveBeenCalledTimes(1);
        expect(enriched).toHaveLength(1);
        expect(enriched[0].careerImpact?.metadata?.algorithmVersion).toBe('v2.0.0');
      }
    );
  });

  it('does not apply rerank when allowRerank is false', async () => {
    await withEnv(
      {
        DISCOVERY_SCORING: 'server',
        DISCOVERY_RERANK: 'advanced',
      },
      async () => {
        await enrichEventsWithCareerImpact(
          [event],
          profile,
          {} as SupabaseClientType,
          undefined,
          undefined,
          { allowRerank: false }
        );

        expect(mockRerankWithBehavioral).not.toHaveBeenCalled();
      }
    );
  });

  it('applies rerank when allowRerank is true', async () => {
    await withEnv(
      {
        DISCOVERY_SCORING: 'server',
        DISCOVERY_RERANK: 'advanced',
      },
      async () => {
        await enrichEventsWithCareerImpact(
          [event],
          profile,
          {} as SupabaseClientType,
          undefined,
          undefined,
          { allowRerank: true }
        );

        expect(mockRerankWithBehavioral).toHaveBeenCalledTimes(1);
      }
    );
  });

  it('folds tag affinity into the canonical career impact score for design events', async () => {
    const designProfile: CareerProfile = {
      userId: 'u-design',
      profileId: 'p-design',
      lastUpdated: new Date().toISOString(),
      currentRole: 'UX Designer',
      seniority: 'junior',
      industry: 'technology',
      companySize: 'medium',
      primarySkills: ['Figma', 'Prototyping', 'Wireframing'],
      skillsToLearn: ['Framer', 'Information Architecture'],
      interests: ['UI/UX Design'],
      careerGoals: ['skill-development', 'networking'],
      timeframe: 'short-term',
      learningStyle: ['hands-on', 'networking'],
      availableTime: 'moderate',
      budget: 'moderate',
      networkingGoals: ['find-peers', 'find-mentors'],
      preferredEventTypes: ['conference', 'meetup']
    };

    const figmaEvent: Event = {
      ...event,
      id: 'config-2026',
      title: 'Figma Config 2026',
      description: 'Annual Figma conference for designers and builders.',
      organizer: 'Figma',
      organization: {
        id: 'org-figma',
        name: 'Figma',
      },
      eventTypeId: 'conference',
      category: {
        id: 'conference',
        name: 'Conference',
        color: '#000000',
        description: null
      },
      tags: [
        { id: 'tag-1', name: 'Figma', color: '#000000', category: 'Tools' },
        { id: 'tag-2', name: 'Wireframing', color: '#000000', category: 'Design' },
        { id: 'tag-3', name: 'UI/UX Design', color: '#000000', category: 'Design' },
      ],
      agenda: [
        {
          id: 'agenda-1',
          title: 'Hands-on prototyping workshop',
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 90000000).toISOString(),
          type: 'workshop',
          description: 'Build better design systems and network with peers.'
        }
      ]
    };

    await withEnv(
      {
        DISCOVERY_SCORING: 'server',
        DISCOVERY_RERANK: 'off',
      },
      async () => {
        const enriched = await enrichEventsWithCareerImpact(
          [figmaEvent],
          designProfile,
          {} as SupabaseClientType
        );

        expect(enriched[0].careerImpact?.overall).toBeGreaterThanOrEqual(50);
        expect(enriched[0].careerImpact?.metadata?.algorithmVersion).toBe('alignment-core-v2');
        expect(enriched[0].careerImpact?.metadata?.tagAffinityContribution).toBeGreaterThan(0);
        expect(enriched[0].careerImpact?.explanation?.matchedTags).toContain('Figma');
      }
    );
  });
});
