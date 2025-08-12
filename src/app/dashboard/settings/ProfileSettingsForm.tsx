// src/app/dashboard/settings/ProfileSettingsForm.tsx
'use client'

// 1. CORRECTED IMPORTS
import { useEffect, useActionState } from 'react';      // Core hooks from 'react'
import { useFormStatus } from 'react-dom';              // DOM-specific hooks from 'react-dom'

import { toast } from 'sonner';

import { updateUserProfileAction, FormState } from './actions';
import type { AppProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ProfileSettingsFormProps {
    profile: AppProfile | null;
}

// A dedicated component for the submit button to handle pending state
function SaveButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Saving...' : 'Save Changes'}
        </Button>
    );
}

export default function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
    const initialState: FormState = {
        message: '',
        errors: {},
        success: false,
    };

    // 2. RENAME useFormState to useActionState
    const [state, formAction] = useActionState(updateUserProfileAction, initialState);

    // Use useEffect to show toast notifications based on the server's response.
    useEffect(() => {
        if (state.success) {
            toast.success(state.message);
        } else if (state.message && (state.errors?._form || state.errors?.fullName || state.errors?.timezone)) {
            toast.error(state.errors?._form?.[0] || state.errors?.fullName?.[0] || state.errors?.timezone?.[0] || state.message);
        }
    }, [state]);

    return (
        <form action={formAction} className="space-y-6">
            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-foreground-secondary mb-2">
                    Full Name
                </label>
                <input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile?.fullName || ''}
                    // Theming: Using theme variables for consistency
                    className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                {state.errors?.fullName && (
                    <p className="mt-2 text-sm text-red-500" role="alert">
                        {state.errors.fullName[0]}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-foreground-secondary mb-2">
                    Timezone
                </label>
                <input
                    id="timezone"
                    name="timezone"
                    defaultValue={profile?.timezone || ''}
                    placeholder="e.g., America/New_York"
                    // Theming: Using theme variables for consistency
                    className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                {state.errors?.timezone && (
                    <p className="mt-2 text-sm text-red-500" role="alert">
                        {state.errors.timezone[0]}
                    </p>
                )}
            </div>

            <div className="flex justify-end">
                <SaveButton />
            </div>
        </form>
    );
}