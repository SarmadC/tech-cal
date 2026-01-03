import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const rawNext = searchParams.get('next') ?? '/discover'
    // Sanitize next to avoid open-redirects; ensure leading slash and strip domain
    let next = '/discover'
    try {
        if (typeof rawNext === 'string') {
            if (rawNext.startsWith('http://') || rawNext.startsWith('https://')) {
                const url = new URL(rawNext)
                next = url.pathname + (url.search || '') + (url.hash || '')
            } else if (rawNext.startsWith('/')) {
                next = rawNext
            }
        }

        // Fix: If next is root (landing page), force it to discover
        if (next === '/' || next === '') {
            next = '/discover';
        }
    } catch (_) {
        next = '/discover'
    }

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
        // Track cookies that need to be set/removed on the response
        const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = []

        // Create Supabase client that explicitly reads from request cookies
        // This ensures PKCE code verifier cookie is properly read during session exchange
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        cookiesToSet.push({ name, value, options })
                    },
                    remove(name: string, options: CookieOptions) {
                        cookiesToSet.push({ name, value: '', options: { ...options, maxAge: 0 } })
                    },
                },
            }
        )

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

        // Successful authentication - redirect to intended destination with session cookies
        const response = NextResponse.redirect(`${origin}${next}`)

        // Apply all session cookies set during the exchange
        for (const cookie of cookiesToSet) {
            response.cookies.set(cookie.name, cookie.value, cookie.options)
        }

        return response

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