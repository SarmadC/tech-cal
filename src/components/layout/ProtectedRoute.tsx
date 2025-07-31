// src/components/layout/ProtectedRoute.tsx
'use client';

import { useRouter, usePathname } from 'next/navigation'; // Add usePathname
import { useEffect } from 'react';
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

    if (loading) {
        return <Loading />;
    }

    const isAuthenticated = !!user;
    const isGuestRoute = allowUnauthenticated;

    if (!isGuestRoute && !isAuthenticated) {
        router.replace(redirectTo);
        return <Loading />;
    }

    if (isGuestRoute && isAuthenticated) {
        router.replace('/dashboard');
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
    const pathname = usePathname(); // Get current path

    useEffect(() => {
        if (loading) return; // Don't do anything while loading

        if (user && pathname !== authenticatedRoute) {
            // OPTIMIZATION: Only redirect if not already on the target page
            router.push(authenticatedRoute);
        } else if (!user && pathname !== unauthenticatedRoute) {
            // OPTIMIZATION: Only redirect if not already on the target page
            router.push(unauthenticatedRoute);
        }
    }, [user, loading, router, authenticatedRoute, unauthenticatedRoute, pathname]);

    return { user, loading };
}