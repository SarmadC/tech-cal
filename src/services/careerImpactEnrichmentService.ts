/**
 * Career Impact Enrichment Service
 * 
 * Enriches events with career alignment scores using the unified alignment core.
 * Replaces the legacy EnhancedScoringService with a simpler, DRY approach.
 * 
 * Features:
 * - Uses pure alignment core for scoring consistency
 * - Supports feature flag for scoring strategy selection
 * - Adds telemetry for monitoring and debugging
 * - Returns full breakdown data for UI transparency
 * - Caches scores in Redis to optimize performance
 */

import { Event, EventWithCareerImpact, SupabaseClientType } from '@/types';
import { CareerProfile } from '@/types/career';
import { calculateBaseScore, getAlignmentCategory } from '@/lib/recommendation/baseScorer';
import { EnhancedScoringService } from './enhancedScoringService';
import { rerankWithBehavioral } from '@/services/recommendations/behavioralReranker';
import { LocationScoringService, UserLocation } from './locationScoringService';
import * as Sentry from '@sentry/nextjs';
import { envConfig } from '@/utils/envConfig';
import { createHash } from 'crypto';

// Safe KV client - only initialize if KV is configured
// @vercel/kv throws an error if env vars are missing, so we need to catch during import
let kv: typeof import('@vercel/kv').kv | null = null;
if (envConfig.isKvAvailable()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kv = require('@vercel/kv').kv;
  } catch (error) {
    // KV not properly configured - this is expected if env vars are missing
    // Will fall back to calculation without caching
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Enrichment] KV cache not available:', error instanceof Error ? error.message : 'unknown error');
    }
  }
}

/**
 * Scoring strategy configuration
 * - 'server': Use alignment core (default, DRY)
 * - 'legacy': Use old EnhancedScoringService (fallback)
 * - 'shadow': Compute both and log deltas (telemetry mode)
 */
export type ScoringStrategy = 'server' | 'legacy' | 'shadow';
type RerankStrategy = 'off' | 'advanced' | 'shadow';
export interface EnrichmentOptions {
  allowRerank?: boolean;
}

/**
 * Get scoring strategy from environment or default to 'server'
 */
function getScoringStrategy(): ScoringStrategy {
  const strategy = process.env.NEXT_PUBLIC_DISCOVERY_SCORING || process.env.DISCOVERY_SCORING || 'server';
  if (strategy === 'legacy' || strategy === 'shadow') {
    return strategy;
  }
  return 'server';
}

function getRerankStrategy(): RerankStrategy {
  const strategy = process.env.DISCOVERY_RERANK || 'off';
  if (strategy === 'advanced' || strategy === 'shadow') return strategy;
  return 'off';
}

/**
 * Telemetry data for monitoring scoring performance
 */
interface ScoringTelemetry {
  strategy: ScoringStrategy;
  eventCount: number;
  avgScore: number;
  avgReasonCount: number;
  processingTimeMs: number;
  cacheHitCount: number;
  cacheMissCount: number;
  scoreDistribution: {
    high: number; // 80+
    moderate: number; // 50-79
    low: number; // <50
  };
}

/**
 * Cache configuration
 */
const CACHE_TTL_SECONDS = 3600; // 1 hour
const CACHE_PREFIX = 'career-impact:v2';
const LOCATION_NEUTRAL_SCORE = 0.8;

interface CacheScope {
  strategyFingerprint: string;
  profileFingerprint: string;
  locationFingerprint: string;
}

function getStrategyFingerprint(strategy: ScoringStrategy): string {
  return strategy === 'legacy' ? 'legacy' : 'alignment-core-v1';
}

