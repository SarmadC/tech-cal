// src/proxy.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/discover',
  '/calendar',
  '/dashboard',
  '/hackathons',
  '/settings',
  '/onboarding',
]

// Routes that should redirect authenticated users away
const AUTH_ROUTES = ['/login', '/signup']

// Public landing/index routes that must remain crawlable.
const CRAWLABLE_PUBLIC_PREFIXES = [
  '/events',
  '/resources',
  '/blog',
  '/pricing',
  '/contact',
  '/about',
  '/legal',
  '/embed',
]

export function pathMatchesPrefix(pathname: string, routePrefix: string): boolean {
  return pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathMatchesPrefix(pathname, route))
}

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathMatchesPrefix(pathname, route))
}

export function isCrawlablePublicRoute(pathname: string): boolean {
  return CRAWLABLE_PUBLIC_PREFIXES.some(route => pathMatchesPrefix(pathname, route))
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie on the request for subsequent middleware/routes
          request.cookies.set({ name, value, ...options })
          // Set cookie on the response for the browser
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session if expired - this is important for keeping the session alive
  // Using getUser() instead of getSession() for security (validates with Supabase server)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute(pathname) && !isCrawlablePublicRoute(pathname)) {
    const redirectPath = `${pathname}${request.nextUrl.search}`
    const redirectUrl = new URL('/login', request.url)
    // Keep both params during transition since some pages still read `next`.
    redirectUrl.searchParams.set('redirect', redirectPath)
    redirectUrl.searchParams.set('next', redirectPath)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated and trying to access auth routes (login/signup)
  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL('/discover', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
