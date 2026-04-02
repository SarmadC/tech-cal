// Shared rate limiting utilities
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

/**
 * Standardized rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // High-frequency endpoints (dashboard, calendar views)
  HIGH_FREQUENCY: {
    requests: 30,
    window: '1 m'
  },
  // Medium-frequency endpoints (analytics, batch operations)
  MEDIUM_FREQUENCY: {
    requests: 20,
    window: '1 m'
  },
  // Low-frequency endpoints (user settings, admin operations)
  LOW_FREQUENCY: {
    requests: 10,
    window: '1 m'
  },
  // Ultra-low frequency (sensitive operations)
  ULTRA_LOW_FREQUENCY: {
    requests: 5,
    window: '1 m'
  },
  // Social graph actions (follow/unfollow)
  FOLLOW_ACTIONS_DAILY: {
    requests: 50,
    window: '1 d'
  }
} as const;

/**
 * Create a standardized rate limiter
 */
export function createRateLimiter(
  prefix: string,
  config: keyof typeof RATE_LIMIT_CONFIGS
) {
  const { requests, window } = RATE_LIMIT_CONFIGS[config];

  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix,
  });
}

/**
 * Standard rate limit check with consistent error handling
 */
export async function checkRateLimit(
  ratelimit: Ratelimit,
  identifier: string,
  options?: {
    failOpen?: boolean
  }
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      return {
        success: false,
        error: {
          message: 'Too many requests. Please try again later.',
          status: 429
        }
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    if (options?.failOpen === false) {
      return {
        success: false,
        error: {
          message: 'Rate limiting is temporarily unavailable. Please try again later.',
          status: 503
        }
      };
    }

    return { success: true };
  }
}

/**
 * Exponential backoff with jitter for rate limit retries
 */
export function calculateBackoffDelay(retryCount: number, baseMs = 1000): number {
  const exponentialDelay = baseMs * Math.pow(2, retryCount);
  const jitter = Math.random() * 500; // 0-500ms jitter
  return exponentialDelay + jitter;
}

/**
 * Enhanced retry logic for rate-limited requests
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  isRateLimitError = (error: unknown) => (error as Error)?.message?.includes('Rate limit exceeded')
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Only retry on rate limit errors
      if (!isRateLimitError(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt);
      console.warn(`Rate limited, retrying in ${Math.round(delay/1000 * 10)/10}s (attempt ${attempt + 2}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
