
// src/app/dashboard/settings/ProfileSettingsForm.tsx
'use client'

// 1. CORRECTED IMPORTS
import { useEffect, useActionState, useRef, useState } from 'react';      // Core hooks from 'react'
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

/**
 * Get UTC offset in minutes for a given timezone
 */
function getTimezoneOffset(timezone: string): number | null {
    try {
        const now = new Date();

        // Get UTC hours and minutes
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();

        // Get timezone hours and minutes
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const tzParts = tzFormatter.formatToParts(now);
        const tzHours = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0', 10);
        const tzMinutes = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0', 10);

        // Calculate difference in minutes
        const utcTotalMinutes = utcHours * 60 + utcMinutes;
        const tzTotalMinutes = tzHours * 60 + tzMinutes;

        let offsetMinutes = tzTotalMinutes - utcTotalMinutes;

        // Handle day rollover (if difference is > 12 hours, it's probably the wrong direction)
        if (offsetMinutes > 12 * 60) {
            offsetMinutes -= 24 * 60;
        } else if (offsetMinutes < -12 * 60) {
            offsetMinutes += 24 * 60;
        }

        return offsetMinutes;
    } catch {
        return null;
    }
}

/**
 * Find the closest matching timezone from TIMEZONE_OPTIONS based on UTC offset
 */
function findClosestTimezone(detectedTimezone: string): typeof TIMEZONE_OPTIONS[number] | undefined {
    const detectedOffset = getTimezoneOffset(detectedTimezone);
    if (detectedOffset === null) return undefined;

    // Find all timezones with the same offset
    const matchingTimezones = TIMEZONE_OPTIONS.filter(tz => {
        const tzOffset = getTimezoneOffset(tz.value);
        return tzOffset !== null && tzOffset === detectedOffset;
    });

    if (matchingTimezones.length === 0) return undefined;

    // Prefer common US timezones for North American offsets
    const usTimezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage'];
    const usMatch = matchingTimezones.find(tz => usTimezones.includes(tz.value));
    if (usMatch) return usMatch;

    // Otherwise, return the first match
    return matchingTimezones[0];
}

// A dedicated component for the submit button to handle pending state
function SaveButton({ isDirty }: { isDirty: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = pending || !isDirty;

    return (
        <Button
            type="submit"
            disabled={isDisabled}
            className="px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{
                backgroundColor: isDirty && !pending ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                color: isDirty && !pending ? 'var(--accent-primary-foreground)' : 'rgba(255, 255, 255, 0.4)',
                border: 'none',
                cursor: isDisabled ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
                if (!isDisabled) {
                    e.currentTarget.style.backgroundColor = 'var(--accent-primary-hover)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isDisabled) {
                    e.currentTarget.style.backgroundColor = isDirty ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)';
                }
            }}
        >
            {pending ? (
                <>
                    <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                </>
            ) : (
                'Save Changes'
            )}
        </Button>
    );
}

