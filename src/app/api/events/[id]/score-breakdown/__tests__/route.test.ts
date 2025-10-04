import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
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

vi.mock('@/services/scoring', () => ({
  ScoringStrategyFactory: {
    getDefaultStrategy: vi.fn(() => ({
      version: 'v2.0.0',
      calculate: vi.fn(() => ({
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

describe('GET /api/events/[id]/score-breakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when disabled in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalFlag = process.env.NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN;

    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    process.env.NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN = undefined;

    const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
    const params = Promise.resolve({ id: 'test-id' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error).toContain('development');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    process.env.NEXT_PUBLIC_ENABLE_SCORE_BREAKDOWN = originalFlag;
  });

  it('returns all 5 components and algorithmVersion', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
    const params = Promise.resolve({ id: 'test-id' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();

    // Verify all 5 components
    expect(data.data.components).toBeDefined();
    expect(data.data.components.skillRelevance).toBe(22.5);
    expect(data.data.components.careerStageMatch).toBe(18.75);
    expect(data.data.components.networkingValue).toBe(15);
    expect(data.data.components.industryRelevance).toBe(11.25);
    expect(data.data.components.timingBonus).toBe(7.5);

    // Verify algorithmVersion
    expect(data.data.algorithmVersion).toBe('v2.0.0');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('includes scoringTriggers from metadata', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
    const params = Promise.resolve({ id: 'test-id' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scoringTriggers).toEqual(['type_pref_gate', 'beginner_boost']);

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('caps scoringTriggers at 20 items', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    // Mock strategy with 25 triggers
    const mockTriggers = Array.from({ length: 25 }, (_, i) => `trigger_${i}`);
    vi.mocked(vi.importMock('@/services/scoring')).ScoringStrategyFactory.getDefaultStrategy.mockReturnValueOnce({
      version: 'v2.0.0',
      calculate: vi.fn(() => ({
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

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('returns top 1-2 reasons', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
    const params = Promise.resolve({ id: 'test-id' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.topReasons).toBeDefined();
    expect(data.data.topReasons.length).toBeLessThanOrEqual(2);

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('returns normalized event type', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
    const params = Promise.resolve({ id: 'test-id' });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.eventType).toBeDefined();
    expect(data.data.eventType).toHaveProperty('raw');
    expect(data.data.eventType).toHaveProperty('normalized');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });

  it('enforces rate limit (429)', async () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

    // Make 21 rapid requests (limit is 20 per minute)
    const request = new NextRequest('http://localhost/api/events/test-id/score-breakdown');
    const params = Promise.resolve({ id: 'test-id' });

    for (let i = 0; i < 20; i++) {
      await GET(request, { params });
    }

    // 21st request should be rate limited
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Too many');

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
  });
});
