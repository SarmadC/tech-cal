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


