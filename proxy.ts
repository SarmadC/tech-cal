import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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

    // Define which routes are protected (require authentication)
    const protectedRoutes = ['/discover', '/calendar', '/dashboard', '/hackathons', '/events'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // Minimal auth gating: if no user on a protected route, redirect to login
    if (!user && isProtectedRoute) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Keep convenience redirect: logged-in users visiting auth pages go to /discover
    if (user && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/discover', request.url))
    }

    // Middleware processing complete
    return response
}

export const config = {
    // Narrow matcher to only routes that need auth gating or auth-page redirects
    matcher: [
        '/discover/:path*',
        '/calendar/:path*',
        '/dashboard/:path*',
        '/hackathons/:path*',
        '/events/:path*',
        '/login',
        '/signup',
    ],
}