function getProfileFingerprint(careerProfile: CareerProfile | null): string {
  if (!careerProfile) return 'cold-start';

  const payload = JSON.stringify({
    role: careerProfile.currentRole || '',
    seniority: careerProfile.seniority || '',
    industry: careerProfile.industry || '',
    primarySkills: (careerProfile.primarySkills || []).slice(0, 8),
    skillsToLearn: (careerProfile.skillsToLearn || []).slice(0, 8),
    interests: (careerProfile.interests || []).slice(0, 8),
    goals: (careerProfile.careerGoals || []).slice(0, 6),
    learningStyle: (careerProfile.learningStyle || []).slice(0, 6),
    networkingGoals: (careerProfile.networkingGoals || []).slice(0, 6),
    preferredEventTypes: (careerProfile.preferredEventTypes || []).slice(0, 6),
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

function getLocationFingerprint(userLocation?: UserLocation | null): string {
  if (!userLocation) return 'none';

  const normalize = (value?: string) => value?.trim().toLowerCase() || '';
  const payload = JSON.stringify({
    city: normalize(userLocation.city),
    country: normalize(userLocation.country),
    timezone: normalize(userLocation.timezone),
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

function getEventFingerprint(event: Event): string {
  const payload = JSON.stringify({
    id: event.id,
    title: event.title,
    startTime: event.startTime,
    endTime: event.endTime,
    eventTypeId: event.eventTypeId,
  });

  return createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

/**
 * Generate cache key for a user-event pair
 */
function getCacheKey(userId: string, eventId: string, cacheScope: CacheScope): string {
  return [
    CACHE_PREFIX,
    userId,
    cacheScope.strategyFingerprint,
    cacheScope.profileFingerprint,
    cacheScope.locationFingerprint,
    eventId
  ].join(':');
}

/**
 * Enrich events with career impact scores using alignment core
 * 
 * For users without profiles (cold start), provides baseline scores based on event quality.
 * 
 * @param events - Events to enrich
 * @param careerProfile - User's career profile (null for cold start users)
 * @param supabaseClient - Supabase client (unused currently, reserved for future features)
 * @param userId - User ID for telemetry
 * @param userLocation - Optional user location for proximity scoring
 * @returns Events enriched with careerImpact data
 */
export async function enrichEventsWithCareerImpact(
  events: Event[],
  careerProfile: CareerProfile | null,
  _supabaseClient: SupabaseClientType,
  userId?: string,
  userLocation?: UserLocation | null,
  options: EnrichmentOptions = {}
): Promise<EventWithCareerImpact[]> {
  // Early return only if no events
  if (events.length === 0) {
    return events as EventWithCareerImpact[];
  }

  const startTime = Date.now();
  const strategy = getScoringStrategy();
  const rerank = getRerankStrategy();
  const isColdStart = !careerProfile;
  const allowRerank = options.allowRerank ?? false;
  const profileFingerprint = getProfileFingerprint(careerProfile);
  const cacheScope: CacheScope = {
    strategyFingerprint: getStrategyFingerprint(strategy),
    profileFingerprint,
    locationFingerprint: getLocationFingerprint(userLocation),
  };
  
  // Track cache stats
  let cacheHitCount = 0;
  let cacheMissCount = 0;

  try {
    // 1. Try to fetch from cache first if we have a userId
    const enrichedEventsMap = new Map<string, EventWithCareerImpact>();
    const eventsToCalculate: Event[] = [];

    if (userId && !isColdStart && kv) {
      try {
        const cacheKeys = events.map(e => getCacheKey(userId, e.id, cacheScope));
        
        // Batch fetch from Redis
        // kv.mget returns (T | null)[]
        const cachedScores = await kv.mget<EventWithCareerImpact['careerImpact'][]>(...cacheKeys);
        
        events.forEach((event, index) => {
          const cachedScore = cachedScores[index];
          if (cachedScore) {
            enrichedEventsMap.set(event.id, {
              ...event,
              careerImpact: cachedScore,
              isCareerScored: true
            });
            cacheHitCount++;
          } else {
            eventsToCalculate.push(event);
            cacheMissCount++;
          }
        });
      } catch (cacheError) {
        // Only log if it's not a missing env var error
        const errorMessage = cacheError instanceof Error ? cacheError.message : String(cacheError);
        if (!errorMessage.includes('Missing required environment variables')) {
          console.warn('[Enrichment] Cache read failed, falling back to calculation:', cacheError);
        }
        // Fallback: calculate all
        eventsToCalculate.push(...events);
        enrichedEventsMap.clear();
        cacheHitCount = 0;
        cacheMissCount = events.length;
      }
    } else {
      // No user ID or cold start -> always calculate
      eventsToCalculate.push(...events);
      cacheMissCount = events.length;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Enrichment] Cache stats: ${cacheHitCount} hits, ${cacheMissCount} misses`);
    }

    const applyLocationAdjustment = (scoredEvent: EventWithCareerImpact): EventWithCareerImpact => {
      if (!scoredEvent.careerImpact) {
        return scoredEvent;
      }

      const locationResult = LocationScoringService.calculateLocationScore(scoredEvent, userLocation);
      const locationAdjustment = (locationResult.score - LOCATION_NEUTRAL_SCORE) * 10;
      const adjustedOverall = Math.max(0, Math.min(100, (scoredEvent.careerImpact.overall ?? 0) + locationAdjustment));

      const currentExplanation = (scoredEvent.careerImpact.explanation ?? {}) as Record<string, unknown>;
      const currentReasons = Array.isArray(currentExplanation['reasons'])
        ? [...(currentExplanation['reasons'] as string[])]
        : [];

      if (!locationResult.isVirtual && locationResult.score < 1.0) {
        currentReasons.push(locationResult.reason);
      }

      return {
        ...scoredEvent,
        careerImpact: {
          ...scoredEvent.careerImpact,
          overall: adjustedOverall,
          explanation: {
            reasons: currentReasons,
            matchedSkills: Array.isArray(currentExplanation['matchedSkills'])
              ? (currentExplanation['matchedSkills'] as string[])
              : [],
            speakerHighlights: Array.isArray(currentExplanation['speakerHighlights'])
              ? (currentExplanation['speakerHighlights'] as string[])
              : [],
            careerImpactCategory: getAlignmentCategory(adjustedOverall),
            confidenceFactors: Array.isArray(currentExplanation['confidenceFactors'])
              ? (currentExplanation['confidenceFactors'] as string[])
              : [],
            ...(Array.isArray(currentExplanation['alignmentReasons'])
              ? { alignmentReasons: currentExplanation['alignmentReasons'] }
              : {}),
            ...(Array.isArray(currentExplanation['matchedGoals'])
              ? { matchedGoals: currentExplanation['matchedGoals'] as string[] }
              : {}),
          },
          metadata: {
            ...(scoredEvent.careerImpact.metadata ?? {}),
            careerProfileHash: profileFingerprint,
            eventDataHash: getEventFingerprint(scoredEvent)
          }
        },
      };
    };

    const scoreWithAlignmentCore = (event: Event): EventWithCareerImpact => {
      try {
        const alignment = calculateBaseScore(event, careerProfile);

        const baseScoredEvent: EventWithCareerImpact = {
          ...event,
          careerImpact: {
            overall: alignment.overall,
            confidence: isColdStart ? 0.6 : 1.0,
            components: {
              ...alignment.components,
            },
            explanation: {
              reasons: alignment.alignmentReasons.map(r => r.reason),
              alignmentReasons: alignment.alignmentReasons,
              matchedSkills: alignment.matchedSkills,
              matchedGoals: alignment.matchedGoals,
              speakerHighlights: [],
              careerImpactCategory: getAlignmentCategory(alignment.overall),
              confidenceFactors: isColdStart
                ? ['Cold start scoring - complete your profile for better recommendations']
                : ['Alignment core v1.0'],
            },
            metadata: {
              algorithmVersion: isColdStart ? 'alignment-core-v1-coldstart' : 'alignment-core-v1',
              calculatedAt: new Date().toISOString(),
              careerProfileHash: profileFingerprint,
              eventDataHash: getEventFingerprint(event)
            }
          },
          isCareerScored: true
        };

        return applyLocationAdjustment(baseScoredEvent);
      } catch (error) {
        console.error('[Enrichment] Error scoring event:', event.id, error);
        return {
          ...event,
          careerImpact: {
            overall: 0,
            confidence: 0,
            components: {
              skillRelevance: 0,
              careerStageMatch: 0,
              networkingValue: 0,
              industryRelevance: 0,
              timingBonus: 0
            },
            explanation: {
              reasons: ['Scoring failed'],
              alignmentReasons: [],
              matchedSkills: [],
              matchedGoals: [],
              speakerHighlights: [],
              careerImpactCategory: 'low' as const,
              confidenceFactors: ['Scoring error']
            },
            metadata: {
              algorithmVersion: 'error',
              calculatedAt: new Date().toISOString(),
              careerProfileHash: profileFingerprint,
              eventDataHash: getEventFingerprint(event)
            }
          },
          isCareerScored: false
        };
      }
    };

    // 2. Calculate scores for misses
    let newlyEnrichedEvents: EventWithCareerImpact[] = [];
    if (eventsToCalculate.length > 0) {
      if (strategy === 'legacy' && !isColdStart && careerProfile) {
        try {
          const legacyEnriched = await EnhancedScoringService.enrichEventsWithScores(
            eventsToCalculate,
            careerProfile,
            { userId, supabaseClient: _supabaseClient, enableBehavioralBoost: false }
          );

          newlyEnrichedEvents = (legacyEnriched as EventWithCareerImpact[]).map((event) => {
            const normalizedLegacyEvent: EventWithCareerImpact = {
              ...event,
              careerImpact: {
                ...(event.careerImpact ?? {
                  overall: 0,
                  confidence: 0,
                  components: {
                    skillRelevance: 0,
                    careerStageMatch: 0,
                    networkingValue: 0,
                    industryRelevance: 0,
                    timingBonus: 0
                  },
                  explanation: {
                    reasons: [],
                    matchedSkills: [],
                    speakerHighlights: [],
                    careerImpactCategory: 'low' as const,
                    confidenceFactors: []
                  },
                  metadata: {}
                }),
                components: {
                  skillRelevance: event.careerImpact?.components?.skillRelevance ?? 0,
                  careerStageMatch: event.careerImpact?.components?.careerStageMatch ?? 0,
                  networkingValue: event.careerImpact?.components?.networkingValue ?? 0,
                  industryRelevance: event.careerImpact?.components?.industryRelevance ?? 0,
                  timingBonus: event.careerImpact?.components?.timingBonus ?? 0
                },
                explanation: {
                  reasons: event.careerImpact?.explanation?.reasons ?? [],
                  matchedSkills: event.careerImpact?.explanation?.matchedSkills ?? [],
                  speakerHighlights: event.careerImpact?.explanation?.speakerHighlights ?? [],
                  careerImpactCategory: event.careerImpact?.explanation?.careerImpactCategory ?? 'low',
                  confidenceFactors: event.careerImpact?.explanation?.confidenceFactors ?? [],
                  ...(event.careerImpact?.explanation?.alignmentReasons
                    ? { alignmentReasons: event.careerImpact.explanation.alignmentReasons }
                    : {}),
                  ...(event.careerImpact?.explanation?.matchedGoals
                    ? { matchedGoals: event.careerImpact.explanation.matchedGoals }
                    : {}),
                },
                metadata: {
                  ...(event.careerImpact?.metadata ?? {}),
                  algorithmVersion: event.careerImpact?.metadata?.algorithmVersion || 'legacy-v2.0.0',
                  calculatedAt: new Date().toISOString(),
                  careerProfileHash: profileFingerprint,
                  eventDataHash: getEventFingerprint(event)
                }
              },
              isCareerScored: true
            };

            return applyLocationAdjustment(normalizedLegacyEvent);
          });
        } catch (legacyError) {
          console.warn('[Enrichment] Legacy strategy failed, falling back to alignment core', legacyError);
          newlyEnrichedEvents = eventsToCalculate.map(scoreWithAlignmentCore);
        }
      } else {
        newlyEnrichedEvents = eventsToCalculate.map(scoreWithAlignmentCore);
      }
    }

    // 3. Cache new scores (if we have a userId and not cold start and KV is available)
    if (userId && !isColdStart && newlyEnrichedEvents.length > 0 && kv) {
      try {
        const pipeline = kv.pipeline();
        newlyEnrichedEvents.forEach(event => {
          if (event.careerImpact) {
            pipeline.set(getCacheKey(userId, event.id, cacheScope), event.careerImpact, { ex: CACHE_TTL_SECONDS });
          }
        });
        await pipeline.exec();
      } catch (cacheWriteError) {
        // Only log if it's not a missing env var error
        const errorMessage = cacheWriteError instanceof Error ? cacheWriteError.message : String(cacheWriteError);
        if (!errorMessage.includes('Missing required environment variables')) {
          console.warn('[Enrichment] Failed to cache scores:', cacheWriteError);
        }
      }
    }

    // 4. Merge results maintaining original order
    const finalEnrichedEvents = events.map(originalEvent => {
      // It's either in the map (cache hit) or in the newly calculated list
      if (enrichedEventsMap.has(originalEvent.id)) {
        return enrichedEventsMap.get(originalEvent.id)!;
      }
      // Find in newly enriched list
      return newlyEnrichedEvents.find(e => e.id === originalEvent.id) || {
        ...originalEvent,
        isCareerScored: false
      } as EventWithCareerImpact;
    });

    // Telemetry (sampled)
    if (shouldSampleTelemetry()) {
      const telemetry = computeTelemetry(finalEnrichedEvents, strategy, Date.now() - startTime, cacheHitCount, cacheMissCount);
      logTelemetry(telemetry, userId);
    }

    // Shadow mode: compare with legacy scoring (if enabled)
    // Skip shadow mode for cold start users (no legacy comparison needed)
    if (strategy === 'shadow' && !isColdStart) {
      try {
        // Limit comparison to avoid overhead
        const sampleSize = Math.min(30, events.length);
        const sampleEvents = events.slice(0, sampleSize);
        const legacyEnriched = await EnhancedScoringService.enrichEventsWithScores(
          sampleEvents,
          careerProfile,
          { userId, supabaseClient: _supabaseClient, enableBehavioralBoost: false }
        );

        // Build maps for quick lookup
        const coreMap = new Map<string, number>(
          finalEnrichedEvents.slice(0, sampleSize).map(e => [e.id, e.careerImpact?.overall ?? 0])
        );
        const legacyMap = new Map<string, number>(
          (legacyEnriched as unknown as EventWithCareerImpact[]).map(e => [e.id, e.careerImpact?.overall ?? 0])
        );

        // Compute deltas
        const deltas: Array<{ id: string; core: number; legacy: number; delta: number }> = [];
        for (const [id, coreScore] of coreMap.entries()) {
          const legacyScore = legacyMap.get(id) ?? 0;
          deltas.push({ id, core: coreScore, legacy: legacyScore, delta: coreScore - legacyScore });
        }

        // Compute delta stats
        const abs = (n: number) => Math.abs(n);
        const avgAbsDelta = deltas.length > 0 ? deltas.reduce((s, d) => s + abs(d.delta), 0) / deltas.length : 0;
        const maxAbsDelta = deltas.length > 0 ? Math.max(...deltas.map(d => abs(d.delta))) : 0;
        const largeDeltaCount = deltas.filter(d => abs(d.delta) >= 15).length; // 15% threshold

        // Log summary telemetry
        console.log('[Shadow Mode] Scoring delta summary', {
          sampleSize,
          avgAbsDelta: Number(avgAbsDelta.toFixed(2)),
          maxAbsDelta: Number(maxAbsDelta.toFixed(2)),
          largeDeltaCount,
          threshold: 15
        });
        
        Sentry.addBreadcrumb({
          category: 'scoring-delta',
          message: 'Shadow mode legacy vs core deltas',
          level: 'info',
          data: {
            sampleSize,
            avgAbsDelta: Number(avgAbsDelta.toFixed(2)),
            maxAbsDelta: Number(maxAbsDelta.toFixed(2)),
            largeDeltaCount,
            threshold: 15
          }
        });

        // Optionally log top 5 largest deltas (anonymized IDs)
        const topDeltas = deltas
          .sort((a, b) => abs(b.delta) - abs(a.delta))
          .slice(0, 5)
          .map(d => ({ id: `event-${d.id.slice(0, 6)}`, core: d.core, legacy: d.legacy, delta: Number(d.delta.toFixed(2)) }));
        console.log('[Shadow Mode] Top deltas', topDeltas);
      } catch (shadowError) {
        console.warn('[Shadow Mode] Delta comparison failed:', shadowError);
      }
    }

    // Optional advanced reranking stage
    // Skip reranking for cold start users (no behavioral data available)
    try {
      if (allowRerank && rerank === 'advanced' && !isColdStart) {
        const reranked = await rerankWithBehavioral(
          finalEnrichedEvents,
          careerProfile!,
          _supabaseClient,
          { topK: 50, userId }
        );
        return reranked as EventWithCareerImpact[];
      }

      if (allowRerank && rerank === 'shadow' && !isColdStart) {
        // Compute advanced order but return original order; log deltas
        const startShadow = Date.now();
        const reranked = await rerankWithBehavioral(
          finalEnrichedEvents,
          careerProfile,
          _supabaseClient,
          { topK: 50, userId }
        );

        // Build rank maps
        const idToOriginalRank = new Map<string, number>(finalEnrichedEvents.map((e, i) => [e.id, i]));
        const idToRerank = new Map<string, number>(reranked.map((e, i) => [e.id, i]));
        const deltas = finalEnrichedEvents.slice(0, Math.min(20, finalEnrichedEvents.length)).map((e) => ({
          id: e.id,
          from: idToOriginalRank.get(e.id) ?? -1,
          to: idToRerank.get(e.id) ?? -1,
          delta: ((idToOriginalRank.get(e.id) ?? 0) - (idToRerank.get(e.id) ?? 0))
        }));

        const rerankLatencyMs = Date.now() - startShadow;
        if (shouldSampleTelemetry()) {
          Sentry.addBreadcrumb({
            category: 'rerank-shadow',
            level: 'info',
            message: 'Advanced rerank shadow deltas',
            data: {
              rerankLatencyMs,
              sample: deltas.slice(0, 5)
            }
          });
        }
      }
    } catch (rerankError) {
      console.warn('[Rerank] Advanced rerank failed; using core order', rerankError);
    }

    return finalEnrichedEvents;

  } catch (error) {
    console.error('Error enriching events with career impact:', error);
    Sentry.captureException(error, {
      extra: {
        function: 'enrichEventsWithCareerImpact',
        eventCount: events.length,
        strategy
      }
    });
    return events as EventWithCareerImpact[]; // Return original events if enrichment fails
  }
}

/**
 * Compute telemetry data from enriched events
 */
function computeTelemetry(
  events: EventWithCareerImpact[],
  strategy: ScoringStrategy,
  processingTimeMs: number,
  cacheHitCount: number,
  cacheMissCount: number
): ScoringTelemetry {
  const scores = events
    .filter(e => e.careerImpact?.overall !== undefined)
    .map(e => e.careerImpact!.overall);

  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0;

  const avgReasonCount = events
    .map(e => (e.careerImpact?.explanation as { reasons?: unknown[] } | undefined)?.reasons?.length ?? 0)
    .reduce((sum, count) => sum + count, 0) / (events.length || 1);

  const scoreDistribution = {
    high: scores.filter(s => s >= 80).length,
    moderate: scores.filter(s => s >= 50 && s < 80).length,
    low: scores.filter(s => s < 50).length
  };

  return {
    strategy,
    eventCount: events.length,
    avgScore,
    avgReasonCount,
    processingTimeMs,
    cacheHitCount,
    cacheMissCount,
    scoreDistribution
  };
}

/**
 * Sample telemetry at 10% rate to reduce overhead
 */
function shouldSampleTelemetry(): boolean {
  return Math.random() < 0.1;
}

/**
 * Log telemetry to console and Sentry
 */
function logTelemetry(telemetry: ScoringTelemetry, userId?: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Scoring Telemetry]', {
      ...telemetry,
      userId: userId ? `user-${userId.slice(0, 8)}` : 'anonymous'
    });
  }

  // Send to Sentry as breadcrumb for correlation with errors
  Sentry.addBreadcrumb({
    category: 'scoring',
    message: 'Career impact scoring completed',
    level: 'info',
    data: telemetry
  });
}

/**
 * Legacy: Export for backwards compatibility
 * This is a simplified adapter that delegates to the new enrichment service
 */
export class CareerImpactEnrichmentService {
  static async enrichEventsWithScores(
    events: Event[],
    careerProfile: CareerProfile | null,
    options: { userId?: string; supabaseClient: SupabaseClientType }
  ): Promise<Event[]> {
    return enrichEventsWithCareerImpact(
      events,
      careerProfile,
      options.supabaseClient,
      options.userId
    );
  }
}
