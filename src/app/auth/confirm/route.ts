// src/app/auth/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Alias route for /auth/callback
 * Some Supabase email templates may use /auth/confirm as the default path.
 * This route forwards all query parameters to /auth/callback for processing.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)

    // Build the callback URL with all original query parameters
    const callbackUrl = new URL('/auth/callback', origin)
    searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value)
    })

    return NextResponse.redirect(callbackUrl)
}
