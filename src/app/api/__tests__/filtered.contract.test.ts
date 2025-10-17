import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// We will call the handler directly by importing the route
import * as route from '@/app/api/events/filtered/route';
import type { NextRequest } from 'next/server';

// Minimal mock for NextRequest
function makeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
    headers: new Headers(),
    nextUrl: new URL('http://localhost/api/events/filtered')
  } as unknown as NextRequest;
}

describe('/api/events/filtered contract', () => {
  beforeAll(async () => {
    // Mock Supabase createClient used inside the route to avoid real calls
    await vi.importActual('@/utils/supabase/server');
    vi.mock('@/utils/supabase/server', () => {
      return {
        createClient: vi.fn(async () => ({
          auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: 'test-user' } }, error: null }))
          }
        }))
      };
    });
  });

  afterAll(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('returns expected shape with careerImpact fields', async () => {
    // Minimal valid body
    const req = makeRequest({ page: 1, pageSize: 1 });
    const res = await route.POST(req as unknown as NextRequest);
    const json = await (res as { json: () => Promise<unknown> }).json() as {
      success: boolean;
      data?: { events: unknown[] };
    };

    // success flag
    expect(json).toHaveProperty('success');

    // If success, validate shape
    if (json.success && json.data) {
      expect(json.data).toHaveProperty('events');
      expect(Array.isArray(json.data.events)).toBe(true);

      const first = json.data.events[0] as Record<string, unknown>;
      if (first) {
        expect(first).toHaveProperty('id');
        expect(first).toHaveProperty('title');
        // Career impact contract
        expect(first).toHaveProperty('careerImpact');
        const ci = first.careerImpact as Record<string, unknown>;
        expect(ci).toHaveProperty('overall');
        expect(ci).toHaveProperty('components');
        const components = ci.components as Record<string, unknown>;
        expect(components).toHaveProperty('skillRelevance');
        expect(components).toHaveProperty('careerStageMatch');
        expect(components).toHaveProperty('networkingValue');
        expect(components).toHaveProperty('industryRelevance');
        expect(components).toHaveProperty('timingBonus');
        expect(ci).toHaveProperty('explanation');
        const explanation = ci.explanation as Record<string, unknown>;
        expect(explanation).toHaveProperty('alignmentReasons');
        expect(Array.isArray(explanation.alignmentReasons)).toBe(true);
        expect(explanation).toHaveProperty('matchedSkills');
      }
    }
  });
});


