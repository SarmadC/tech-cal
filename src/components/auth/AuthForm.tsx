// src/components/auth/AuthForm.tsx
// Extract this from your index.tsx file if needed

'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { type AuthFormState } from '@/app/auth/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

interface AuthFormProps {
    action: (prevState: AuthFormState, formData: FormData) => Promise<AuthFormState>;
    initialState: AuthFormState;
    submitButtonText: string;
    children: (state: AuthFormState) => React.ReactNode;
    onSuccess?: () => void;
}

export function AuthForm({
    action,
    initialState,
    submitButtonText,
    children,
    onSuccess,
}: AuthFormProps) {
    const [state, formAction] = useActionState(action, initialState);
    const hasHandledSuccess = useRef(false);

    useEffect(() => {
        // Only process success once to avoid multiple calls
        if (state.success && !hasHandledSuccess.current) {
            hasHandledSuccess.current = true;
            console.log('AuthForm: Success detected, showing toast and calling onSuccess');
            toast.success(state.message || 'Success!');
            
            // Give the auth context time to update before calling onSuccess
            // This ensures the auth state change has propagated
            setTimeout(() => {
                if (onSuccess) {
                    console.log('AuthForm: Calling onSuccess callback');
                    onSuccess();
                }
            }, 500); // 500ms delay to ensure auth context has updated
        } else if (state.message && !state.success && (state.errors?._form || Object.keys(state.errors ?? {}).length === 0)) {
            // Show error toast only for general form errors
            toast.error(state.message);
        }

        // Reset the flag when state changes back to not successful
        if (!state.success) {
            hasHandledSuccess.current = false;
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

            <SubmitButton className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-accent-primary hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary disabled:bg-opacity-50">
                {submitButtonText}
            </SubmitButton>
        </form>
    );
}