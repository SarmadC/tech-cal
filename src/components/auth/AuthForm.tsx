// src/components/auth/AuthForm.tsx
'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { type AuthFormState } from '@/app/auth/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

interface AuthFormProps {
    action: (prevState: AuthFormState, formData: FormData) => Promise<AuthFormState>;
    initialState: AuthFormState;
    submitButtonText: string;
    children: (state: AuthFormState) => React.ReactNode; // <-- This is the key change
    onSuccess?: () => void; // Optional: for redirects or other side effects
}

export function AuthForm({
    action,
    initialState,
    submitButtonText,
    children,
    onSuccess,
}: AuthFormProps) {
    const [state, formAction] = useActionState(action, initialState);

    useEffect(() => {
        if (state.success) {
            toast.success(state.message || 'Success!');
            if (onSuccess) {
                onSuccess();
            }
        } else if (state.message && (state.errors?._form || Object.keys(state.errors ?? {}).length === 0)) {
            // Show toast only for general form errors or messages without specific field errors
            toast.error(state.message);
        }
    }, [state, onSuccess]);

    return (
        <form action={formAction} className="space-y-6">
            {/* Display form-level errors */}
            {state?.errors?._form && (
                <div
                    className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                    aria-live="polite"
                >
                    {state.errors._form.join(', ')}
                </div>
            )}

            {/* Render the unique fields, passing the state down to them */}
            {children(state)}

            <SubmitButton
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-accent-primary hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary disabled:bg-opacity-50"
            >
                {submitButtonText}
            </SubmitButton>
        </form>
    );
}