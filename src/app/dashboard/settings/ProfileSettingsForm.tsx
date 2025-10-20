
// src/app/dashboard/settings/ProfileSettingsForm.tsx
'use client'

// 1. CORRECTED IMPORTS
import { useEffect, useActionState } from 'react';      // Core hooks from 'react'
import { useFormStatus } from 'react-dom';              // DOM-specific hooks from 'react-dom'

import { useSnackbar } from '@/contexts/SnackbarContext';

import { updateUserProfileAction, FormState } from './actions';
import type { AppProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { TIMEZONE_OPTIONS } from '@/types/career';

interface ProfileSettingsFormProps {
    profile: AppProfile | null;
}

// A dedicated component for the submit button to handle pending state
function SaveButton() {
    const { pending } = useFormStatus();

    return (
        <Button 
            type="submit" 
            disabled={pending}
            className="px-6 py-3 min-w-[120px] transition-colors disabled:opacity-50"
            style={{
                backgroundColor: 'var(--accent-primary) !important',
                color: 'var(--accent-primary-foreground) !important',
                border: 'none'
            }}
            onMouseEnter={(e) => {
                if (!pending) {
                    e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover) !important';
                }
            }}
            onMouseLeave={(e) => {
                if (!pending) {
                    e.currentTarget.style.backgroundColor = 'var(--accent-primary) !important';
                }
            }}
        >
            {pending ? (
                <>
                    <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                </>
            ) : (
                <>
                    <MaterialIcon name="check" size={16} className="mr-2" />
                    Save Changes
                </>
            )}
        </Button>
    );
}

export default function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
    const { showSuccess, showError } = useSnackbar();
    const initialState: FormState = {
        message: '',
        errors: {},
        success: false,
    };

    // 2. RENAME useFormState to useActionState
    const [state, formAction] = useActionState(updateUserProfileAction, initialState);

    // Use useEffect to show snackbar notifications based on the server's response.
    useEffect(() => {
        if (state.success) {
            showSuccess(state.message);
        } else if (state.message && (state.errors?._form || state.errors?.fullName || state.errors?.timezone)) {
            showError(state.errors?._form?.[0] || state.errors?.fullName?.[0] || state.errors?.timezone?.[0] || state.message);
        }
    }, [state, showSuccess, showError]);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground-primary)' }}>Profile Information</h3>
                <p className="text-sm mb-6" style={{ color: 'var(--foreground-secondary)' }}>
                    Update your personal information and preferences.
                </p>
            </div>
            
            <form action={formAction} className="space-y-6">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-primary)' }}>
                        Full Name
                    </label>
                    <input
                        id="fullName"
                        name="fullName"
                        defaultValue={profile?.fullName || ''}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                        style={{
                            backgroundColor: 'var(--background-main)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--foreground-primary)'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-primary-light)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    {state.errors?.fullName && (
                        <p className="mt-2 text-sm flex items-center" role="alert" style={{ color: 'var(--error)' }}>
                            <MaterialIcon name="error" size={16} className="mr-1" />
                            {state.errors.fullName[0]}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="timezone" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground-primary)' }}>
                        Timezone
                    </label>
                    <select
                        id="timezone"
                        name="timezone"
                        defaultValue={profile?.timezone || ''}
                        className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                        style={{
                            backgroundColor: 'var(--background-main)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--foreground-primary)'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                            e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-primary-light)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <option value="">Select your timezone</option>
                        {Object.entries(
                            TIMEZONE_OPTIONS.reduce((groups, tz) => {
                                if (!groups[tz.region]) groups[tz.region] = [];
                                groups[tz.region].push(tz);
                                return groups;
                            }, {} as Record<string, typeof TIMEZONE_OPTIONS[number][]>)
                        ).map(([region, timezones]) => (
                            <optgroup key={region} label={region}>
                                {timezones.map(tz => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    {state.errors?.timezone && (
                        <p className="mt-2 text-sm flex items-center" role="alert" style={{ color: 'var(--error)' }}>
                            <MaterialIcon name="error" size={16} className="mr-1" />
                            {state.errors.timezone[0]}
                        </p>
                    )}
                </div>

                <div 
                    className="flex justify-end pt-6 border-t"
                    style={{ borderColor: 'var(--border-default)' }}
                >
                    <SaveButton />
                </div>
            </form>
        </div>
    );
}