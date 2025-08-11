'use client'

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { updateUserProfileAction, FormState } from './actions';
import type { AppProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';


interface ProfileSettingsFormProps {
    profile: AppProfile | null;
}

// A dedicated component for the submit button to handle pending/dirty state
function SaveButton() {
    const { pending } = useFormStatus();
    
    // Note: The `isDirty` logic is no longer available with useFormState.
    // The button is simply enabled or disabled based on the pending state.
    // This is a trade-off for the simplification. If `isDirty` is a critical UX feature,
    // you might stick with react-hook-form or add custom state tracking.
    // For most cases, this is sufficient.
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Saving...' : 'Save Changes'}
        </Button>
    );
}

export default function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
    // 1. Define the initial state for the form action.
    const initialState: FormState = {
        message: '',
        errors: {},
        success: false,
    };

    // 2. Setup useFormState to manage the form's lifecycle.
    const [state, formAction] = useFormState(updateUserProfileAction, initialState);

    // 3. Use useEffect to show toast notifications based on the server's response.
    useEffect(() => {
        if (state.success) {
            toast.success(state.message);
        } else if (state.message && (state.errors?._form || state.errors?.fullName)) {
            toast.error(state.errors?._form?.[0] || state.errors?.fullName?.[0] || state.message);
        }
    }, [state]);

    return (
        // 4. The form now uses the server action directly.
        <form action={formAction} className="space-y-6">
            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-foreground-primary mb-2">
                    Full Name
                </label>
                <input
                    id="fullName"
                    name="fullName" // Add the name attribute for FormData
                    defaultValue={profile?.fullName || ''} // Use defaultValue for server-rendered initial values
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                {state.errors?.fullName && (
                    <p className="mt-2 text-sm text-red-500" role="alert">
                        {state.errors.fullName[0]}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-foreground-primary mb-2">
                    Timezone
                </label>
                <input
                    id="timezone"
                    name="timezone" // Add the name attribute for FormData
                    defaultValue={profile?.timezone || ''}
                    placeholder="e.g., America/New_York"
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
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