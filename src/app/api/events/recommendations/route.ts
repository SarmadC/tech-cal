import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getApiAuthContext } from '@/lib/apiAuth';
import { CareerProfileService } from '@/services/careerProfileService';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { Event, EventWithCareerImpact, RecommendationCandidateSource, RecommendationMetadata } from '@/types';
import { logTelemetryEvent } from '@/utils/supabase/telemetry';
import {
  rankEventsWithRecommendationPipeline as rankEventsWithCanonicalPipeline,
  fetchPersonalizedRecommendationCandidates,
} from '@/services/recommendations/recommendationPipeline';
import { UserLocation } from '@/services/locationScoringService';
import { extractCityFromLocation, extractCountryFromLocation } from '@/utils/locationUtils';

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

const DEFAULT_MATCHING_TELEMETRY_SAMPLE_RATE = 0.01; // 1%

function getMatchingTelemetrySampleRate(): number {
  const raw = process.env.MATCHING_TELEMETRY_SAMPLE_RATE;
  if (!raw) return DEFAULT_MATCHING_TELEMETRY_SAMPLE_RATE;

  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_MATCHING_TELEMETRY_SAMPLE_RATE;
  return Math.min(1, Math.max(0, parsed));
}

function isSampledForMatchingTelemetry(userId: string, sampleRate: number): boolean {
  if (sampleRate <= 0) return false;
  if (sampleRate >= 1) return true;

  const hash = createHash('sha1').update(userId).digest('hex');
  const bucket = Number.parseInt(hash.slice(0, 8), 16) % 10000;
  return bucket < Math.floor(sampleRate * 10000);
}

/**
 * GET /api/events/recommendations
 * Get tag-based recommended events for the authenticated user
 */
