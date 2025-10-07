export function getOAuthRedirectUrl(nextPath: string = '/discover'): string {
    // Ensure nextPath is a safe, absolute path within the app
    const safeNext = typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/discover';

    if (typeof window !== 'undefined') {
        const url = new URL('/auth/callback', window.location.origin);
        url.searchParams.set('next', safeNext);
        return url.toString();
    }


    const baseUrl = getBaseUrl();
    const url = new URL('/auth/callback', baseUrl);
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




export function getPasswordResetUrl(): string {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/auth/reset-password`;
}




export function logAuthUrls(_context: string) {
    // This function is kept for potential future use but logging is disabled
}