import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/calendar'

    // --- START DEBUG LOGS ---
    console.log(`[AUTH CALLBACK] Received request for URL: ${request.url}`);

    if (code) {
        console.log(`[AUTH CALLBACK] Authorization code found. Exchanging for session...`);
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            console.log(`[AUTH CALLBACK] Session exchange successful. Redirecting to: ${origin}${next}`);
            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error(`[AUTH CALLBACK] Session exchange error: ${error.message}`);
        }
    } else {
        console.warn(`[AUTH CALLBACK] No authorization code found in the request.`);
    }

    console.error('[AUTH CALLBACK] Redirecting to login page with error.');
    // --- END DEBUG LOGS ---

    return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}