import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
let currentUserId = 'test-user-id';
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: currentUserId } },
        error: null,
      })),
    },
  })),
}));

vi.mock('@/services/eventServices', () => ({
  EventService: {
    getEventById: vi.fn(() => ({
      id: 'test-event-id',
      title: 'Test Event',
      category: { name: 'Workshop' },
    })),
  },
}));

vi.mock('@/services/careerProfileService', () => ({
  CareerProfileService: {
    getCareerProfile: vi.fn(() => ({
      primarySkills: ['React', 'TypeScript'],
      skillsToLearn: ['Node.js'],
      seniority: 'mid-level',
    })),
  },
}));

const mockAlgorithmConfig = {
  version: 'v2.0.0',
  weights: {
    skillRelevance: 0.3,
    careerStageMatch: 0.25,
    networkingValue: 0.2,
    industryRelevance: 0.15,
    timingBonus: 0.1,
  },
  thresholds: {
    highImpact: 80,
    moderateImpact: 60,
    lowImpact: 40,
  },
  confidenceFactors: {
    dataCompleteness: 0.9,
    profileCompleteness: 0.85,
    eventDetailLevel: 0.8,
  },
} as const;

vi.mock('@/services/scoring', () => ({
  ScoringStrategyFactory: {
    getDefaultStrategy: vi.fn(() => ({
      version: 'v2.0.0',
      name: 'test-strategy',
      getConfig: vi.fn(() => mockAlgorithmConfig),
      canScore: vi.fn(() => true),
      calculate: vi.fn(async () => ({
        overall: 75,
        confidence: 0.85,
        components: {
          skillRelevance: 22.5,
          careerStageMatch: 18.75,
          networkingValue: 15,
          industryRelevance: 11.25,
          timingBonus: 7.5,
        },
        explanation: {
          reasons: ['Excellent skill development opportunity'],
          matchedSkills: ['React'],
          speakerHighlights: [],
          careerImpactCategory: 'moderate' as const,
          confidenceFactors: [],
        },
        metadata: {
          algorithmVersion: 'v2.0.0',
          calculatedAt: new Date().toISOString(),
          careerProfileHash: 'hash123',
          eventDataHash: 'hash456',
          scoringTriggers: ['type_pref_gate', 'beginner_boost'],
        },
      })),
    })),
  },
}));

const withEnv = async (
  overrides: Record<string, string | undefined>,
  testFn: () => Promise<void>,
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
    await testFn();
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

describe('GET /api/events/[id]/score-breakdown', () => {
  let userCounter = 0;
  beforeEach(() => {
    vi.clearAllMocks();
    userCounter += 1;
    currentUserId = `test-user-${userCounter}`;
  });

  it('returns 403 when disabled in production', async () => {
    await withEnv(
      {
        NODE_ENV: 'production',
        ENABLE_SCORE_BREAKDOWN: undefined,
      },
      async () => {
        const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
        const params = Promise.resolve({ id: 'test-id' });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.success).toBe(false);
        expect(data.error).toContain('development');
      },
    );
  });

  it('returns all 5 components and algorithmVersion', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        ENABLE_SCORE_BREAKDOWN: 'true',
      },
      async () => {
        const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
        const params = Promise.resolve({ id: 'test-id' });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data).toBeDefined();

        expect(data.data.components).toBeDefined();
        expect(data.data.components.skillRelevance).toBe(22.5);
        expect(data.data.components.careerStageMatch).toBe(18.75);
        expect(data.data.components.networkingValue).toBe(15);
        expect(data.data.components.industryRelevance).toBe(11.25);
        expect(data.data.components.timingBonus).toBe(7.5);
        expect(data.data.algorithmVersion).toBe('v2.0.0');
      },
    );
  });

  it('includes scoringTriggers from metadata', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        ENABLE_SCORE_BREAKDOWN: 'true',
      },
      async () => {
        const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
        const params = Promise.resolve({ id: 'test-id' });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.scoringTriggers).toEqual(['type_pref_gate', 'beginner_boost']);
      },
    );
  });

  it('caps scoringTriggers at 20 items', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        ENABLE_SCORE_BREAKDOWN: 'true',
      },
      async () => {
        const mockTriggers = Array.from({ length: 25 }, (_, i) => `trigger_${i}`);
        const scoringModule = await import('@/services/scoring');
        vi
          .mocked(scoringModule.ScoringStrategyFactory.getDefaultStrategy)
          .mockReturnValueOnce({
            version: 'v2.0.0',
            name: 'test-strategy',
            getConfig: vi.fn(() => mockAlgorithmConfig),
            canScore: vi.fn(() => true),
            calculate: vi.fn(async () => ({
              overall: 75,
              confidence: 0.85,
              components: {
                skillRelevance: 22.5,
                careerStageMatch: 18.75,
                networkingValue: 15,
                industryRelevance: 11.25,
                timingBonus: 7.5,
              },
        explanation: {
          reasons: ['Test reason'],
          matchedSkills: [],
          speakerHighlights: [],
          careerImpactCategory: 'moderate' as const,
          confidenceFactors: [],
        },
              metadata: {
                algorithmVersion: 'v2.0.0',
                calculatedAt: new Date().toISOString(),
                careerProfileHash: 'hash123',
                eventDataHash: 'hash456',
                scoringTriggers: mockTriggers,
              },
            })),
          });

        const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
        const params = Promise.resolve({ id: 'test-id' });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.scoringTriggers).toHaveLength(20);
        expect(data.data.scoringTriggers[0]).toBe('trigger_0');
        expect(data.data.scoringTriggers[19]).toBe('trigger_19');
      },
    );
  });

  it('returns top 1-2 reasons', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        ENABLE_SCORE_BREAKDOWN: 'true',
      },
      async () => {
        const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
        const params = Promise.resolve({ id: 'test-id' });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.topReasons).toBeDefined();
        expect(data.data.topReasons.length).toBeLessThanOrEqual(2);
      },
    );
  });

  it('returns normalized event type', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        ENABLE_SCORE_BREAKDOWN: 'true',
      },
      async () => {
        const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
        const params = Promise.resolve({ id: 'test-id' });
        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.eventType).toBeDefined();
        expect(data.data.eventType).toHaveProperty('raw');
        expect(data.data.eventType).toHaveProperty('normalized');
      },
    );
  });

  it('enforces rate limit (429)', async () => {
    await withEnv(
      {
        NODE_ENV: 'development',
        ENABLE_SCORE_BREAKDOWN: 'true',
      },
      async () => {
        const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
        const params = Promise.resolve({ id: 'test-id' });

        for (let i = 0; i < 20; i++) {
          await GET(request, { params });
        }

        const response = await GET(request, { params });
        const data = await response.json();

        expect(response.status).toBe(429);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Too many');
      },
    );
  });
});
