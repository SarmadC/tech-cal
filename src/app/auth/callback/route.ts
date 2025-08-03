// src/app/auth/callback/route.ts
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// This is a Route Handler for the GET method
export async function GET(request: Request) {
    // The `/auth/callback` route is required for the server-side auth flow implemented
    // by the `@supabase/ssr` package. It exchanges an auth code for the user's session.
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if `next` is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // On successful authentication, redirect the user to the page
            // they were trying to access or to the dashboard.
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    console.error('Error in auth callback:', searchParams.get('error_description'))
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&message=Could not authenticate user`)
}