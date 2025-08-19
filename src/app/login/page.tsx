// src/app/login/page.tsx - WITH EXTENSIVE DEBUGGING (Fixed ESLint errors)
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { loginAction, oauthSignInAction } from '@/app/auth/actions';
import { AuthForm, AuthProviders } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import type { OAuthProvider } from '@/types';
import type { AuthFormState } from '@/app/auth/actions';

// Type for debug information
interface DebugInfo {
    env?: {
        NEXT_PUBLIC_SUPABASE_URL: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
        NEXT_PUBLIC_SITE_URL: string;
        NEXT_PUBLIC_VERCEL_URL: string;
        NODE_ENV: string;
    };
    authState?: {
        initialized: boolean;
        loading: boolean;
        hasUser: boolean;
        userEmail?: string;
        hasSession: boolean;
        timeInState: number;
    };
}

// Debug helper to log with timestamp and environment info
const debugLog = (message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const env = typeof window !== 'undefined' ? window.location.hostname : 'server';
    console.log(`[LOGIN DEBUG ${timestamp}] [${env}] ${message}`, data || '');
};

const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, initialized, loading, session } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [loginAttempted, setLoginAttempted] = useState(false);
    const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
    const [formState, setFormState] = useState<AuthFormState | null>(null);
    const mountTimeRef = useRef(Date.now());

    // Get the redirect parameter from URL (if any)
    const redirectTo = searchParams.get('redirect') || '/dashboard';

    // Debug: Log component mount
    useEffect(() => {
        const mountTime = mountTimeRef.current;

        debugLog('Login page mounted', {
            mountTime,
            url: window.location.href,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            cookies: document.cookie ? 'present' : 'none',
            localStorage: typeof window !== 'undefined' && window.localStorage ? 'available' : 'unavailable',
        });

        // Check environment variables
        const envCheck = {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'missing',
            NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
            NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL || 'not set',
            NODE_ENV: process.env.NODE_ENV || 'unknown',
        };
        debugLog('Environment check', envCheck);
        setDebugInfo((prevDebugInfo) => ({ ...prevDebugInfo, env: envCheck }));

        return () => {
            debugLog('Login page unmounting', {
                timeOnPage: Date.now() - mountTime,
            });
        };
    }, []);

    // Debug: Log auth state changes
    useEffect(() => {
        debugLog('Auth state changed', {
            initialized,
            loading,
            hasUser: !!user,
            userEmail: user?.email,
            hasSession: !!session,
            sessionExpiry: session?.expires_at,
            isRedirecting,
            loginAttempted,
        });

        setDebugInfo((prevDebugInfo) => ({
            ...prevDebugInfo,
            authState: {
                initialized,
                loading,
                hasUser: !!user,
                userEmail: user?.email,
                hasSession: !!session,
                timeInState: Date.now() - mountTimeRef.current,
            }
        }));
    }, [initialized, loading, user, session, isRedirecting, loginAttempted]);

    // Effect to handle redirect when user is authenticated
    useEffect(() => {
        debugLog('Redirect check effect running', {
            initialized,
            hasUser: !!user,
            isRedirecting,
            redirectTo,
        });

        // Only redirect if:
        // 1. Auth is initialized (we know the auth state)
        // 2. User is logged in
        // 3. We're not already redirecting (prevent multiple redirects)
        if (initialized && user && !isRedirecting) {
            debugLog('🎯 REDIRECT CONDITIONS MET - Initiating redirect', {
                userEmail: user.email,
                redirectTo,
                timeToRedirect: Date.now() - mountTimeRef.current,
            });

            setIsRedirecting(true);

            // Small delay to ensure auth state is fully propagated
            const redirectTimer = setTimeout(() => {
                debugLog('⏩ EXECUTING REDIRECT', { to: redirectTo });
                router.push(redirectTo);
            }, 500);

            return () => {
                debugLog('Cleaning up redirect timer');
                clearTimeout(redirectTimer);
            };
        } else {
            debugLog('Redirect conditions not met', {
                whyNot: {
                    initialized: initialized ? 'yes' : 'NO',
                    user: user ? 'yes' : 'NO',
                    isRedirecting: isRedirecting ? 'ALREADY' : 'no',
                }
            });
        }
    }, [initialized, user, redirectTo, router, isRedirecting]);

    // Debug: Track form state changes
    useEffect(() => {
        if (formState && (formState.message || formState.errors)) {
            debugLog('Form state updated', {
                success: formState.success,
                message: formState.message,
                errors: formState.errors,
            });
        }
    }, [formState]);

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        debugLog('OAuth sign-in initiated', { provider });
        try {
            await oauthSignInAction(provider);
            debugLog('OAuth action completed');
        } catch (error) {
            debugLog('OAuth error', error);
        }
    };

    // Handle successful login
    const handleLoginSuccess = () => {
        const successTime = Date.now();
        debugLog('🎉 LOGIN SUCCESS CALLBACK TRIGGERED', {
            timeFromMount: successTime - mountTimeRef.current,
            authState: {
                initialized,
                hasUser: !!user,
                userEmail: user?.email,
            }
        });

        setLoginAttempted(true);

        // Don't redirect here - let the useEffect above handle it
        // when the auth context updates with the new user
        debugLog('Waiting for auth context to update...');
    };

    // Handle form submission (for additional debugging)
    const handleFormSubmit = () => {
        debugLog('Form submission started', {
            timeOnPage: Date.now() - mountTimeRef.current,
        });
    };

    // Debug: Show loading state
    if (!initialized) {
        debugLog('Showing loading state - auth not initialized');
        return (
            <div className="min-h-screen bg-background-main flex items-center justify-center">
                <div className="text-center">
                    <div className="mb-4">Loading authentication...</div>
                    <div className="text-xs text-gray-500">
                        <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Debug info panel - only show in development or with debug query param */}
                    {(process.env.NODE_ENV === 'development' || searchParams.get('debug') === 'true') && (
                        <div className="mb-4 p-4 bg-gray-800 rounded-lg text-xs text-gray-300">
                            <h3 className="font-bold mb-2">Debug Info:</h3>
                            <pre className="overflow-auto max-h-40">
                                {JSON.stringify(debugInfo, null, 2)}
                            </pre>
                            <div className="mt-2">
                                <button
                                    onClick={() => {
                                        debugLog('Manual debug trigger');
                                        console.log('Full auth context:', { user, session, initialized, loading });
                                        console.log('Cookies:', document.cookie);
                                        console.log('LocalStorage sb-auth-token:', localStorage.getItem('sb-auth-token'));
                                    }}
                                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                                >
                                    Log Full State
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Welcome back</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="font-medium text-accent-primary hover:text-accent-primary-hover">
                                Sign up
                            </Link>
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        <AuthProviders
                            onSelectProvider={handleOAuthSignIn}
                            isPending={false}
                            actionText="Continue"
                        />

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-default"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-background-secondary px-2 text-foreground-tertiary">
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        <div onSubmit={handleFormSubmit}>
                            <AuthForm
                                action={loginAction}
                                initialState={initialState}
                                submitButtonText="Sign In"
                                onSuccess={handleLoginSuccess}
                            >
                                {(state) => {
                                    // Update form state for debugging
                                    if (state !== formState) {
                                        setFormState(state);
                                    }

                                    return (
                                        <>
                                            <div className="space-y-2">
                                                <label htmlFor="email" className="text-sm font-medium text-foreground-secondary">
                                                    Email address
                                                </label>
                                                <input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    autoComplete="email"
                                                    required
                                                    className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
                                                    placeholder="you@example.com"
                                                    onFocus={() => debugLog('Email field focused')}
                                                />
                                                {state.errors?.email && (
                                                    <p className="text-sm text-red-500 mt-1">{state.errors.email[0]}</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label htmlFor="password" className="text-sm font-medium text-foreground-secondary">
                                                    Password
                                                </label>
                                                <input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    autoComplete="current-password"
                                                    required
                                                    className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
                                                    placeholder="••••••••"
                                                    onFocus={() => debugLog('Password field focused')}
                                                />
                                                {state.errors?.password && (
                                                    <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm">
                                                    <Link
                                                        href="/auth/forgot-password"
                                                        className="font-medium text-accent-primary hover:text-accent-primary-hover"
                                                    >
                                                        Forgot your password?
                                                    </Link>
                                                </div>
                                            </div>
                                        </>
                                    );
                                }}
                            </AuthForm>
                        </div>

                        {/* Status indicator */}
                        {loginAttempted && !user && (
                            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg text-sm text-yellow-300">
                                Login attempted but user not detected yet. Waiting for auth update...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}