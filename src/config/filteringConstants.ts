/**
 * Shared constants for event filtering and rate limiting
 */

export const FILTERING_CONSTANTS = {
  /** Rate limit: 30 requests per minute = ~2 seconds minimum, use 3s for safety margin */
  RATE_LIMIT_INTERVAL_MS: 3000,

  /** Cache duration for filtered results (10 minutes) */
  FILTER_CACHE_DURATION_MS: 10 * 60 * 1000,

  /** Search term debounce delay */
  SEARCH_DEBOUNCE_MS: 1500,

  /** Coalesce non-search filter changes */
  FILTERS_DEBOUNCE_MS: 300,

  /** Default page size for paginated results */
  DEFAULT_PAGE_SIZE: 50,

  /** Maximum page size */
  MAX_PAGE_SIZE: 100,
} as const;
