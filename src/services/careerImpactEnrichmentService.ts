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
 */

import { Event, EventWithCareerImpact, SupabaseClientType } from '@/types';
import { CareerProfile } from '@/types/career';
import { calculateAlignment, getAlignmentCategory } from '@/lib/recommendation/alignmentCore';
import { EnhancedScoringService } from './enhancedScoringService';
import { rerankWithAdvanced } from '@/services/recommendations/rerankAdvanced';
import * as Sentry from '@sentry/nextjs';

/**
 * Scoring strategy configuration
 * - 'server': Use alignment core (default, DRY)
 * - 'legacy': Use old EnhancedScoringService (fallback)
 * - 'shadow': Compute both and log deltas (telemetry mode)
 */
export type ScoringStrategy = 'server' | 'legacy' | 'shadow';
type RerankStrategy = 'off' | 'advanced' | 'shadow';

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
  scoreDistribution: {
    high: number; // 80+
    moderate: number; // 50-79
    low: number; // <50
  };
}

/**
 * Enrich events with career impact scores using alignment core
 * 
 * @param events - Events to enrich
 * @param careerProfile - User's career profile
 * @param supabaseClient - Supabase client (unused currently, reserved for future features)
 * @param userId - User ID for telemetry
 * @returns Events enriched with careerImpact data
 */
export async function enrichEventsWithCareerImpact(
  events: Event[],
  careerProfile: CareerProfile | null,
  _supabaseClient: SupabaseClientType,
  userId?: string
): Promise<EventWithCareerImpact[]> {
  // Early return if no profile or no events
  if (!careerProfile || events.length === 0) {
    return events as EventWithCareerImpact[];
  }

  const startTime = Date.now();
  const strategy = getScoringStrategy();
  const rerank = getRerankStrategy();

  try {
    // Server scoring (DRY alignment core)
    const enrichedEvents: EventWithCareerImpact[] = events.map(event => {
      const alignment = calculateAlignment(event, careerProfile);
      
      return {
        ...event,
        careerImpact: {
          overall: alignment.overall,
          confidence: 1.0, // High confidence in alignment core
          components: alignment.components,
          explanation: {
            // Maintain legacy shape while preserving detailed reasons
            reasons: alignment.alignmentReasons.map(r => r.reason),
            matchedSkills: alignment.matchedSkills,
            speakerHighlights: [],
            careerImpactCategory: getAlignmentCategory(alignment.overall),
            confidenceFactors: ['Alignment core v1.0'],
          },
          metadata: {
            algorithmVersion: 'alignment-core-v1',
            calculatedAt: new Date().toISOString(),
            careerProfileHash: '', // Could add profile fingerprint for debugging
            eventDataHash: ''
          }
        },
        isCareerScored: true
      };
    });

    // Telemetry (sampled)
    if (shouldSampleTelemetry()) {
      const telemetry = computeTelemetry(enrichedEvents, strategy, Date.now() - startTime);
      logTelemetry(telemetry, userId);
    }

    // Shadow mode: compare with legacy scoring (if enabled)
    if (strategy === 'shadow') {
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
          enrichedEvents.slice(0, sampleSize).map(e => [e.id, e.careerImpact?.overall ?? 0])
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
    try {
      if (rerank === 'advanced') {
        const reranked = await rerankWithAdvanced(
          enrichedEvents,
          careerProfile,
          _supabaseClient,
          { topK: 50, userId }
        );
        return reranked as EventWithCareerImpact[];
      }

      if (rerank === 'shadow') {
        // Compute advanced order but return original order; log deltas
        const startShadow = Date.now();
        const reranked = await rerankWithAdvanced(
          enrichedEvents,
          careerProfile,
          _supabaseClient,
          { topK: 50, userId }
        );

        // Build rank maps
        const idToOriginalRank = new Map<string, number>(enrichedEvents.map((e, i) => [e.id, i]));
        const idToRerank = new Map<string, number>(reranked.map((e, i) => [e.id, i]));
        const deltas = enrichedEvents.slice(0, Math.min(20, enrichedEvents.length)).map((e) => ({
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

    return enrichedEvents;

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
  processingTimeMs: number
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

