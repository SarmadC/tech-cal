// src/app/login/page.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSnackbar } from '@/contexts/SnackbarContext';
import posthog from 'posthog-js';

import { loginAction, resendVerificationAction } from '@/app/auth/actions';
import { AuthForm, AuthProviders } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import type { OAuthProvider } from '@/types';
import type { AuthFormState } from '@/app/auth/actions';

function VerificationNotice({ email }: { email?: string }) {
    const { showSuccess, showError } = useSnackbar();
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleResend = useCallback(async () => {
        if (isResending || cooldown > 0) return;

        if (!email) {
            showError('Please enter your email above to resend the verification link.');
            return;
        }

        setIsResending(true);
        try {
            const result = await resendVerificationAction(email);
            if (result.success) {
                showSuccess(result.message || 'Verification email sent! Check your inbox.');
                setCooldown(60);
            } else {
                showError(result.message || 'Unable to send verification email. Please try again.');
            }
        } catch (error) {
            console.error('[LoginPage] Resend verification error:', error);
            showError('An error occurred while resending. Please try again.');
        } finally {
            setIsResending(false);
        }
    }, [email, isResending, cooldown, showSuccess, showError]);

    return (
        <div className="rounded-2xl border border-border-default bg-background-secondary p-5 text-left shadow-sm">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
                    <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <div className="flex-1 space-y-2">
                    <div>
                        <p className="text-sm font-semibold text-foreground-primary">Verify your email to sign in</p>
                        <p className="text-sm text-foreground-secondary">
                            We sent a confirmation link{email ? ' to' : ''}{' '}
                            {email ? <span className="font-medium text-foreground-primary">{email}</span> : 'to your email address'}.
                            Click the link to activate your account.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleResend}
                            disabled={isResending || cooldown > 0}
                            className="inline-flex items-center justify-center rounded-lg border border-border-default bg-background-main px-3 py-2 text-sm font-medium text-foreground-primary transition-colors hover:border-accent-primary/40 hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isResending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
                        </button>
                        <span className="text-xs text-foreground-tertiary">Check spam if you don&apos;t see it.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showError, showInfo } = useSnackbar();
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);
    const [oauthStartTime, setOauthStartTime] = useState<number | null>(null);
    const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
    const [hasRedirected, setHasRedirected] = useState(false);
    const { user, initialized, loading } = useAuth();

    const getIntendedDestination = useCallback(() => {
        const destination = searchParams.get('redirect') || searchParams.get('next') || '/events';

        if (!destination.startsWith('/')) {
            return '/events';
        }

        return destination === '/' ? '/events' : destination;
    }, [searchParams]);

    // Debounced redirect to prevent multiple rapid redirects
    useEffect(() => {
        if (initialized && user && !hasRedirected && !loading) {
            const redirectTo = getIntendedDestination();
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => {
                setHasRedirected(true);
                router.push(redirectTo);
            }, 50);
        }
    }, [initialized, user, router, hasRedirected, loading, getIntendedDestination]);

    useEffect(() => {

        const error = searchParams.get('error');
        const message = searchParams.get('message');

        if (error) {
            console.error('[LoginPage] Authentication error:', { error, message });

            // Clear OAuth loading state on error
            setTimeout(() => {
                setIsOAuthLoading(false);
                setOauthStartTime(null);
                setPendingProvider(null);
            }, 0);

            let errorTitle = "Authentication Failed";
            const errorDescription = message || "There was a problem signing you in. Please try again.";

            switch (error) {
                case 'oauth-failed':
                    // Don't show error if it's just NEXT_REDIRECT (which is normal)
                    if (message === 'NEXT_REDIRECT') {
                        router.replace('/login', { scroll: false });
                        return;
                    }
                    errorTitle = "OAuth Sign-In Failed";
                    break;
                case 'config-error':
                    errorTitle = "Configuration Error";
                    break;
                case 'oauth-provider-error':
                    errorTitle = "OAuth Provider Error";
                    break;
                case 'session-exchange-failed':
                    errorTitle = "Session Exchange Failed";
                    break;
                case 'oauth-no-code':
                case 'no-code':
                    errorTitle = "OAuth Authorization Failed";
                    break;
                case 'no-session':
                    errorTitle = "Session Creation Failed";
                    break;
                case 'callback-exception':
                    errorTitle = "Authentication Callback Error";
                    break;
            }

            showError(`${errorTitle}: ${errorDescription}`);

            // Clean up URL
            router.replace('/login', { scroll: false });
        }
    }, [searchParams, router, showError]);

    // OAuth timeout handler
    useEffect(() => {
        if (!oauthStartTime || !isOAuthLoading) return;

        const timeoutId = setTimeout(() => {
            const elapsed = Date.now() - oauthStartTime;
            console.warn('[LoginPage] OAuth timeout after', elapsed, 'ms');

            setIsOAuthLoading(false);
            setOauthStartTime(null);
            setPendingProvider(null);

            showError("Sign-in Timeout: The sign-in process is taking longer than expected. Please try again.");
        }, 30000); // 30 second timeout

        return () => clearTimeout(timeoutId);
    }, [oauthStartTime, isOAuthLoading, showError]);

    // Monitor auth state changes to clear OAuth loading
    useEffect(() => {
        if (isOAuthLoading && (user || (!loading && initialized))) {
            setTimeout(() => {
                setIsOAuthLoading(false);
                setOauthStartTime(null);
                setPendingProvider(null);
            }, 0);
        }
    }, [user, loading, initialized, isOAuthLoading]);

    const initialState: AuthFormState = { message: '', success: false };
    const verificationEmail = searchParams.get('email') || '';
    const showVerificationNotice =
        searchParams.get('verify') === '1' || searchParams.get('verify') === 'true';

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        setIsOAuthLoading(true);
        setOauthStartTime(Date.now());
        setPendingProvider(provider);

        // Track OAuth login initiated
        posthog.capture('oauth_login_initiated', {
            provider: provider,
            page: 'login',
        });

        // Show info message for OAuth redirect
        showInfo(`Redirecting to ${provider === 'google' ? 'Google' : 'GitHub'}...`);

        try {
            const intendedNext = getIntendedDestination();

            // Use route handler instead of server action for proper cookie handling
            const oauthUrl = new URL(`/api/auth/oauth/${provider}`, window.location.origin);
            oauthUrl.searchParams.set('next', intendedNext);

            // Navigate to route handler which will handle OAuth initiation and redirect
            window.location.href = oauthUrl.toString();
        } catch (error) {
            // This is an actual error
            console.error('[LoginPage] OAuth sign-in error:', error);
            posthog.captureException(error);
            setIsOAuthLoading(false);
            setOauthStartTime(null);
            setPendingProvider(null);
            showError("Sign-in Error: Failed to start the sign-in process. Please try again.");
        }
    };

    const handleLoginSuccess = () => {
        const redirectTo = getIntendedDestination();
        router.push(redirectTo);
    };

    // --- IMPROVED FIX ---

    // 1. If the auth state is still being determined, show a loader.
    if (!initialized || loading) {
        return <Loading />;
    }

    // 2. If the user is logged in or we've started a redirect, show a loader
    //    to prevent the login form from flashing during redirect.
    if (user || hasRedirected) {
        return <Loading />;
    }

    // --- END IMPROVED FIX ---

    // 3. Only if initialization is complete AND there's no user, show the login form.
    return (
        <main className="min-h-screen flex items-center justify-center bg-background-main px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <h1 className="sr-only">Sign in to Kure-Cal</h1>
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Welcome back</h2>
                    <p className="mt-2 text-sm text-foreground-secondary">Sign in to your account to continue</p>
                </div>

                {showVerificationNotice && (
                    <VerificationNotice email={verificationEmail} />
                )}

                <AuthProviders
                    onSelectProvider={handleOAuthSignIn}
                    isPending={isOAuthLoading}
                    pendingProvider={pendingProvider}
                    actionText="Continue"
                />

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-default" /></div>
                    <div className="relative flex justify-center text-sm"><span className="px-2 bg-background-main text-foreground-secondary">Or continue with email</span></div>
                </div>

                <AuthForm action={loginAction} initialState={initialState} submitButtonText="Sign In" onSuccess={handleLoginSuccess}>
                    {(state) => (
                        <>
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-foreground-primary">Email address</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    defaultValue={verificationEmail}
                                    className="w-full px-3 py-2 border border-border-default rounded-md bg-background-secondary text-foreground-primary placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                    placeholder="you@example.com"
                                    aria-describedby={state.errors?.email ? "email-error" : undefined}
                                    aria-invalid={state.errors?.email ? "true" : "false"}
                                />
                                {state.errors?.email && (
                                    <p id="email-error" className="text-sm text-error" role="alert">
                                        {state.errors.email[0]}
                                    </p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-foreground-primary">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="w-full px-3 py-2 border border-border-default rounded-md bg-background-secondary text-foreground-primary placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                                    placeholder="••••••••"
                                    aria-describedby={state.errors?.password ? "password-error" : undefined}
                                    aria-invalid={state.errors?.password ? "true" : "false"}
                                />
                                {state.errors?.password && (
                                    <p id="password-error" className="text-sm text-error" role="alert">
                                        {state.errors.password[0]}
                                    </p>
                                )}
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-accent-primary focus:ring-accent-primary border-border-default rounded" />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground-secondary">Remember me</label>
                                </div>
                                <div className="text-sm">
                                    <Link href="/forgot-password" className="font-medium text-accent-primary hover:text-accent-primary-hover">Forgot your password?</Link>
                                </div>
                            </div>
                        </>
                    )}
                </AuthForm>

                <div className="text-center">
                    <p className="text-sm text-foreground-secondary">
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" className="font-medium text-accent-primary hover:text-accent-primary-hover">Sign up here</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}

// Wrap in Suspense to handle useSearchParams() in Next.js 15+
export default function LoginPage() {
    return (
        <Suspense fallback={<Loading />}>
            <LoginPageContent />
        </Suspense>
    );
}