export default function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
    const { showSuccess, showError } = useSnackbar();
    const timezoneSelectRef = useRef<HTMLSelectElement>(null);
    const fullNameInputRef = useRef<HTMLInputElement>(null);
    const [isDirty, setIsDirty] = useState(false);

    const initialState: FormState = {
        message: '',
        errors: {},
        success: false,
    };

    // 2. RENAME useFormState to useActionState
    const [state, formAction] = useActionState(updateUserProfileAction, initialState);

    // Track form changes
    useEffect(() => {
        const checkDirty = () => {
            const currentName = fullNameInputRef.current?.value || '';
            const currentTimezone = timezoneSelectRef.current?.value || '';
            const originalName = profile?.fullName || '';
            const originalTimezone = profile?.timezone || '';

            setIsDirty(
                currentName !== originalName ||
                currentTimezone !== originalTimezone
            );
        };

        const nameInput = fullNameInputRef.current;
        const timezoneSelect = timezoneSelectRef.current;

        if (nameInput) {
            nameInput.addEventListener('input', checkDirty);
        }
        if (timezoneSelect) {
            timezoneSelect.addEventListener('change', checkDirty);
        }

        return () => {
            if (nameInput) nameInput.removeEventListener('input', checkDirty);
            if (timezoneSelect) timezoneSelect.removeEventListener('change', checkDirty);
        };
    }, [profile]);

    // Reset dirty state after successful save
    useEffect(() => {
        if (state.success) {
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => setIsDirty(false), 0);
        }
    }, [state.success]);

    // Use useEffect to show snackbar notifications based on the server's response.
    useEffect(() => {
        if (state.success) {
            showSuccess(state.message);
        } else if (state.message && (state.errors?._form || state.errors?.fullName || state.errors?.timezone)) {
            showError(state.errors?._form?.[0] || state.errors?.fullName?.[0] || state.errors?.timezone?.[0] || state.message);
        }
    }, [state, showSuccess, showError]);

    const handleAutoDetectTimezone = () => {
        try {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            // First, try to find exact match in TIMEZONE_OPTIONS
            let matchingTimezone = TIMEZONE_OPTIONS.find(tz => tz.value === detectedTimezone);

            // If no exact match, try to find closest match by UTC offset
            if (!matchingTimezone) {
                matchingTimezone = findClosestTimezone(detectedTimezone);
            }

            if (matchingTimezone && timezoneSelectRef.current) {
                timezoneSelectRef.current.value = matchingTimezone.value;
                setIsDirty(true);
                // Trigger change event to update form state
                timezoneSelectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                showSuccess(`Timezone set to ${matchingTimezone.label}`);
            } else {
                showError(`Unable to find matching timezone for ${detectedTimezone}`);
            }
        } catch {
            showError('Unable to detect timezone');
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground-primary)' }}>Profile Information</h3>
                <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    Update your personal information and preferences.
                </p>
            </div>

            <form action={formAction} className="space-y-6 sm:space-y-8">
                {/* Full Name Field */}
                <div className="space-y-2">
                    <label
                        htmlFor="fullName"
                        className="block text-sm font-medium"
                        style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    >
                        Full Name
                    </label>
                    <input
                        ref={fullNameInputRef}
                        id="fullName"
                        name="fullName"
                        defaultValue={profile?.fullName || ''}
                        placeholder="Enter your full name"
                        className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none transition-all duration-200"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid transparent',
                            color: 'var(--foreground-primary)'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                    />
                    {state.errors?.fullName && (
                        <p className="text-xs flex items-center mt-1.5" role="alert" style={{ color: 'var(--error)' }}>
                            <MaterialIcon name="error" size={14} className="mr-1.5" />
                            {state.errors.fullName[0]}
                        </p>
                    )}
                </div>

                {/* Timezone Field */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="timezone"
                            className="block text-sm font-medium"
                            style={{ color: 'rgba(255, 255, 255, 0.6)' }}
                        >
                            Timezone
                        </label>
                        <button
                            type="button"
                            onClick={handleAutoDetectTimezone}
                            className="text-xs font-medium transition-colors"
                            style={{
                                color: 'rgba(255, 255, 255, 0.5)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                            }}
                        >
                            Auto-detect
                        </button>
                    </div>
                    <select
                        ref={timezoneSelectRef}
                        id="timezone"
                        name="timezone"
                        defaultValue={profile?.timezone || ''}
                        className="w-full px-3 py-2.5 rounded-md text-sm focus:outline-none transition-all duration-200"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid transparent',
                            color: 'var(--foreground-primary)'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'transparent';
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
                        <p className="text-xs flex items-center mt-1.5" role="alert" style={{ color: 'var(--error)' }}>
                            <MaterialIcon name="error" size={14} className="mr-1.5" />
                            {state.errors.timezone[0]}
                        </p>
                    )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                    <SaveButton isDirty={isDirty} />
                </div>
            </form>
        </div>
    );
}