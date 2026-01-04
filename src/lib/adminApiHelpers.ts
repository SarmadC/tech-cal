/**
 * Admin API Route Helpers
 * 
 * Utilities for admin API routes including rate limiting and error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isAdminUser } from '@/lib/adminAuth';
import { createRateLimiter, checkRateLimit, RATE_LIMIT_CONFIGS } from '@/utils/rateLimit';
import { createErrorResponse } from './apiErrorHandler';

/**
 * Admin route handler options
 */
export interface AdminRouteOptions {
    rateLimitConfig?: keyof typeof RATE_LIMIT_CONFIGS;
    requireAuth?: boolean;
}

/**
 * Verify admin access and apply rate limiting
 * Returns user and service client if authorized, or error response
 */
export async function verifyAdminAccess(
    request: NextRequest,
    options: AdminRouteOptions = {}
): Promise<
    | { authorized: true; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }
    | { authorized: false; response: NextResponse }
> {
    const { rateLimitConfig = 'LOW_FREQUENCY', requireAuth = true } = options;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return {
                authorized: false,
                response: createErrorResponse('Unauthorized', 401),
            };
        }

        // Apply rate limiting for admin routes
        if (rateLimitConfig) {
            const rateLimiter = createRateLimiter('admin', rateLimitConfig);
            const rateLimitResult = await checkRateLimit(rateLimiter, user.id);

            if (!rateLimitResult.success) {
                const error = rateLimitResult.error as { message: string; status: number };
                return {
                    authorized: false,
                    response: createErrorResponse(error.message, error.status),
                };
            }
        }

        // Verify admin status
        const isAdmin = await isAdminUser(user.id, supabase);
        if (!isAdmin) {
            return {
                authorized: false,
                response: createErrorResponse('Forbidden', 403),
            };
        }

        return {
            authorized: true,
            userId: user.id,
            supabase,
        };
    } catch (error) {
        console.error('Error verifying admin access:', error);
        return {
            authorized: false,
            response: createErrorResponse('Internal server error', 500),
        };
    }
}



