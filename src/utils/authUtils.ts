export function getOAuthRedirectUrl(nextPath: string = '/events', baseUrl?: string): string {
    // Ensure nextPath is a safe, absolute path within the app
    const safeNext = typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/events';

    if (baseUrl) {
        const url = new URL('/auth/callback', baseUrl);
        url.searchParams.set('next', safeNext);
        return url.toString();
    }

    if (typeof window !== 'undefined') {
        const url = new URL('/auth/callback', window.location.origin);
        url.searchParams.set('next', safeNext);
        return url.toString();
    }


    const defaultBaseUrl = getBaseUrl();
    const url = new URL('/auth/callback', defaultBaseUrl);
    url.searchParams.set('next', safeNext);
    return url.toString();
}




export function getBaseUrl(): string {

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }


    if (process.env.NEXT_PUBLIC_SITE_URL) {
        return process.env.NEXT_PUBLIC_SITE_URL;
    }


    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return process.env.NEXT_PUBLIC_VERCEL_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_VERCEL_URL
            : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    }


    return 'http://localhost:3000';
}




export function getPasswordResetUrl(baseUrl?: string): string {
    const resolvedBaseUrl = baseUrl || getBaseUrl();
    // Use callback route which will exchange code and redirect to reset-password page
    return `${resolvedBaseUrl}/auth/callback?type=recovery`;
}

/**
 * Get the redirect URL for email confirmation after signup.
 * This uses the /auth/callback route which handles the code exchange.
 */
export function getEmailConfirmationUrl(nextPath: string = '/events', baseUrl?: string): string {
    const safeNext = typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/events';
    const resolvedBaseUrl = baseUrl || getBaseUrl();
    const url = new URL('/auth/callback', resolvedBaseUrl);
    url.searchParams.set('next', safeNext);
    return url.toString();
}




export function logAuthUrls(_context: string) {
    // This function is kept for potential future use but logging is disabled
}
