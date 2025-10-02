// src/components/auth/index.tsx

'use client';
import { SubmitButton } from '@/components/ui/SubmitButton';



export * from './AuthForm';

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
            <SubmitButton 
                className="w-full bg-accent-primary hover:bg-accent-primary-hover !text-accent-primary-foreground"
            >
                {submitButtonText}
            </SubmitButton>
        </form>
    );
}


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

export type { AuthFormState } from '@/app/auth/actions';