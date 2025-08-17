// src/components/auth/index.tsx
/**
 * Consolidated Authentication Components
 * Preserves your existing AuthForm and SimpleForm logic
 */

'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { type AuthFormState } from '@/app/auth/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';

// ============================================
// AUTHFORM - Your existing logic preserved
// ============================================

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

            <SubmitButton className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-accent-primary hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary disabled:bg-opacity-50">
                {submitButtonText}
            </SubmitButton>
        </form>
    );
}

// ============================================
// SIMPLEFORM - Your existing logic preserved
// ============================================

interface SimpleFormProps {
    action: (payload: FormData) => void;
    submitButtonText: string;
    children: React.ReactNode;
    className?: string;
}

export function SimpleForm({
    action,
    submitButtonText,
    children,
    className = "space-y-6"
}: SimpleFormProps) {
    return (
        <form action={action} className={className}>
            {children}
            <SubmitButton className="w-full">
                {submitButtonText}
            </SubmitButton>
        </form>
    );
}

// ============================================
// RE-EXPORT AuthProviders
// ============================================

export { default as AuthProviders } from './AuthProviders';

// ============================================
// OPTIONAL: Shared Form Field Components
// ============================================

/**
 * These are optional utilities you can use in your forms
 * to maintain consistency across auth pages
 */

interface FormFieldProps {
    label?: string;
    error?: string[];
    children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
    return (
        <div>
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {label}
                </label>
            )}
            {children}
            {error && error.length > 0 && (
                <p className="mt-1 text-sm text-destructive" role="alert">
                    {error[0]}
                </p>
            )}
        </div>
    );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string[];
}

export function FormInput({ error, className = "", ...props }: FormInputProps) {
    return (
        <input
            className={`w-full px-3 py-2 bg-background-secondary border ${error ? 'border-destructive' : 'border-border-default'
                } rounded-lg text-foreground-primary placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-colors ${className}`}
            {...props}
        />
    );
}

// ============================================
// EXPORT TYPE
// ============================================

export type { AuthFormState } from '@/app/auth/actions';