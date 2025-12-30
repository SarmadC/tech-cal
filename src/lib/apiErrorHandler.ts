/**
 * Standardized API Error Handling
 * 
 * Provides consistent error responses across all API routes
 * to prevent information leakage and ensure security.
 */

import { NextResponse } from 'next/server';

export interface ApiError {
    message: string;
    status: number;
    code?: string;
    details?: unknown;
}

/**
 * Create a standardized error response
 * In production, detailed error messages are hidden to prevent information disclosure
 */
export function createErrorResponse(
    error: string | Error | ApiError,
    status: number = 500,
    includeDetails: boolean = false
): NextResponse {
    const isProduction = process.env.NODE_ENV === 'production';
    
    let message: string;
    let code: string | undefined;
    let details: unknown | undefined;

    if (typeof error === 'string') {
        message = error;
    } else if (error instanceof Error) {
        message = isProduction 
            ? 'An error occurred processing your request'
            : error.message;
        details = includeDetails && !isProduction ? error.stack : undefined;
    } else {
        message = error.message || 'An error occurred processing your request';
        code = error.code;
        details = includeDetails && !isProduction ? error.details : undefined;
    }

    // Log detailed error server-side
    if (!isProduction || status >= 500) {
        console.error('[API Error]', {
            message,
            status,
            code,
            details: isProduction ? undefined : details,
        });
    }

    const response: {
        success: false;
        error: string;
        code?: string;
        details?: unknown;
    } = {
        success: false,
        error: message,
    };

    if (code) {
        response.code = code;
    }

    if (details && !isProduction) {
        response.details = details;
    }

    return NextResponse.json(response, { status });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
    data: T,
    status: number = 200,
    meta?: unknown
): NextResponse {
    const response: {
        success: true;
        data: T;
        meta?: unknown;
    } = {
        success: true,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    return NextResponse.json(response, { status });
}

/**
 * Handle API route errors consistently
 * Wraps route handlers to catch and format errors
 */
export function withErrorHandler<T extends unknown[]>(
    handler: (...args: T) => Promise<NextResponse>
) {
    return async (...args: T): Promise<NextResponse> => {
        try {
            return await handler(...args);
        } catch (error) {
            if (error instanceof Error) {
                // Check for known error types
                if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
                    return createErrorResponse('Unauthorized', 401);
                }
                if (error.message.includes('Forbidden') || error.message.includes('permission')) {
                    return createErrorResponse('Forbidden', 403);
                }
                if (error.message.includes('Not found')) {
                    return createErrorResponse('Resource not found', 404);
                }
                if (error.message.includes('validation') || error.message.includes('Invalid')) {
                    return createErrorResponse(error.message, 400);
                }
            }

            // Default to 500 for unexpected errors
            if (error instanceof Error) {
                return createErrorResponse(error, 500);
            }
            return createErrorResponse('An unexpected error occurred', 500);
        }
    };
}

