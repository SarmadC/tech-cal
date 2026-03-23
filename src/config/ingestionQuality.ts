/**
 * Ingestion Quality Configuration
 * 
 * Score thresholds, component weightings, and quality gates
 * for automated event ingestion quality scoring.
 */

/**
 * Quality score component weightings (must sum to 100)
 */
export const QUALITY_COMPONENT_WEIGHTS = {
    SOURCE_TRUST: 40, // 0-40%
    METADATA_COMPLETENESS: 30, // 0-30%
    SPEAKER_VERIFICATION: 15, // 0-15%
    HISTORICAL_PERFORMANCE: 15, // 0-15%
} as const;

// Runtime validation: weights must sum to 100
const weightSum = Object.values(QUALITY_COMPONENT_WEIGHTS).reduce((a, b) => a + b, 0);
if (weightSum !== 100) {
    throw new Error(`QUALITY_COMPONENT_WEIGHTS must sum to 100, got ${weightSum}`);
}

/**
 * Score thresholds for auto-publish vs moderation queue
 */
export const QUALITY_THRESHOLDS = {
    AUTO_PUBLISH: 75.0, // Events with score >= 75 auto-publish
    MODERATION_REQUIRED: 50.0, // Events with score < 50 require mandatory review
    // Events between 50-75: auto-queue for review but can be auto-approved by allowlist
} as const;

/**
 * Metadata completeness scoring rules
 */
export const METADATA_COMPLETENESS_SCORING = {
    REQUIRED_FIELDS: ['title', 'start_time', 'location', 'organizer'],
    REQUIRED_FIELD_WEIGHT: 5, // Each required field = 5% (max 20%)
    
    OPTIONAL_FIELDS: [
        'description',
        'end_time',
        'registration_url',
        'event_image_url',
        'speaker_lineup',
        'tags',
        'price_range',
    ],
    OPTIONAL_FIELD_WEIGHT: 1.43, // Each optional field = ~1.43% (max 10% for all 7)
} as const;

/**
 * Speaker verification scoring
 */
export const SPEAKER_VERIFICATION_SCORING = {
    VERIFIED_PROFILE_BONUS: 5, // +5% per verified speaker profile
    MAX_BONUS: 15, // Maximum 15% total
    VERIFICATION_TIMEOUT_MS: 2000, // 2 second timeout for URL validation
    ENABLED: process.env.INGESTION_VERIFY_SPEAKERS !== 'false', // Default: enabled, set INGESTION_VERIFY_SPEAKERS=false to disable
    MAX_SPEAKERS_TO_VERIFY: 3, // Limit verification to first N speakers to prevent stalls
    BATCH_TIMEOUT_MS: 5000, // Total timeout for all verifications combined
} as const;

/**
 * Historical performance scoring factors
 */
export const HISTORICAL_PERFORMANCE_SCORING = {
    APPROVAL_RATE_WEIGHT: 8, // 0-8% based on approval rate
    DUPLICATE_RATE_PENALTY: 7, // 0-7% penalty for high duplicate rate
    ERROR_RATE_PENALTY: 5, // 0-5% penalty for high error rate
} as const;

/**
 * Quality gates - additional checks beyond score
 */
export const QUALITY_GATES = {
    MIN_TITLE_LENGTH: 3,
    MAX_TITLE_LENGTH: 200,
    REQUIRED_START_TIME: true,
    FUTURE_EVENTS_ONLY: false, // Allow past events for historical data
    BLOCKLIST_CHECK: true,
    ALLOWLIST_AUTO_APPROVE: true,
} as const;

/**
 * Reason codes for manual approval
 */
export const REASON_CODES = {
    LOW_SCORE: 'low_quality_score',
    MISSING_REQUIRED_FIELDS: 'missing_required_fields',
    SUSPICIOUS_TITLE: 'suspicious_title',
    DUPLICATE_CANDIDATE: 'potential_duplicate',
    SPEAKER_VERIFICATION_FAILED: 'speaker_verification_failed',
    SOURCE_LOW_TRUST: 'source_low_trust',
    HISTORICAL_PERFORMANCE_POOR: 'historical_performance_poor',
    BLOCKED_KEYWORDS: 'blocked_keywords',
    MANUAL_REVIEW_REQUESTED: 'manual_review_requested',
} as const;

export type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES];

