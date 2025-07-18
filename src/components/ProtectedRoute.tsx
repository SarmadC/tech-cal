// src/components/ProtectedRoute.tsx

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
  allowUnauthenticated = false 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && !allowUnauthenticated) {
        // User is not authenticated and route requires authentication
        const currentPath = encodeURIComponent(pathname);
        router.push(`${redirectTo}?redirect=${currentPath}`);
      } else if (user && allowUnauthenticated && (pathname === '/login' || pathname === '/signup')) {
        // User is authenticated but trying to access login/signup pages
        router.push('/dashboard');
      }
    }
  }, [user, loading, router, pathname, redirectTo, allowUnauthenticated]);

  // Show loading while checking authentication
  if (loading) {
    return <Loading />;
  }

  // If route requires authentication and user is not authenticated, don't render children
  if (!user && !allowUnauthenticated) {
    return <Loading />;
  }

  return <>{children}</>;
}

// Higher-order component for protecting entire pages
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: { redirectTo?: string; allowUnauthenticated?: boolean }
) {
  const WrappedComponent = (props: P) => {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

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

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push(authenticatedRoute);
      } else {
        router.push(unauthenticatedRoute);
      }
    }
  }, [user, loading, router, authenticatedRoute, unauthenticatedRoute]);

  return { user, loading };
}