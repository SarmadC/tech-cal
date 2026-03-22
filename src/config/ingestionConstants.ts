/**
 * Ingestion Pipeline Constants
 * 
 * Centralized configuration constants for the ingestion pipeline.
 * Consolidates magic numbers and thresholds scattered across the codebase.
 */

// Retry Configuration
export const RETRY_CONFIG = {
    MAX_ATTEMPTS_NORMALIZATION: 5,
    BASE_DELAY_MS: 60 * 60 * 1000, // 1 hour
    MAX_DELAY_MS: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Deduplication Thresholds
export const DEDUPLICATION_CONFIG = {
    SIMILARITY_THRESHOLD: 0.6, // 60% similarity threshold
    FUZZY_MATCH_THRESHOLD: 0.6, // 60% for fuzzy matching
} as const;

// Event Filtering Configuration
export const FILTERING_CONFIG = {
    GRACE_PERIOD_DAYS: 7, // Events within last 7 days are still relevant
    MAX_FUTURE_YEARS: 2, // Reject events more than 2 years in future
    SOURCE_DELAY_MS: 1000, // Delay between source processing (rate limiting)
} as const;

// URL Resolver Configuration
export const URL_RESOLVER_CONFIG = {
    TECHMEME_REDIRECT_PATTERN: /techmeme\.com\/r2\//i,
    DEFAULT_HTTP_PORT: '80',
    DEFAULT_HTTPS_PORT: '443',
} as const;

// Timeout Configuration
export const TIMEOUT_CONFIG = {
    SPEAKER_VERIFICATION_MS: 2000, // 2 seconds
    ORGANIZER_LOOKUP_MS: 2000, // 2 seconds
    COLLECTOR_BASE_DELAY_MS: 1000, // 1 second base delay for collector retries
    COLLECTOR_MAX_RETRIES: 3, // Max retries for collector operations
} as const;

// Query Limits
export const QUERY_LIMITS = {
    DEDUPLICATION_CHECK: 100, // Limit for duplicate check queries
    DEDUPLICATION_COMPARISON: 50, // Limit for comparison queries
    DEDUPLICATION_FUZZY: 10, // Limit for fuzzy matching queries
} as const;

// Deduplication Time Windows
export const DEDUPLICATION_TIME_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours before/after for duplicate matching

// Similarity Thresholds
export const SIMILARITY_THRESHOLDS = {
    HIGH: 0.8, // 80% for high-confidence matches
    MEDIUM: 0.7, // 70% for medium-confidence matches
} as const;

// ICS Collector Defaults
export const ICS_DEFAULTS = {
    DEFAULT_START_HOUR: 9, // 9am UTC for DATE-only events
    DEFAULT_END_HOUR: 17, // 5pm UTC for DATE-only events
    DEFAULT_LOCATION: 'TBD',
    COLLECTOR_VERSION: '1.0.0',
} as const;

// RSS Collector Defaults
export const RSS_DEFAULTS = {
    DEFAULT_CURRENCY: 'USD',
    COLLECTOR_VERSION: '1.0.0',
} as const;

// OG Image Extraction Configuration
export const OG_IMAGE_CONFIG = {
    FETCH_TIMEOUT_MS: 5000, // 5 second timeout for fetching source URLs
    SKIP_DOMAINS: [
        'meetup.com',
        'eventbrite.com',
        'lu.ma',
        'luma-cdn.com',
        'zoom.us',
        'teams.microsoft.com',
    ],
} as const;

// Data Validation Limits
export const VALIDATION_LIMITS = {
    MIN_TITLE_LENGTH: 3, // Minimum title length
    MIN_TITLE_LENGTH_STRICT: 5, // Strict minimum for filtering
    MIN_DESCRIPTION_LENGTH: 50, // Minimum description length for scoring
    MAX_DESCRIPTION_LENGTH: 5000, // Maximum description length
    MIN_TITLE_LENGTH_FOR_SCORE: 10, // Minimum title length for full score
} as const;
