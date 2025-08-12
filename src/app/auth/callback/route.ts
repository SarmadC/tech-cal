// src/app/auth/callback/route.ts (Refined & Simplified)
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    // The `origin` is the only URL piece we need, it's reliable.
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    
    // The 'next' param is used for redirecting after sign-in.
    const next = searchParams.get('next') ?? '/calendar'

    // If a code is present, exchange it for a session.
    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error) {
            // A successful exchange automatically sets the auth cookie.
            // Redirecting to the 'next' page is all we need to do.
            // The client-side AuthContext will pick up the session from the cookie.
            console.log('Auth successful. Redirecting to:', `${origin}${next}`);
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // --- Error Handling ---
    // If we are here, it means the code was missing or the exchange failed.
    // Redirect back to the login page with a generic error message.
    // This is more secure than reflecting specific errors from the server.
    console.error('Auth callback error or invalid code. Redirecting to login.');
    return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}