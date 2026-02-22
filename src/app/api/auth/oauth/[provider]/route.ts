import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getOAuthRedirectUrl } from '@/utils/authUtils'
import type { OAuthProvider } from '@/types'

function getRequestOrigin(request: NextRequest): string {
    const requestUrl = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')

    if (forwardedHost) {
        const protocol = forwardedProto || requestUrl.protocol.replace(':', '')
        return `${protocol}://${forwardedHost}`
    }

    return requestUrl.origin
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ provider: string }> }
) {
    try {
        const { provider } = await context.params
        const { searchParams } = new URL(request.url)
        const nextPath = searchParams.get('next') || '/discover'

        // Validate provider
        if (provider !== 'google' && provider !== 'github') {
            return NextResponse.json(
                { error: 'Invalid OAuth provider' },
                { status: 400 }
            )
        }

        // Build callback origin from the current request/proxy headers.
        // Avoid hardcoding https so localhost callbacks remain http in local dev.
        const origin = getRequestOrigin(request)

        // Get the redirect URL for the callback
        const redirectTo = getOAuthRedirectUrl(nextPath, origin);

        if (!redirectTo || (redirectTo === 'http://localhost:3000/auth/callback' && process.env.NODE_ENV === 'production')) {
            const errorMessage = `Server configuration error: Unable to determine OAuth redirect URL. Got: ${redirectTo}`
            console.error(errorMessage)
            return NextResponse.redirect(
                new URL(`/login?error=config-error&message=${encodeURIComponent(errorMessage)}`, request.url)
            )
        }

        // Create a response object for cookie handling
        // We'll use this to collect cookies during OAuth initiation, then create redirect
        const cookieStore = new Map<string, { value: string; options?: CookieOptions }>()

        // Create Supabase client with proper cookie handling for route handlers
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        // Store cookie to be set on redirect response
                        cookieStore.set(name, { value, options })
                    },
                    remove(name: string, options: CookieOptions) {
                        // Remove cookie by setting empty value
                        cookieStore.set(name, { value: '', options })
                    },
                },
            }
        )

        // Initiate OAuth flow - this will set the PKCE code verifier cookie
        const oauthOptions: {
            redirectTo: string;
            queryParams?: Record<string, string>;
        } = {
            redirectTo,
        };

        // Google-specific query parameters
        if (provider === 'google') {
            oauthOptions.queryParams = {
                access_type: 'offline',
                prompt: 'consent',
            };
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider as OAuthProvider,
            options: oauthOptions,
        })

        if (error) {
            console.error('[OAuth Route Handler] Supabase OAuth Error', { provider, error })
            return NextResponse.redirect(
                new URL(
                    `/login?error=oauth-failed&message=${encodeURIComponent(`Failed to authenticate with ${provider}: ${error.message}`)}`,
                    request.url
                )
            )
        }

        if (!data?.url) {
            console.error(`[OAuth Route Handler] No authentication URL received from ${provider} provider`)
            return NextResponse.redirect(
                new URL(
                    `/login?error=oauth-failed&message=${encodeURIComponent(`No authentication URL received from ${provider} provider.`)}`,
                    request.url
                )
            )
        }

        // Create redirect response and apply all cookies that were set during OAuth initiation
        const redirectResponse = NextResponse.redirect(data.url)
        
        // Apply all cookies that were set during OAuth initiation (including PKCE code verifier)
        cookieStore.forEach((cookie, name) => {
            redirectResponse.cookies.set(name, cookie.value, cookie.options || {})
        })

        // Redirect to OAuth provider with PKCE cookies properly set
        return redirectResponse
    } catch (error) {
        console.error('[OAuth Route Handler] Unexpected error during OAuth', {
            error: error instanceof Error ? error.message : 'Unknown error',
        })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        return NextResponse.redirect(
            new URL(
                `/login?error=oauth-failed&message=${encodeURIComponent(`OAuth error: ${errorMessage}`)}`,
                request.url
            )
        )
    }
}
