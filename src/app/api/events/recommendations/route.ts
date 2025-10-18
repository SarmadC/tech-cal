import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/utils/supabase/server';
import { EventService } from '@/services/eventServices';
import { CareerProfileService } from '@/services/careerProfileService';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { Event } from '@/types';
import { logTelemetryEvent } from '@/utils/supabase/telemetry';

// Rate limiter for recommendations
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute per user
  analytics: true,
  prefix: 'event-recommendations',
});

interface RecommendationResponse {
  success: boolean;
  data?: {
    events: Event[];
    total: number;
    matchedTags: string[];
    processingTimeMs: number;
  };
  error?: string;
}

type RecommendationMetadata = {
  matchedTags: string[];
  matchExplanation?: string;
  matchScore: number;
  impactScore: number;
  profileBoost: number;
  recencyBoost: number;
  popularityBoost: number;
  totalScore: number;
  reasons: string[];
  tagRank?: number;
  [key: string]: unknown;
};

/**
 * GET /api/events/recommendations
 * Get tag-based recommended events for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<RecommendationResponse>> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Apply rate limiting
    const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
    if (!rateLimitSuccess) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const sessionId = searchParams.get('sessionId');
    const requestId = request.headers.get('x-request-id') || randomUUID();

    const startTime = Date.now();

    // Get user profile and career profile
    const userProfile = await CareerProfileService.getUserProfile(user.id, supabase);
    const careerProfile = await CareerProfileService.getCareerProfile(userProfile.id, supabase);

    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found. Please complete career onboarding.' },
        { status: 404 }
      );
    }

    const { data: consentRow } = await supabase
      .from('profiles')
      .select('analytics_consent')
      .eq('id', user.id)
      .single();
    const hasTelemetryConsent = Boolean(consentRow?.analytics_consent);

    let events: Event[] = [];
    let matchedTags: string[] = [];

    if (tags.length > 0) {
      // Search by specific tags
      events = await EventService.searchEventsByTags(tags, supabase, limit);
      matchedTags = tags;
    } else {
      // Get tag-based recommendations
      events = await EventService.getRecommendedEventsByTags(
        user.id,
        careerProfile,
        supabase,
        limit
      );

      if (events.length > 0) {
        const recommendationMetadataMap = new Map<string, RecommendationMetadata>();
        const originalOrderMap = new Map<string, { index: number; tagScore: number }>();
        events.forEach((event, index) => {
          const metadata = (event as { recommendationMetadata?: RecommendationMetadata }).recommendationMetadata;
          if (metadata) {
            recommendationMetadataMap.set(event.id, { ...metadata });
            originalOrderMap.set(event.id, { index, tagScore: metadata.totalScore ?? 0 });
          }
        });

        try {
          const enrichedEvents = await EventService.enrichEventsWithCareerImpact(
            events,
            careerProfile,
            supabase,
            user.id,
            true
          );

          const rankShiftSamples: Array<{ id: string; from: number; to: number; delta: number; tagScore: number; alignmentScore: number | null }> = [];

          events = enrichedEvents.map((event, index) => {
            const eventWithImpact = event as EventWithCareerImpact;
            const metadata = recommendationMetadataMap.get(event.id);
            const original = originalOrderMap.get(event.id);

            if (metadata) {
              const alignmentScore = eventWithImpact.careerImpact?.overall ?? null;
              const alignmentComponents = eventWithImpact.careerImpact?.components ?? null;
              const strategyVersion = eventWithImpact.careerImpact?.metadata?.algorithmVersion ?? 'alignment-core-v1';

              const updatedMetadata: RecommendationMetadata = {
                ...metadata,
                alignmentScore,
                alignmentConfidence: eventWithImpact.careerImpact?.confidence ?? null,
                alignmentComponents,
                alignmentStrategyVersion: strategyVersion,
                alignmentExplanation: eventWithImpact.careerImpact?.explanation?.reasons ?? [],
                alignmentRank: index + 1
              };

              if (original) {
                const delta = original.index - index;
                updatedMetadata.rankDelta = delta;
                if (delta !== 0) {
                  rankShiftSamples.push({
                    id: event.id,
                    from: original.index,
                    to: index,
                    delta,
                    tagScore: original.tagScore,
                    alignmentScore
                  });
                }
              }

              recommendationMetadataMap.set(event.id, updatedMetadata);
              return { ...event, recommendationMetadata: updatedMetadata } as Event;
            }

            return event;
          });

          if (rankShiftSamples.length > 0) {
            console.info('[Recommendations] Alignment vs tag ranking shifts', {
              userId: user.id,
              sample: rankShiftSamples.slice(0, 5)
            });
          }
        } catch (enrichmentError) {
          console.warn('Failed to enrich personalized recommendations with alignment core:', enrichmentError);
        }
      }
      
      // Extract matched tags from events
      const allTags = events.flatMap(event => event.tags?.map((tag) => tag.name) || []);
      matchedTags = [...new Set(allTags)];
    }

    const processingTime = Date.now() - startTime;

    if (hasTelemetryConsent) {
      const recommendationSummary = events.slice(0, 10).map((event, index) => {
        const metadata = (event as { recommendationMetadata?: RecommendationMetadata }).recommendationMetadata;
        const alignment = (event as EventWithCareerImpact).careerImpact;
        return {
          eventId: event.id,
          position: index + 1,
          matchedTags: metadata?.matchedTags ?? [],
          totalScore: metadata?.totalScore ?? null,
          tagRank: metadata?.tagRank ?? null,
          alignmentScore: alignment?.overall ?? null,
          alignmentConfidence: alignment?.confidence ?? null
        };
      });

      await logTelemetryEvent(supabase, {
        eventType: 'recommendation_batch_generated',
        eventVersion: 1,
        source: 'backend',
        userId: user.id,
        sessionId: sessionId || null,
        requestId,
        occurredAt: new Date(),
        context: {
          surface: 'recommendations_api',
          mode: tags.length > 0 ? 'tag-search' : 'tag-recommendation',
          limit
        },
        metadata: {
          returnedCount: events.length,
          processingTimeMs: processingTime,
          matchedTags,
          recommendationSummary,
          recommendationIds: events.map(event => event.id),
          enrichmentAttempted: tags.length === 0,
          topReasons: events.slice(0, 5).flatMap(event => {
            const metadata = (event as { recommendationMetadata?: RecommendationMetadata }).recommendationMetadata;
            return metadata?.reasons ?? [];
          }).slice(0, 10)
        }
      });
    }

    const response: RecommendationResponse = {
      success: true,
      data: {
        events,
        total: events.length,
        matchedTags,
        processingTimeMs: processingTime
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Event recommendations API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
type EventWithCareerImpact = Event & {
  careerImpact?: {
    overall?: number | null;
    confidence?: number | null;
    components?: unknown;
    explanation?: { reasons?: string[] };
    metadata?: { algorithmVersion?: string };
  };
};
