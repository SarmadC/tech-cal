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
            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-medium py-2.5 px-6 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
        >
            {pending && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? '...' : 'Subscribe'}
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
        <form ref={formRef} action={formAction} className="mt-0">
            <h2 className="text-xl font-semibold mb-2 text-white">Subscribe to our newsletter</h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-lg mx-auto">
                Get the latest articles and insights delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
                <input
                    type="email"
                    name="email" // The name attribute is crucial for FormData
                    placeholder="Enter your email"
                    required
                    // Theming consistency: Glass style
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm text-white bg-white/5 border border-white/10 placeholder-zinc-600 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium"
                />
                <SubmitButton />
            </div>
        </form>
    );
}