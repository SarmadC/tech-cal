// src/app/blog/SubscribeForm.tsx
'use client';

// 1. CORRECTED IMPORTS
import { useEffect, useRef, useActionState } from 'react'; // Core hooks from 'react'
import { useFormStatus } from 'react-dom';              // DOM-specific hooks from 'react-dom'

import { useSnackbar } from '@/contexts/SnackbarContext';
import { subscribeToAction, type SubscribeFormState } from './actions';
import { CircleNotchIcon } from '@phosphor-icons/react';

// A separate button component to automatically handle the loading state
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="bg-accent-primary hover:bg-accent-primary-hover !text-accent-primary-foreground font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
        >
            {pending && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Subscribing...' : 'Subscribe'}
        </button>
    );
}

export default function SubscribeForm() {
    const formRef = useRef<HTMLFormElement>(null);
    const { showSuccess, showError } = useSnackbar();

    const initialState: SubscribeFormState = {
        message: '',
        status: 'idle',
    };

    // 2. RENAME useFormState to useActionState
    const [state, formAction] = useActionState(subscribeToAction, initialState);

    // Use useEffect to show snackbar notifications based on the form's state
    useEffect(() => {
        if (state.status === 'success') {
            showSuccess(state.message);
            formRef.current?.reset(); // Clear the form on success
        } else if (state.status === 'error') {
            showError(state.message);
        }
    }, [state, showSuccess, showError]);

    return (
        <form ref={formRef} action={formAction} className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Stay Updated with Tech News</h2>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
                Get weekly insights on the latest tech events, tutorials, and industry news delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                    type="email"
                    name="email" // The name attribute is crucial for FormData
                    placeholder="Enter your email"
                    required
                    // Theming consistency: Using theme variables
                    className="flex-1 px-4 py-3 rounded-lg text-foreground-primary bg-background-main border border-border-default placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                <SubmitButton />
            </div>
        </form>
    );
}