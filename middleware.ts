import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: CookieOptions) {
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    // This refreshes the session cookie
    const { data: { user } } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl

    // RULE 1: If user is not logged in, and they are trying to access a protected route, redirect to /login
    if (!user && (pathname.startsWith('/calendar') || pathname.startsWith('/dashboard') || pathname.startsWith('/discover'))) {
        // User not found, redirecting to login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // RULE 2: If user is logged in, and they are trying to access a public-only route, redirect to /discover
    if (user && (pathname === '/login' || pathname === '/signup')) {
        // User is logged in, redirecting to discover page
        return NextResponse.redirect(new URL('/discover', request.url))
    }

    // Middleware processing complete
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
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}