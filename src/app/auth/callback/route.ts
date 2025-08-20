import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const next = searchParams.get('next') ?? '/calendar'

    console.log('[AUTH CALLBACK] Received request:', { 
        url: request.url,
        hasCode: !!code,
        error,
        errorDescription
    });

    // Handle OAuth provider errors first
    if (error) {
        console.error('[AUTH CALLBACK] OAuth provider error:', { error, errorDescription });
        const errorMessage = encodeURIComponent(errorDescription || `OAuth error: ${error}`);
        return NextResponse.redirect(`${origin}/login?error=oauth-provider-error&message=${errorMessage}`);
    }

    if (!code) {
        console.warn('[AUTH CALLBACK] No authorization code found in request');
        const errorMessage = encodeURIComponent('No authorization code received from OAuth provider');
        return NextResponse.redirect(`${origin}/login?error=oauth-no-code&message=${errorMessage}`);
    }

    try {
        console.log('[AUTH CALLBACK] Exchanging authorization code for session...');
        const supabase = await createClient()
        
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
            console.error('[AUTH CALLBACK] Session exchange error:', exchangeError);
            const errorMessage = encodeURIComponent(`Failed to exchange code for session: ${exchangeError.message}`);
            return NextResponse.redirect(`${origin}/login?error=session-exchange-failed&message=${errorMessage}`);
        }

        if (!data.session) {
            console.error('[AUTH CALLBACK] No session returned after code exchange');
            const errorMessage = encodeURIComponent('Authentication completed but no session was created');
            return NextResponse.redirect(`${origin}/login?error=no-session&message=${errorMessage}`);
        }

        console.log('[AUTH CALLBACK] Session exchange successful:', {
            userId: data.user?.id,
            email: data.user?.email,
            provider: data.user?.app_metadata?.provider,
        });

        // Successful authentication - redirect to intended destination
        console.log(`[AUTH CALLBACK] Redirecting to: ${origin}${next}`);
        return NextResponse.redirect(`${origin}${next}`)

    } catch (error) {
        console.error('[AUTH CALLBACK] Unexpected error during callback:', error);
        const errorMessage = encodeURIComponent(
            error instanceof Error 
                ? `Callback error: ${error.message}`
                : 'An unexpected error occurred during authentication'
        );
        return NextResponse.redirect(`${origin}/login?error=callback-exception&message=${errorMessage}`);
    }
}