'use client'

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { signupAction, oauthSignInAction } from '@/app/auth/actions';

// The initial state for our form, matching the AuthFormState type
const initialState = {
    message: '',
    errors: {},
    success: false,
};

// A dedicated component for the submit button to handle pending state
function SignupButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-accent-primary hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary disabled:bg-opacity-50"
        >
            {pending ? 'Creating Account...' : 'Create Account'}
        </button>
    );
}

export default function SignupPage() {
    // 1. Setup useFormState to manage the entire form lifecycle
    const [state, formAction] = useFormState(signupAction, initialState);

    // 2. Use useEffect to show toast notifications based on the server's response
    useEffect(() => {
        if (state.success === false && state.errors?._form) {
            toast.error(state.errors._form[0]);
        }
        // Success is handled by a redirect in the server action, so no success toast is needed.
    }, [state]);

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">{/* SVG Logo */}</div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Create your account</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-accent-primary hover:text-accent-primary-hover">Sign in</Link>
                        </p>
                    </div>

                    {/* Form Container */}
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        {/* The OAuth buttons can be simplified into a single form */}
                        <div className="space-y-3">
                            <form action={() => oauthSignInAction('google')}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all"
                                >
                                    <span>Sign up with Google</span>
                                </button>
                            </form>
                            <form action={() => oauthSignInAction('github')}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all"
                                >
                                    <span>Sign up with GitHub</span>
                                </button>
                            </form>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-color"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-background-secondary px-2 text-foreground-tertiary">Or sign up with email</span></div>
                        </div>

                        {/* 3. The main form now uses the server action directly */}
                        <form action={formAction} className="space-y-4">
                             <div>
                                <label htmlFor="name" className="text-sm font-medium text-foreground-secondary">Full Name</label>
                                <input id="name" name="name" type="text" required className="mt-1 block w-full px-3 py-2 border border-border-color rounded-lg" />
                                {state.errors?.name && <p className="text-sm text-red-500 mt-1">{state.errors.name[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="email" className="text-sm font-medium text-foreground-secondary">Email address</label>
                                <input id="email" name="email" type="email" required className="mt-1 block w-full px-3 py-2 border border-border-color rounded-lg" />
                                {state.errors?.email && <p className="text-sm text-red-500 mt-1">{state.errors.email[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="password"className="text-sm font-medium text-foreground-secondary">Password</label>
                                <input id="password" name="password" type="password" required className="mt-1 block w-full px-3 py-2 border border-border-color rounded-lg" />
                                {state.errors?.password && <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>}
                            </div>
                             <div>
                                <label htmlFor="confirmPassword"className="text-sm font-medium text-foreground-secondary">Confirm Password</label>
                                <input id="confirmPassword" name="confirmPassword" type="password" required className="mt-1 block w-full px-3 py-2 border border-border-color rounded-lg" />
                                {state.errors?.confirmPassword && <p className="text-sm text-red-500 mt-1">{state.errors.confirmPassword[0]}</p>}
                            </div>
                            <div className="flex items-center">
                                <input id="acceptTerms" name="acceptTerms" type="checkbox" className="h-4 w-4 text-accent-primary border-gray-300 rounded" />
                                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-foreground-secondary">
                                    I agree to the <Link href="/legal/terms" className="underline">Terms of Service</Link>
                                </label>
                            </div>
                            {state.errors?.acceptTerms && <p className="text-sm text-red-500">{state.errors.acceptTerms[0]}</p>}

                            <SignupButton />
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}