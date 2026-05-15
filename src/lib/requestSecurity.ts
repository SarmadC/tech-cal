/**
 * Request Security Utilities
 * 
 * Utilities for securing API requests including size limits and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from './apiErrorHandler';

/**
 * Maximum request body sizes (in bytes)
 */
export const REQUEST_SIZE_LIMITS = {
    SMALL: 10 * 1024,      // 10KB - for simple JSON requests
    MEDIUM: 100 * 1024,   // 100KB - for typical API requests
    LARGE: 1024 * 1024,   // 1MB - for file uploads or large payloads
    EXTRA_LARGE: 10 * 1024 * 1024, // 10MB - for very large operations
} as const;

/**
 * Check request body size and validate it's within limits
 */
export async function validateRequestSize(
    request: NextRequest,
    maxSize: number = REQUEST_SIZE_LIMITS.MEDIUM
): Promise<{ valid: true; body: unknown } | { valid: false; response: NextResponse }> {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > maxSize) {
            return {
                valid: false,
                response: createErrorResponse(
                    `Request body too large. Maximum size: ${Math.round(maxSize / 1024)}KB`,
                    413
                ),
            };
        }
    }

    try {
        // For Next.js, we need to clone the request to read the body
        // But we should be careful not to consume it if size is too large
        const body = await request.json();
        
        // Check actual parsed body size (rough estimate)
        const bodySize = JSON.stringify(body).length;
        if (bodySize > maxSize) {
            return {
                valid: false,
                response: createErrorResponse(
                    `Request body too large. Maximum size: ${Math.round(maxSize / 1024)}KB`,
                    413
                ),
            };
        }

        return { valid: true, body };
    } catch (error) {
        if (error instanceof SyntaxError) {
            return {
                valid: false,
                response: createErrorResponse('Invalid JSON in request body', 400),
            };
        }
        return {
            valid: false,
            response: createErrorResponse('Error parsing request body', 400),
        };
    }
}

/**
 * Validate array length to prevent DoS attacks
 */
export function validateArrayLength<T>(
    array: T[],
    maxLength: number,
    fieldName: string = 'array'
): { valid: true } | { valid: false; response: NextResponse } {
    if (array.length > maxLength) {
        return {
            valid: false,
            response: createErrorResponse(
                `${fieldName} exceeds maximum length of ${maxLength}`,
                400
            ),
        };
    }
    return { valid: true };
}

type OriginAwareRequest = Pick<NextRequest, 'headers'> & {
    nextUrl?: URL;
    url?: string;
};

function getRequestOrigin(request: OriginAwareRequest): string | null {
    if (request.nextUrl?.origin) {
        return request.nextUrl.origin;
    }

    if (typeof request.url === 'string') {
        try {
            return new URL(request.url).origin;
        } catch {
            return null;
        }
    }

    const forwardedHost =
        request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    if (!forwardedHost) {
        return null;
    }

    const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
    return `${protocol}://${forwardedHost}`;
}

function normalizeOriginHeader(value: string | null): string | null {
    if (!value) {
        return null;
    }

    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

export function validateSameOriginRequest(
    request: OriginAwareRequest
): string | null {
    const requestOrigin = getRequestOrigin(request);
    if (!requestOrigin) {
        return null;
    }

    const originHeader = normalizeOriginHeader(request.headers.get('origin'));
    const refererOrigin = normalizeOriginHeader(request.headers.get('referer'));

    if (!originHeader && !refererOrigin) {
        return null;
    }

    if (originHeader && originHeader !== requestOrigin) {
        return 'Cross-site requests are not allowed.';
    }

    if (!originHeader && refererOrigin && refererOrigin !== requestOrigin) {
        return 'Cross-site requests are not allowed.';
    }

    return null;
}

export function getClientIdentifier(
    request: Pick<NextRequest, 'headers'>
): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const [firstAddress] = forwardedFor
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        if (firstAddress) {
            return firstAddress;
        }
    }

    const directAddress =
        request.headers.get('cf-connecting-ip') ??
        request.headers.get('x-real-ip');

    return directAddress?.trim() || null;
}


