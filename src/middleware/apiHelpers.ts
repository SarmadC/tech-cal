// Consolidated API middleware helpers
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createRateLimiter, checkRateLimit, RATE_LIMIT_CONFIGS } from '@/utils/rateLimit';

export interface ApiAuthResult {
  success: boolean;
  user?: unknown;
  error?: unknown;
}

export interface ApiRateLimitResult {
  success: boolean;
  error?: unknown;
}

/**
 * Consolidated authentication check
 */
export async function checkAuthentication(): Promise<ApiAuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: {
          message: 'Authentication required',
          status: 401
        }
      };
    }

    return {
      success: true,
      user
    };
  } catch (_error) {
    return {
      success: false,
      error: {
        message: 'Authentication service unavailable',
        status: 503
      }
    };
  }
}

/**
 * Consolidated rate limiting check
 */
export async function checkApiRateLimit(
  rateLimiter: ReturnType<typeof createRateLimiter>,
  userId: string
): Promise<ApiRateLimitResult> {
  return await checkRateLimit(rateLimiter, userId);
}

/**
 * Standard API error response
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: unknown
) {
  const responseBody: Record<string, unknown> = {
    success: false,
    error: message
  };

  if (details) {
    responseBody.details = details;
  }

  return NextResponse.json(responseBody, { status });
}

/**
 * Standard API success response
 */
export function createSuccessResponse(data: unknown, meta?: unknown) {
  const responseBody: Record<string, unknown> = {
    success: true,
    data
  };

  if (meta) {
    responseBody.meta = meta;
  }

  return NextResponse.json(responseBody);
}

/**
 * Middleware wrapper for API endpoints
 */
export function withApiMiddleware(
  handler: (request: NextRequest, context: { user: unknown }) => Promise<NextResponse>,
  options: {
    rateLimitConfig?: keyof typeof RATE_LIMIT_CONFIGS;
    rateLimitPrefix?: string;
    requireAuth?: boolean;
  } = {}
) {
  return async function (request: NextRequest) {
    try {
      const {
        rateLimitConfig = 'MEDIUM_FREQUENCY',
        rateLimitPrefix = 'api',
        requireAuth = true
      } = options;

      // Authentication check
      let user = null;
      if (requireAuth) {
        const authResult = await checkAuthentication();
        if (!authResult.success) {
          const error = authResult.error as { message: string; status: number };
          return createErrorResponse(
            error.message,
            error.status
          );
        }
        user = authResult.user;
      }

      // Rate limiting check
      if (user) {
        const rateLimiter = createRateLimiter(rateLimitPrefix, rateLimitConfig);
        const typedUser = user as { id: string };
        const rateLimitResult = await checkApiRateLimit(rateLimiter, typedUser.id);

        if (!rateLimitResult.success) {
          const error = rateLimitResult.error as { message: string; status: number };
          return createErrorResponse(
            error.message,
            error.status
          );
        }
      }

      // Call the actual handler
      return await handler(request, { user });

    } catch (_error) {
      console.error(`API error in ${options.rateLimitPrefix || 'api'}:`, _error);
      return createErrorResponse(
        'Internal server error',
        500
      );
    }
  };
}