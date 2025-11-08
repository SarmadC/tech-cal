/**
 * Shared Recommendation Thresholds
 * 
 * Centralized thresholds for career impact score categorization to prevent drift
 * between dashboard components and recommendation services.
 * 
 * Aligned with:
 * - useSmartFilters: 50+ = "recommended" filter
 * - CareerAlignedEventsCard: perfect ≥80, strong 50-79, good 20-49, fair 1-19
 * - uiScoringAdapter.getMatchColor: ≥80, ≥50, ≥20
 */

export const RECOMMENDATION_THRESHOLDS = {
  /** Minimum score for an event to be considered "recommended" */
  RECOMMENDED: 50,
  
  /** Impact buckets for UI display */
  BUCKETS: {
    /** High impact / Perfect match */
    HIGH: 80,
    /** Strong match / Moderate impact */
    MODERATE: 50,
    /** Low but relevant match */
    LOW: 20,
    /** Minimal relevance */
    MINIMAL: 1,
  },
} as const;

/**
 * Get the impact bucket label for a score
 */
export function getImpactBucket(score: number): 'high' | 'moderate' | 'low' | 'minimal' {
  if (score >= RECOMMENDATION_THRESHOLDS.BUCKETS.HIGH) return 'high';
  if (score >= RECOMMENDATION_THRESHOLDS.BUCKETS.MODERATE) return 'moderate';
  if (score >= RECOMMENDATION_THRESHOLDS.BUCKETS.LOW) return 'low';
  return 'minimal';
}

/**
 * Get the impact bucket label with color class (for UI)
 */
export function getImpactBucketLabel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const bucket = getImpactBucket(score);
  
  switch (bucket) {
    case 'high':
      return {
        label: 'High Impact',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-400/30',
      };
    case 'moderate':
      return {
        label: 'Strong Match',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-400/30',
      };
    case 'low':
      return {
        label: 'Good Match',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-400/30',
      };
    case 'minimal':
      return {
        label: 'Fair Match',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-400/30',
      };
  }
}

/**
 * Check if an event score qualifies as "recommended"
 */
export function isRecommended(score: number): boolean {
  return score >= RECOMMENDATION_THRESHOLDS.RECOMMENDED;
}







