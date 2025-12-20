/**
 * Shared constants for event filtering and rate limiting
 */

export const FILTERING_CONSTANTS = {
  /** Rate limit: 30 requests per minute = ~2 seconds minimum, use 3s for safety margin */
  RATE_LIMIT_INTERVAL_MS: 3000,

  /** Cache duration for filtered results (15 minutes) - increased for better performance */
  FILTER_CACHE_DURATION_MS: 15 * 60 * 1000,

  /** Unified debounce for all filter changes - balances responsiveness with API efficiency */
  UNIFIED_DEBOUNCE_MS: 100,

  /** @deprecated Use UNIFIED_DEBOUNCE_MS instead */
  SEARCH_DEBOUNCE_MS: 50,

  /** @deprecated Use UNIFIED_DEBOUNCE_MS instead */
  FILTERS_DEBOUNCE_MS: 150,

  /** Typing settle time - how long to wait before considering user done typing */
  TYPING_SETTLE_MS: 500,

  /** Default page size for paginated results */
  DEFAULT_PAGE_SIZE: 50,

  /** Maximum page size */
  MAX_PAGE_SIZE: 100,
} as const;
