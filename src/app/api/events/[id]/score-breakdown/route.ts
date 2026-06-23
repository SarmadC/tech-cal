import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { CareerProfileService } from '@/services/careerProfileService';
import { enrichEventsWithCareerImpact } from '@/services/careerImpactEnrichmentService';
import { normalizeEventType } from '@/utils/eventTypeUtils';

interface ScoreBreakdownResponse {
  success: boolean;
  data?: {
    eventId: string;
    eventTitle: string;
    eventType: {
      raw: string | null;
      normalized: string | null;
    };
    overall: number;
    confidence: number;
    components: {
      skillRelevance: number;
      careerStageMatch: number;
      networkingValue: number;
      industryRelevance: number;
      timingBonus: number;
    };
    scoringTriggers: string[];
    topReasons: string[];
    algorithmVersion: string;
  };
  error?: string;
}

// Simple in-memory rate limiter for dev debugging
const debugRateLimiter = new Map<string, { count: number; resetAt: number }>();

function pruneExpiredRateLimits(now: number): void {
  for (const [key, value] of debugRateLimiter) {
    if (now > value.resetAt) {
      debugRateLimiter.delete(key);
    }
  }
}

function checkDebugRateLimit(userId: string): boolean {
  const now = Date.now();
  // Opportunistic cleanup avoids import-time background timers in dev/HMR.
  pruneExpiredRateLimits(now);
  const key = `debug-${userId}`;
  const limit = debugRateLimiter.get(key);

  if (!limit || now > limit.resetAt) {
    debugRateLimiter.set(key, { count: 1, resetAt: now + 60000 }); // 1 minute window
    return true;
  }

  if (limit.count >= 20) { // Max 20 requests per minute
    return false;
  }

  limit.count++;
  return true;
}

/**
 * GET /api/events/[id]/score-breakdown
 * Dev-only endpoint for debugging career impact scores
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Dev-only guard (server-side env only) — never allow in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Score breakdown only available in development' },
      { status: 403 }
    );
  }

  try {
    const supabase = await createClient();
    const { id: eventId } = await params;

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check rate limit
    if (!checkDebugRateLimit(user.id)) {
      return NextResponse.json(
        { success: false, error: 'Too many debug requests. Please wait a minute.' },
        { status: 429 }
      );
    }

    // Fetch event
    const event = await EventService.getEventById(eventId, supabase);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Fetch user's career profile
    const careerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);
    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found' },
        { status: 404 }
      );
    }

    // Score through the same enrichment path production uses, so the breakdown
    // reflects what users actually see. The previous AdvancedScorer call here
    // reported numbers from an algorithm that doesn't run in production ranking.
    const [enriched] = await enrichEventsWithCareerImpact(
      [event],
      careerProfile,
      supabase,
      undefined // no userId: bypass the KV cache for a fresh calculation
    );
    const score = enriched?.careerImpact;
    if (!score) {
      return NextResponse.json(
        { success: false, error: 'Failed to score event' },
        { status: 500 }
      );
    }

    // Extract triggers from metadata and cap at 20
    const scoringTriggers = ((score.metadata?.scoringTriggers as string[] | undefined) || []).slice(0, 20);

    // Get top 1-2 reasons
    const topReasons = (score.explanation?.reasons || []).slice(0, 2);

    // Normalize event type
    const rawType = event.category?.name || null;
    const normalizedType = rawType ? normalizeEventType(rawType) : null;

    const response: ScoreBreakdownResponse = {
      success: true,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        eventType: {
          raw: rawType,
          normalized: normalizedType,
        },
        overall: score.overall,
        confidence: score.confidence,
        components: {
          skillRelevance: typeof score.components === 'object' && 'skillRelevance' in score.components
            ? (score.components.skillRelevance as number)
            : 0,
          careerStageMatch: typeof score.components === 'object' && 'careerStageMatch' in score.components
            ? (score.components.careerStageMatch as number)
            : 0,
          networkingValue: typeof score.components === 'object' && 'networkingValue' in score.components
            ? (score.components.networkingValue as number)
            : 0,
          industryRelevance: typeof score.components === 'object' && 'industryRelevance' in score.components
            ? (score.components.industryRelevance as number)
            : 0,
          timingBonus: typeof score.components === 'object' && 'timingBonus' in score.components
            ? (score.components.timingBonus as number)
            : 0,
        },
        scoringTriggers,
        topReasons,
        algorithmVersion: String(score.metadata?.algorithmVersion ?? 'alignment-core-v2'),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Score breakdown error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate score breakdown' },
      { status: 500 }
    );
  }
}
