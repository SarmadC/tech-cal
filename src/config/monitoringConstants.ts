/**
 * Shared constants for recommendation monitoring
 * Single source of truth for all monitoring-related configuration
 */

export const MONITORING_CONFIG = {
  // Score ranges for analysis (consistent across all tools)
  SCORE_RANGES: [
    { min: 0, max: 25, label: '0-25' },
    { min: 25, max: 50, label: '25-50' },
    { min: 50, max: 75, label: '50-75' },
    { min: 75, max: 100, label: '75-100' }
  ] as const,

  // Date range limits
  MIN_DAYS: 1,
  MAX_DAYS: 90,
  DEFAULT_DAYS: 7,

  // Query limits for performance
  MAX_EVENT_BATCH_SIZE: 1000,
  MAX_ANALYTICS_BATCH_SIZE: 5000,

  // Outlier detection thresholds
  HIGH_PERFORMANCE_MIN_CLICKS: 2,
  HIGH_PERFORMANCE_MAX_SCORE: 50,
  LOW_PERFORMANCE_MIN_SCORE: 80,
  LOW_PERFORMANCE_MAX_CLICKS: 0,

  // Display limits
  MAX_TRIGGERS_DISPLAY: 10,
  MAX_OUTLIERS_DISPLAY: 20,
  MAX_TOP_TRIGGERS_IN_RANGE: 3,

  // CTR thresholds for recommendations
  LOW_CTR_THRESHOLD: 0.1,
  GOOD_CTR_THRESHOLD: 0.2,
  MIN_EVENTS_FOR_TRIGGER_ANALYSIS: 5
} as const;

export type ScoreRange = typeof MONITORING_CONFIG.SCORE_RANGES[number];