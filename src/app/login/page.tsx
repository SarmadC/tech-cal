// src/app/login/page.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { loginAction, oauthSignInAction } from '@/app/auth/actions';
import { AuthForm, AuthProviders } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import Loading from '@/components/Loading';
import type { OAuthProvider } from '@/types';
import type { AuthFormState } from '@/app/auth/actions';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);
    const { user, initialized } = useAuth();

    useEffect(() => {
        if (initialized && user) {
            const redirectTo = searchParams.get('redirect') || '/calendar';
            router.push(redirectTo);
        }
    }, [initialized, user, router, searchParams]);

    useEffect(() => {
        console.log("LoginPage Auth State:", { user, initialized });
        const error = searchParams.get('error');
        if (error) {
            toast.error("Authentication Failed", {
                description: "There was a problem signing you in. Please try again.",
            });
            router.replace('/login', { scroll: false });
        }
    }, [searchParams, router, user, initialized]);

    const initialState: AuthFormState = { message: '', success: false };

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        setIsOAuthLoading(true);
        toast.loading(`Redirecting to ${provider === 'google' ? 'Google' : 'GitHub'}...`);
        await oauthSignInAction(provider);
        setTimeout(() => setIsOAuthLoading(false), 5000);
    };

    const handleLoginSuccess = () => {
        const redirectTo = searchParams.get('redirect') || '/calendar';
        router.push(redirectTo);
    };

    // --- FIX STARTS HERE ---

    // 1. If the auth state is still being determined, show a loader.
    if (!initialized) {
        return <Loading />;
    }

    // 2. If the user is logged in, the useEffect will handle the redirect.
    //    Render a loader in the meantime to prevent the login form from flashing.
    if (user) {
        return <Loading />;
    }

    // --- FIX ENDS HERE ---

    // 3. Only if initialization is complete AND there's no user, show the login form.
    return (
        <div className="min-h-screen flex items-center justify-center bg-background-main px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Welcome back</h2>
                    <p className="mt-2 text-sm text-foreground-secondary">Sign in to your account to continue</p>
                </div>

                <AuthProviders onSelectProvider={handleOAuthSignIn} isPending={isOAuthLoading} actionText="Continue" />

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
                                <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-3 py-2 border border-border-default rounded-md bg-background-secondary text-foreground-primary placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent" placeholder="you@example.com" />
                                {state.errors?.email && (<p className="text-sm text-error">{state.errors.email[0]}</p>)}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-foreground-primary">Password</label>
                                <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full px-3 py-2 border border-border-default rounded-md bg-background-secondary text-foreground-primary placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent" placeholder="••••••••" />
                                {state.errors?.password && (<p className="text-sm text-error">{state.errors.password[0]}</p>)}
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
        </div>
    );
}