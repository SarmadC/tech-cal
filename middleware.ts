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

    // Protected routes that require authentication
    const protectedRoutes = ['/discover', '/calendar', '/dashboard', '/hackathons', '/onboarding'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // RULE 1: If user is not logged in, and they are trying to access a protected route, redirect to /login
    if (!user && isProtectedRoute) {
        // User not found, redirecting to login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // RULE 2: If user is logged in, and they are trying to access a public-only route, redirect to /discover
    if (user && (pathname === '/login' || pathname === '/signup')) {
        // User is logged in, redirecting to discover page
        return NextResponse.redirect(new URL('/discover', request.url))
    }

    // RULE 3: If user is logged in and accessing app pages, check if they've completed onboarding
    // This encourages users to complete their career profile for better recommendations
    // Can be disabled by setting DISABLE_ONBOARDING_REDIRECT=true in environment variables
    // Skip this check for onboarding pages themselves and settings
    const appRoutes = ['/discover', '/calendar', '/dashboard', '/hackathons', '/events'];
    const isAppRoute = appRoutes.some(route => pathname.startsWith(route));
    const isOnboardingPage = pathname.startsWith('/onboarding');
    const isSettingsPage = pathname.startsWith('/dashboard/settings');
    const onboardingRedirectEnabled = process.env.DISABLE_ONBOARDING_REDIRECT !== 'true';

    if (user && isAppRoute && !isOnboardingPage && !isSettingsPage && onboardingRedirectEnabled) {
        try {
            // Check if user has completed career onboarding
            // First check the career_profiles table
            const { data: careerProfile, error } = await supabase
                .from('career_profiles')
                .select('user_id')
                .eq('user_id', user.id)
                .single();

            const hasCareerProfile = !error && careerProfile;

            // If no career profile found, check the legacy preferences as fallback
            if (!hasCareerProfile) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('preferences')
                    .eq('id', user.id)
                    .single();

                const preferences = profile?.preferences as Record<string, unknown> | null;
                const hasLegacyOnboarding = preferences?.careerOnboardingCompleted === true;

                // If neither exists, redirect to onboarding with a helpful message
                if (!hasLegacyOnboarding) {
                    const onboardingUrl = new URL('/onboarding/career', request.url);
                    // Add a query parameter to show a welcome message
                    onboardingUrl.searchParams.set('from', 'middleware');
                    return NextResponse.redirect(onboardingUrl);
                }
            }
        } catch (error) {
            // If there's an error checking onboarding status, log it but don't block access
            console.warn('Error checking onboarding status in middleware:', error);
            // Allow the user to proceed - they'll see generic recommendations
        }
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