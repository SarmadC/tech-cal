// src/components/layout/ProtectedRoute.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';

interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
    allowUnauthenticated?: boolean;
}

export default function ProtectedRoute({
    children,
    redirectTo = '/login',
    allowUnauthenticated = false,
}: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (loading) return; // Wait for auth to finish loading

        const isAuthenticated = !!user;
        const isGuestRoute = allowUnauthenticated;

        if (!isGuestRoute && !isAuthenticated) {
            // Redirect unauthenticated users away from protected routes
            const currentPath = pathname;
            const redirectUrl = redirectTo + (currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : '');
            router.replace(redirectUrl);
            return;
        }

        if (isGuestRoute && isAuthenticated) {
            // Redirect authenticated users away from guest-only routes
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            router.replace(redirect || '/dashboard');
            return;
        }

        // If we get here, user should see the content
        setShouldRender(true);
    }, [user, loading, router, redirectTo, allowUnauthenticated, pathname]);

    // Show loading while auth is loading or while we're deciding what to do
    if (loading || !shouldRender) {
        return <Loading />;
    }

    return <>{children}</>;
}

// --- Helper Components and Hooks ---

// Higher-order component for protecting entire pages
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

// Component for displaying different content based on auth status
interface AuthGateProps {
    authenticated: React.ReactNode;
    unauthenticated: React.ReactNode;
    loading?: React.ReactNode;
}

export function AuthGate({ authenticated, unauthenticated, loading }: AuthGateProps) {
    const { user, loading: authLoading } = useAuth();

    if (authLoading) {
        return <>{loading || <Loading />}</>;
    }

    return <>{user ? authenticated : unauthenticated}</>;
}

// Hook for redirecting based on auth status
export function useAuthRedirect(
    authenticatedRoute: string = '/dashboard',
    unauthenticatedRoute: string = '/login'
) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return; // Don't do anything while loading

        if (user && pathname === unauthenticatedRoute) {
            // Only redirect if currently on the unauthenticated route
            router.push(authenticatedRoute);
        } else if (!user && pathname === authenticatedRoute) {
            // Only redirect if currently on the authenticated route
            router.push(unauthenticatedRoute);
        }
    }, [user, loading, router, authenticatedRoute, unauthenticatedRoute, pathname]);

    return { user, loading };
}