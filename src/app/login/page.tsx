// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import { LoginForm, OAuthProvider } from '@/types';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [urlError, setUrlError] = useState('');

    const searchParams = useSearchParams();

    // Handle initial error from URL (e.g., failed OAuth callback)
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            switch (errorParam) {
                case 'auth_callback_failed':
                    setUrlError('Authentication failed. Please try again.');
                    break;
                case 'access_denied':
                    setUrlError('Access was denied. Please try again.');
                    break;
                default:
                    setUrlError('An unknown error occurred during authentication.');
            }
        }
    }, [searchParams]);

    // --- MUTATION for Email/Password Sign In ---
    const { mutate: signIn, isPending: isSigningIn, error: signInError } = useMutation({
        mutationFn: (credentials: LoginForm) => AuthService.signIn(credentials),
        onSuccess: (result) => {
            if (!result.success) {
                // Manually throw an error to trigger the `error` state in the mutation
                throw new Error(result.error || 'Sign in failed');
            }
            // On success, AuthContext's onAuthStateChange listener will handle the redirect.
            console.log('Sign in successful, redirecting...');
        },
    });
    
    // --- MUTATION for OAuth Sign In ---
    const { mutate: signInWithOAuth, isPending: isSigningInWithOAuth, error: oAuthError } = useMutation({
        mutationFn: (provider: OAuthProvider) => AuthService.signInWithOAuth(provider),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'OAuth sign in failed');
            }
            // Browser will be redirected by Supabase, this is just for feedback.
            console.log(result.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        signIn({ email, password });
    };

    const combinedError = urlError || signInError?.message || oAuthError?.message;
    const isSubmitting = isSigningIn || isSigningInWithOAuth;

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                                {/* SVG Logo */}
                            </div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Welcome back</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-medium text-accent-primary hover:text-accent-primary-hover">
                                Sign up free
                            </Link>
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        {combinedError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {combinedError}
                            </div>
                        )}
                        
                        <div className="space-y-3">
                            <button type="button" onClick={() => signInWithOAuth('google')} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50">
                                {/* Google SVG */}
                                <span>Continue with Google</span>
                            </button>
                            <button type="button" onClick={() => signInWithOAuth('github')} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50">
                                {/* GitHub SVG */}
                                <span>Continue with GitHub</span>
                            </button>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-color"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-background-secondary px-2 text-foreground-tertiary">Or continue with email</span></div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address</label>
                                    <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="you@example.com" />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">Password</label>
                                    <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="••••••••" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-accent-primary focus:ring-accent-primary border-border-color rounded" />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground-secondary">Remember me</label>
                                </div>
                                <Link href="/forgot-password" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">Forgot password?</Link>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center disabled:opacity-50">
                                {isSigningIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSigningIn ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}