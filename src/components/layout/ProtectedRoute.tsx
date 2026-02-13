// src/components/layout/ProtectedRoute.tsx (Simplified & Declarative)
'use client';


import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { ReactNode, useEffect } from 'react';

// --- A SIMPLER, INSTANT REDIRECT HELPER ---
// This component's only job is to perform the redirect side-effect.
function Redirect({ to }: { to: string }) {
    const router = useRouter();

    useEffect(() => {
        router.push(to);
    }, [to, router]);

    // Show a loading state while the browser navigates.
    return <Loading />;
}

interface ProtectedRouteProps {
    children: ReactNode;
    redirectTo?: string;
    // This prop means "allow logged-out users". It's for pages like /login, /signup
    allowUnauthenticated?: boolean; 
}

export default function ProtectedRoute({
    children,
    redirectTo = '/login',
    allowUnauthenticated = false,
}: ProtectedRouteProps) {
    const { user, initialized } = useAuth(); // We only need `user` and `initialized`.
    const pathname = usePathname();

    // 1. If the auth state is not yet determined, show a full-page loader.
    // This is the most important gate.
    if (!initialized) {
        return <Loading />;
    }

    const isAuthenticated = !!user;

    // 2. Handle the case where a LOGGED-IN user tries to access a page
    // meant for LOGGED-OUT users (e.g., /login, /signup).
    if (isAuthenticated && allowUnauthenticated) {
        return <Redirect to="/events" />; // Redirect them to the main app page.
    }

    // 3. Handle the case where a LOGGED-OUT user tries to access a
    // protected page.
    if (!isAuthenticated && !allowUnauthenticated) {
        // Construct the redirect URL to send them back here after login.
        const redirectUrl = `${redirectTo}?redirect=${pathname}`;
        return <Redirect to={redirectUrl} />;
    }

    // 4. If neither of the above conditions were met, the user is clear to see the page.
    return <>{children}</>;
}


// The helpers below are already well-written and do not need changes.
// They will benefit from the simpler ProtectedRoute logic.

// Higher-order component version
export function withAuth<P extends object>(
    Component: React.ComponentType<P>,
    options?: { redirectTo?: string; allowUnauthenticated?: boolean }
) {
    const WrappedComponent = (props: P) => (
        <ProtectedRoute {...options}>
            <Component {...props} />
        </ProtectedRoute>
    );
    
    WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
    return WrappedComponent;
}

// Render different content based on auth state
export function AuthGate({
    authenticated,
    unauthenticated,
    loading
}: {
    authenticated: ReactNode;
    unauthenticated: ReactNode;
    loading?: ReactNode;
}) {
    const { user, initialized } = useAuth();
    
    if (!initialized) {
        return <>{loading || <Loading />}</>;
    }
    
    return user ? <>{authenticated}</> : <>{unauthenticated}</>;
}

// Hook for programmatic auth-based redirects
export function useAuthRedirect(
    authenticatedRoute: string = '/calendar',
    unauthenticatedRoute: string = '/login'
) {
    const router = useRouter();
    const { user, initialized, loading } = useAuth();
    
    const redirectToAuth = () => {
        if (initialized && !loading) {
            if (user) {
                router.push(authenticatedRoute);
            } else {
                router.push(unauthenticatedRoute);
            }
        }
    };
    
    return { redirectToAuth, canRedirect: initialized && !loading };
}