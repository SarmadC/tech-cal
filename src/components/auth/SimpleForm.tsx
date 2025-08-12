// src/components/auth/SimpleForm.tsx
'use client';

import { SubmitButton } from '@/components/ui/SubmitButton';

interface SimpleFormProps {
    action: (payload: FormData) => void;
    submitButtonText: string;
    children: React.ReactNode;
}

export function SimpleForm({ action, submitButtonText, children }: SimpleFormProps) {
    return (
        <form action={action} className="space-y-6">
            {children}
            <SubmitButton
                className="w-full"
            >
                {submitButtonText}
            </SubmitButton>
        </form>
    );
}