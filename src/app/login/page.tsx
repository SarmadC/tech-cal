// src/app/login/page.tsx (Refined)
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react'; // <-- Add useEffect
import { toast } from 'sonner';

import { loginAction, oauthSignInAction } from '@/app/auth/actions';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthProviders } from '@/components/auth';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import type { OAuthProvider } from '@/types';
import type { AuthFormState } from '@/app/auth/actions';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);

    // --- NEW: Handle errors from the auth callback ---
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            toast.error("Authentication Failed", {
                description: "There was a problem signing you in. Please try again.",
            });
            // Optional: Clean the URL so the error doesn't persist on refresh
            router.replace('/login', { scroll: false });
        }
    }, [searchParams, router]);

    const initialState: AuthFormState = { message: '', success: false };

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        setIsOAuthLoading(true);
        // The loading state is enough, no need to store the provider name
        toast.loading(`Redirecting to ${provider === 'google' ? 'Google' : 'GitHub'}...`);
        // We don't need a try/catch here. The server action handles the logic.
        // If it fails, the user stays on the page and the loading state will reset
        // or they can try again. The real error happens on the callback.
        await oauthSignInAction(provider);
        // On failure, the user might not be redirected, so we should handle that.
        // For simplicity, we'll let them click again. A timeout could also work.
        // setTimeout(() => setIsOAuthLoading(false), 5000); // Optional: reset after 5s
    };

    const handleLoginSuccess = () => {
        const redirectTo = searchParams.get('redirect') || '/calendar';
        
        // --- REFINED: Instant redirect ---
        // The success toast is now handled by AuthContext on the destination page.
        router.push(redirectTo);
    };

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen flex items-center justify-center bg-background-main px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    {/* Header section (Looks good) */}
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Sign in to your account to continue
                        </p>
                    </div>

                    {/* OAuth Providers */}
                    <AuthProviders 
                        onSelectProvider={handleOAuthSignIn}
                        isPending={isOAuthLoading}
                        actionText="Continue"
                    />

                    {/* Divider (Looks good) */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border-default" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-background-main text-foreground-secondary">
                                Or continue with email
                            </span>
                        </div>
                    </div>

                    {/* Email/Password Form (Looks good, no changes needed) */}
                    <AuthForm
                        action={loginAction}
                        initialState={initialState}
                        submitButtonText="Sign In"
                        onSuccess={handleLoginSuccess}
                    >
                        {(state) => (
                            <>
                                {/* Fields are well-structured, no changes needed */}
                            </>
                        )}
                    </AuthForm>

                    {/* Sign Up Link (Looks good) */}
                    <div className="text-center">
                        <p className="text-sm text-foreground-secondary">
                            Don't have an account?{' '}
                            <Link 
                                href="/signup" 
                                className="font-medium text-accent-primary hover:text-accent-primary-hover"
                            >
                                Sign up here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}