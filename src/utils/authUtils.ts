// src/utils/authUtils.ts

/**
 * Get the OAuth redirect URL consistently for both client and server
 */
export function getOAuthRedirectUrl(): string {
    // Client-side: use window.location.origin
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/auth/callback`;
    }

    // Server-side: construct from environment variables
    const baseUrl = getBaseUrl();
    return `${baseUrl}/auth/callback`;
}

/**
 * Get the base URL for the application
 */
export function getBaseUrl(): string {
    // Client-side: use window.location.origin
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // Server-side: Check for explicit site URL first (development)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
    }

    // Check for Vercel URL (production)
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return process.env.NEXT_PUBLIC_VERCEL_URL.startsWith('http') 
            ? process.env.NEXT_PUBLIC_VERCEL_URL 
            : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }

    // Final fallback for server-side
    return 'http://localhost:3000';
}

/**
 * Construct a password reset URL
 */
export function getPasswordResetUrl(): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/auth/reset-password`;
}

/**
 * Debug logging for auth URLs
 */
export function logAuthUrls(context: string) {
    console.log(`[AUTH DEBUG - ${context}]`, {
        baseUrl: getBaseUrl(),
        redirectUrl: getOAuthRedirectUrl(),
        isClient: typeof window !== 'undefined',
        env: {
            NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
            NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
            NODE_ENV: process.env.NODE_ENV,
        }
    });
}