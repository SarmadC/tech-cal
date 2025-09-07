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
    // This function is kept for potential future use but logging is disabled
}