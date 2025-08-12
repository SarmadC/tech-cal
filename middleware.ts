// middleware.ts (Simplified & Focused)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// The primary purpose of this middleware is to refresh the user's session cookie.
// It does this by calling `supabase.auth.getSession()` on every request.
// This is crucial for keeping the user logged in.
// All route protection logic is handled by the `ProtectedRoute` component.

export async function middleware(request: NextRequest) {
    // This `response` object is used to set cookies on the outgoing response.
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // The cookie functions are updated to read from the incoming request
                // and write to the outgoing response.
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    // If a cookie is set, we need to re-create the response
                    // to ensure the new cookie is included.
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    // If a cookie is removed, we need to re-create the response
                    // to ensure the cookie is deleted.
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // This is the core of the middleware. It refreshes the session.
    await supabase.auth.getSession()

    // Return the response, which may have an updated auth cookie.
    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - All image assets
         * This prevents the middleware from running on requests where it's not needed.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}