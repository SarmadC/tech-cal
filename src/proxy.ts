// src/proxy.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'
import { buildCsp, CSP_NONCE_HEADER } from '@/lib/security/csp'

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

function createCspNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
}

function applySecurityHeaders(response: NextResponse, pathname: string, nonce: string) {
  const isEmbedRoute = pathMatchesPrefix(pathname, '/embed')
  const csp = buildCsp({
    frameAncestors: isEmbedRoute ? '*' : "'none'",
    nonce,
  })

  response.headers.set(
    'Content-Security-Policy',
    csp
  )
  response.headers.set(CSP_NONCE_HEADER, nonce)
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const nonce = createCspNonce()
  const pathname = request.nextUrl.pathname
  const isEmbedRoute = pathMatchesPrefix(pathname, '/embed')
  const csp = buildCsp({
    frameAncestors: isEmbedRoute ? '*' : "'none'",
    nonce,
  })

  requestHeaders.set(CSP_NONCE_HEADER, nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
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
              headers: requestHeaders,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
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
  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute(pathname) && !isCrawlablePublicRoute(pathname)) {
    const redirectPath = `${pathname}${request.nextUrl.search}`
    const redirectUrl = new URL('/login', request.url)
    // Keep both params during transition since some pages still read `next`.
    redirectUrl.searchParams.set('redirect', redirectPath)
    redirectUrl.searchParams.set('next', redirectPath)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    applySecurityHeaders(redirectResponse, pathname, nonce)
    return redirectResponse
  }

  // If user is authenticated and trying to access auth routes (login/signup)
  if (user && isAuthRoute(pathname)) {
    const redirectResponse = NextResponse.redirect(new URL('/discover', request.url))
    applySecurityHeaders(redirectResponse, pathname, nonce)
    return redirectResponse
  }

  applySecurityHeaders(response, pathname, nonce)
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
