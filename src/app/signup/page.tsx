// src/app/signup/page.tsx
'use client'

// 1. CORRECTED IMPORTS
import { useEffect, useActionState } from 'react';      // Core hooks from 'react'
import { useFormStatus } from 'react-dom';              // DOM-specific hooks from 'react-dom'

import Link from 'next/link';
import { toast } from 'sonner';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { signupAction, oauthSignInAction } from '@/app/auth/actions';
import { AuthFormState } from '@/app/auth/actions'; // Import the state type

// The initial state for our form, matching the AuthFormState type
const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

// A dedicated component for the submit button to handle pending state
function SignupButton() {
    // This hook is correct as it comes from 'react-dom'
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
    // 2. RENAME useFormState to useActionState
    const [state, formAction] = useActionState(signupAction, initialState);

    // Use useEffect to show toast notifications based on the server's response
    useEffect(() => {
        if (state.success === false && state.errors?._form) {
            toast.error(state.errors._form[0]);
        }
        // A success toast will be shown on the redirected page (e.g., /dashboard)
        // after the email confirmation message.
    }, [state]);

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                                {/* SVG Logo */}
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Create your account</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-accent-primary hover:text-accent-primary-hover">Sign in</Link>
                        </p>
                    </div>

                    {/* Form Container */}
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        {/* The OAuth buttons can be simplified into a single form */}
                        <div className="space-y-3">
                            {/* Note: In production, you might want to combine these into a single component */}
                            <form action={() => oauthSignInAction('google')}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-default text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all"
                                >
                                    <span>Sign up with Google</span>
                                </button>
                            </form>
                            <form action={() => oauthSignInAction('github')}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-default text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all"
                                >
                                    <span>Sign up with GitHub</span>
                                </button>
                            </form>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-default"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-background-secondary px-2 text-foreground-tertiary">Or sign up with email</span></div>
                        </div>

                        {/* The main form now uses the server action directly */}
                        <form action={formAction} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="text-sm font-medium text-foreground-secondary">Full Name</label>
                                <input id="name" name="name" type="text" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
                                {state.errors?.name && <p className="text-sm text-red-500 mt-1">{state.errors.name[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="email" className="text-sm font-medium text-foreground-secondary">Email address</label>
                                <input id="email" name="email" type="email" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
                                {state.errors?.email && <p className="text-sm text-red-500 mt-1">{state.errors.email[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="password" className="text-sm font-medium text-foreground-secondary">Password</label>
                                <input id="password" name="password" type="password" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
                                {state.errors?.password && <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground-secondary">Confirm Password</label>
                                <input id="confirmPassword" name="confirmPassword" type="password" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
                                {state.errors?.confirmPassword && <p className="text-sm text-red-500 mt-1">{state.errors.confirmPassword[0]}</p>}
                            </div>
                            <div className="flex items-center">
                                <input id="acceptTerms" name="acceptTerms" type="checkbox" className="h-4 w-4 text-accent-primary bg-background-tertiary border-border-default rounded focus:ring-accent-primary" />
                                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-foreground-secondary">
                                    I agree to the <Link href="/legal/terms" className="underline hover:text-accent-primary">Terms of Service</Link>
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