export async function GET(request: NextRequest): Promise<NextResponse<RecommendationResponse>> {
  try {
    const { supabase, user } = await getApiAuthContext(request);
    if (!user) {
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
    const rawLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
    if (Number.isNaN(rawLimit) || rawLimit <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid limit. Must be a positive integer.' },
        { status: 400 }
      );
    }
    const limit = Math.min(rawLimit, 50);
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const sessionId = searchParams.get('sessionId');
    const requestId = request.headers.get('x-request-id') || randomUUID();

    // Log API request for debugging
    console.info('[Recommendations API] Request received', {
      userId: user.id,
      requestId,
      timestamp: new Date().toISOString(),
      url: request.url,
      limit,
      tagsCount: tags.length
    });

    const startTime = Date.now();

    // Get career profile
    const careerProfile = await CareerProfileService.getCareerProfile(user.id, supabase);

    if (!careerProfile) {
      return NextResponse.json(
        { success: false, error: 'Career profile not found. Please complete career onboarding.' },
        { status: 404 }
      );
    }

    // Fetch user's joined circles to inject into their matching interests
    // This gives them an immediate personalization boost for events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: circleMembers } = await (supabase as any)
      .from('circle_members')
      .select(`
        circles (
          name,
          slug
        )
      `)
      .eq('user_id', user.id);

    // Explicitly cast the query result since Supabase types nested joins as Arrays or Singletons
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const joinedCircleNames = (circleMembers as any[])?.flatMap(cm => [cm.circles?.name, cm.circles?.slug]).filter(Boolean) || [];

    // Merge circle names into interests without mutating the original object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedCareerProfile = joinedCircleNames.length > 0
      ? {
          ...careerProfile,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          interests: Array.from(new Set([...((careerProfile as any).interests || []), ...joinedCircleNames])),
        }
      : careerProfile;

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('analytics_consent, preferences, timezone, location')
      .eq('id', user.id)
      .single();
    const hasTelemetryConsent = Boolean(profileRow?.analytics_consent);
    const preferences = profileRow?.preferences as Record<string, unknown> | null;
    const profileLocation = preferences?.location as Record<string, string> | null;
    const userLocation: UserLocation | null = profileRow
      ? {
          city: profileLocation?.city || (profileRow.location ? extractCityFromLocation(profileRow.location) : undefined),
          country: profileLocation?.country || (profileRow.location ? extractCountryFromLocation(profileRow.location) : undefined),
          timezone: profileRow.timezone || request.headers.get('x-timezone') || undefined,
        }
      : null;

    let events: Event[] = [];
    let matchedTags: string[] = [];
    let tau: number | null = null;
    let divergenceCount: number | null = null;
    let candidateSources = new Map<string, RecommendationCandidateSource[]>();

    if (tags.length > 0) {
      const personalizedCandidates = await fetchPersonalizedRecommendationCandidates({
        supabaseClient: supabase,
        userId: user.id,
        careerProfile: enrichedCareerProfile,
        limit,
        tags,
      });

      events = personalizedCandidates.events;
      matchedTags = personalizedCandidates.matchedTags;
      candidateSources = personalizedCandidates.candidateSources;

      if (events.length > 0) {
        try {
          events = await rankEventsWithCanonicalPipeline({
            events,
            careerProfile: enrichedCareerProfile,
            supabaseClient: supabase,
            userId: user.id,
            userLocation,
            applyDiversityEnhancement: false,
            allowRerank: false,
            sortByCareerImpact: true,
            careerImpactSortDirection: 'desc',
            candidateSources
          });
        } catch (enrichmentError) {
          console.warn('Failed to enrich tag-search recommendations with canonical ranking:', enrichmentError);
        }
      }
    } else {
      const personalizedCandidates = await fetchPersonalizedRecommendationCandidates({
        supabaseClient: supabase,
        userId: user.id,
        careerProfile: enrichedCareerProfile,
        limit,
      });

      events = personalizedCandidates.events;
      candidateSources = personalizedCandidates.candidateSources;

      if (events.length > 0) {
        const matchingTelemetryEnabled = process.env.MATCHING_TELEMETRY_ENABLED === 'true';
        const matchingTelemetrySampleRate = getMatchingTelemetrySampleRate();
        const matchingTelemetrySampled =
          matchingTelemetryEnabled &&
          hasTelemetryConsent &&
          isSampledForMatchingTelemetry(user.id, matchingTelemetrySampleRate);
        const recommendationMetadataMap = new Map<string, RecommendationMetadata>();
        const originalOrderMap = new Map<string, { index: number }>();
        events.forEach((event, index) => {
          const metadata = (event as { recommendationMetadata?: RecommendationMetadata }).recommendationMetadata;
          if (metadata) {
            recommendationMetadataMap.set(event.id, { ...metadata });
            originalOrderMap.set(event.id, { index });
          }
        });

        try {
          const tagRankedEvents = events;
          const enrichedEvents = await rankEventsWithCanonicalPipeline({
            events: tagRankedEvents,
            careerProfile: enrichedCareerProfile,
            supabaseClient: supabase,
            userId: user.id,
            userLocation,
            applyDiversityEnhancement: true,
            allowRerank: true,
            sortByCareerImpact: true,
            careerImpactSortDirection: 'desc',
            candidateSources
          });

          events = enrichedEvents.map((event, index) => {
            const eventWithImpact = event as EventWithCareerImpact;
            const metadata = recommendationMetadataMap.get(event.id);

            if (metadata) {
              const alignmentScore = eventWithImpact.careerImpact?.overall ?? null;
              const alignmentComponents = eventWithImpact.careerImpact?.components ?? null;
              const strategyVersion = eventWithImpact.careerImpact?.metadata?.algorithmVersion ?? 'alignment-core-v2';
              const updatedMetadata: RecommendationMetadata = {
                ...metadata,
                alignmentScore,
                alignmentConfidence: eventWithImpact.careerImpact?.confidence ?? null,
                alignmentComponents,
                alignmentStrategyVersion: strategyVersion,
                alignmentExplanation: eventWithImpact.careerImpact?.explanation?.reasons ?? [],
                alignmentRank: index + 1
              };

              recommendationMetadataMap.set(event.id, updatedMetadata);
              return { ...event, recommendationMetadata: updatedMetadata } as Event;
            }

            return event;
          });

          if (matchingTelemetrySampled) {
            try {
              // Compare tag-ranking order against pure score ranking from advanced scoring.
              // Keep diversity and rerank disabled here so telemetry reflects score divergence only.
              const advancedScoredForTelemetry = await rankEventsWithCanonicalPipeline({
                events: tagRankedEvents,
                careerProfile: enrichedCareerProfile,
                supabaseClient: supabase,
                userId: user.id,
                userLocation,
                applyDiversityEnhancement: false,
                allowRerank: false,
                candidateSources
              });

              const advancedSortedIds = [...advancedScoredForTelemetry]
                .sort((a, b) => {
                  const scoreA = (a as EventWithCareerImpact).careerImpact?.overall ?? 0;
                  const scoreB = (b as EventWithCareerImpact).careerImpact?.overall ?? 0;
                  if (scoreB !== scoreA) return scoreB - scoreA;

                  // Stable deterministic tie-breaker based on original tag order.
                  const originalA = originalOrderMap.get(a.id)?.index ?? Number.MAX_SAFE_INTEGER;
                  const originalB = originalOrderMap.get(b.id)?.index ?? Number.MAX_SAFE_INTEGER;
                  return originalA - originalB;
                })
                .map(event => event.id)
                .filter(id => originalOrderMap.has(id));

              if (advancedSortedIds.length > 1) {
                let concordant = 0;
                let discordant = 0;

                for (let i = 0; i < advancedSortedIds.length; i++) {
                  for (let j = i + 1; j < advancedSortedIds.length; j++) {
                    const originalA = originalOrderMap.get(advancedSortedIds[i])!;
                    const originalB = originalOrderMap.get(advancedSortedIds[j])!;
                    if (originalA.index < originalB.index) {
                      concordant++;
                    } else if (originalA.index > originalB.index) {
                      discordant++;
                    }
                  }
                }

                const totalPairs = concordant + discordant;
                divergenceCount = discordant;
                tau = totalPairs > 0 ? (concordant - discordant) / totalPairs : null;
              }

              if (divergenceCount !== null && divergenceCount > 0) {
                console.info('[Recommendations] Alignment vs tag ranking divergence', {
                  userId: user.id,
                  tau: tau?.toFixed(3),
                  divergences: divergenceCount
                });
              }
            } catch (telemetryError) {
              console.warn('Failed to compute recommendation divergence telemetry:', telemetryError);
            }
          }
        } catch (enrichmentError) {
          console.warn('Failed to enrich personalized recommendations with alignment core:', enrichmentError);
        }
      }
      
      // Extract matched tags from events
      const allTags = events.flatMap((event) => {
        const metadataTags = (event as { recommendationMetadata?: RecommendationMetadata }).recommendationMetadata?.matchedTags;
        if (Array.isArray(metadataTags) && metadataTags.length > 0) {
          return metadataTags;
        }
        return event.tags?.map((tag) => tag.name) || [];
      });
      matchedTags = [...new Set(allTags)];
    }

    const processingTime = Date.now() - startTime;

    // Log API response for debugging
    console.info('[Recommendations API] Response prepared', {
      userId: user.id,
      requestId,
      returnedCount: events.length,
      processingTimeMs: processingTime,
      matchedTagsCount: matchedTags.length,
      hasRecommendationMetadata: events.some(e => (e as { recommendationMetadata?: unknown }).recommendationMetadata),
      topEventIds: events.slice(0, 5).map(e => e.id)
    });

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
          tau,
          divergences: divergenceCount,
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
