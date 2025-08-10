'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import { ReactNode, useEffect } from 'react';

// --- HELPER COMPONENT FOR REDIRECTION ---
function Redirect({ to }: { to: string }) {
    const router = useRouter();
    useEffect(() => {
        router.replace(to);
    }, [router, to]);
    return <Loading />;
}

interface ProtectedRouteProps {
    children: ReactNode;
    redirectTo?: string;
    allowUnauthenticated?: boolean;
}

export default function ProtectedRoute({
    children,
    redirectTo = '/login',
    allowUnauthenticated = false,
}: ProtectedRouteProps) {
    const { user, initialized } = useAuth();
    // const router = useRouter(); // <-- REMOVED: This was unused.
    const pathname = usePathname();
    const searchParams = useSearchParams();

    if (!initialized) {
        return <Loading />;
    }

    const isAuthenticated = !!user;

    if (allowUnauthenticated && isAuthenticated) {
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        return <Redirect to={redirectUrl} />;
    }

    if (!allowUnauthenticated && !isAuthenticated) {
        const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
        return <Redirect to={redirectUrl} />;
    }

    return <>{children}</>;
}

// --- Helper Components and Hooks ---

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

// vvv THIS IS THE FIX for AuthGateProps vvv
// Define the props inline here.
export function AuthGate({
    authenticated,
    unauthenticated,
    loading
}: {
    authenticated: ReactNode;
    unauthenticated: ReactNode;
    loading?: ReactNode;
}) {
    const { user, loading: authLoading } = useAuth();

    if (authLoading) {
        return <>{loading || <Loading />}</>;
    }

    return <>{user ? authenticated : unauthenticated}</>;
}

export function useAuthRedirect(
    authenticatedRoute: string = '/dashboard',
    unauthenticatedRoute: string = '/login'
) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;
        if (user && pathname === unauthenticatedRoute) {
            router.push(authenticatedRoute);
        } else if (!user && pathname === authenticatedRoute) {
            router.push(unauthenticatedRoute);
        }
    }, [user, loading, router, authenticatedRoute, unauthenticatedRoute, pathname]);

    return { user, loading };
}