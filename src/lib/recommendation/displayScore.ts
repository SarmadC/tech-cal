/**
 * Display Score Helper
 *
 * Single source of truth for turning a pipeline-scored event into the 0-100
 * score shown across surfaces (mobile cards, dashboard, top picks). No UI
 * dependencies — safe for API routes and services.
 */

import type { CareerProfile, Event } from '@/types';
import { calculateBaseScore } from '@/lib/recommendation/baseScorer';

type ScoredEvent = Event & {
  careerImpactLite?: { overall?: number };
  careerImpact?: { overall?: number };
};

/**
 * Normalize a raw score value to a rounded 0-100 integer.
 * Values in (0, 1] are treated as ratios and scaled by 100.
 * Returns null for absent or non-finite values.
 */
export function normalizeDisplayScore(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return null;
  }

  const scaled = raw <= 1 ? raw * 100 : raw;
  return Math.round(Math.min(100, Math.max(0, scaled)));
}

/**
 * Extract the canonical recommendation score from a scored event:
 * alignmentScore → matchScore → careerImpactLite.overall → careerImpact.overall.
 * Returns null when the event carries no usable score.
 */
export function extractRecommendationScore(event: Event): number | null {
  const scoredEvent = event as ScoredEvent;
  const raw =
    event.recommendationMetadata?.alignmentScore ??
    event.recommendationMetadata?.matchScore ??
    scoredEvent.careerImpactLite?.overall ??
    scoredEvent.careerImpact?.overall ??
    null;

  return normalizeDisplayScore(raw);
}

/**
 * Display score with a cold-start fallback: events the pipeline has not
 * scored (or scored 0) fall back to the base career scorer. This is the only
 * place calculateBaseScore should be used as a display fallback.
 */
export function getEventDisplayScore(
  event: Event,
  careerProfile: CareerProfile | null
): number {
  const extracted = extractRecommendationScore(event);
  if (extracted !== null && extracted > 0) {
    return extracted;
  }

  try {
    return Math.round(calculateBaseScore(event, careerProfile).overall);
  } catch {
    return Math.round(calculateBaseScore(event, null).overall);
  }
}
