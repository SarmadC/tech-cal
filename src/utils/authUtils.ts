export function getOAuthRedirectUrl(): string {

    if (typeof window !== 'undefined') {
        return `${window.location.origin}/auth/callback`;
    }


    const baseUrl = getBaseUrl();
    return `${baseUrl}/auth/callback`;
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




export function logAuthUrls(context: string) {
    // --- FIX START ---
    // Use structured logging by passing the dynamic 'context' variable
    // as a property of the logged object, rather than in the string itself.
    console.log("[AUTH DEBUG]", {
        context: context,
        // --- FIX END ---
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