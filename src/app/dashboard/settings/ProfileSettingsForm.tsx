// src/app/dashboard/settings/ProfileSettingsForm.tsx
'use client'

import React, { useEffect, useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';

import { updateUserProfileAction, uploadAvatarAction, FormState } from './actions';
import type { AppProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { TIMEZONE_OPTIONS } from '@/types/career';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileSettingsFormProps {
    profile: AppProfile | null;
}

// Helper functions remain the same
function getTimezoneOffset(timezone: string): number | null {
    try {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const tzParts = tzFormatter.formatToParts(now);
        const tzHours = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0', 10);
        const tzMinutes = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0', 10);
        let offsetMinutes = (tzHours * 60 + tzMinutes) - (utcHours * 60 + utcMinutes);
        if (offsetMinutes > 12 * 60) offsetMinutes -= 24 * 60;
        else if (offsetMinutes < -12 * 60) offsetMinutes += 24 * 60;
        return offsetMinutes;
    } catch { return null; }
}

function findClosestTimezone(detectedTimezone: string): typeof TIMEZONE_OPTIONS[number] | undefined {
    const detectedOffset = getTimezoneOffset(detectedTimezone);
    if (detectedOffset === null) return undefined;
    const matchingTimezones = TIMEZONE_OPTIONS.filter(tz => {
        const tzOffset = getTimezoneOffset(tz.value);
        return tzOffset !== null && tzOffset === detectedOffset;
    });
    if (matchingTimezones.length === 0) return undefined;
    const usTimezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage'];
    const usMatch = matchingTimezones.find(tz => usTimezones.includes(tz.value));
    return usMatch || matchingTimezones[0];
}

function SaveButton({ isDirty }: { isDirty: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = pending || !isDirty;

    return (
        <Button
            type="submit"
            disabled={isDisabled}
            className="px-4 py-2 text-sm font-medium transition-all duration-200"
            style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-primary-foreground)',
                border: 'none',
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                boxShadow: isDirty && !pending ? '0 0 10px rgba(var(--accent-primary-rgb), 0.2)' : 'none'
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

// Updated Ghost Input with more padding
const GhostInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; rightElement?: React.ReactNode }>(
    ({ label, id, error, className, rightElement, ...props }, ref) => (
        <div className="group relative">
            <div className="flex justify-between items-baseline mb-1">
                <label htmlFor={id} className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wide">
                    {label}
                </label>
                {rightElement}
            </div>
            <div className="relative">
                <input
                    ref={ref}
                    id={id}
                    className={`w-full bg-transparent text-[15px] text-[var(--foreground-primary)] placeholder-[var(--foreground-tertiary)] py-3 px-1 border-b border-[var(--border-default)] focus:border-[var(--foreground-secondary)] focus:outline-none transition-all duration-200 ${className || ''}`}
                    style={{ borderRadius: 0 }}
                    {...props}
                />
                <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-[var(--foreground-primary)] transition-all duration-300 group-focus-within:w-full" />
            </div>
            {error && (
                <p className="text-xs text-[var(--error)] mt-1 flex items-center">
                    <MaterialIcon name="error" size={14} className="mr-1" />
                    {error}
                </p>
            )}
        </div>
    )
);
GhostInput.displayName = 'GhostInput';

export default function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
    const { showSuccess, showError } = useSnackbar();
    const { refreshProfile } = useAuth();
    const timezoneSelectRef = useRef<HTMLSelectElement>(null);
    const fullNameInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
    const [isDirty, setIsDirty] = useState(false);

    // Separate state for avatar upload
    const [isUploading, setIsUploading] = useState(false);

    const initialState: FormState = {
        message: '',
        errors: {},
        success: false,
    };

    const [state, formAction] = useActionState(updateUserProfileAction, initialState);

    // Initial state for upload action (consumed manually, but could use useActionState if wrapped)
    // We'll call uploadAvatarAction directly for simplicity in this flow or use a hidden form submit.
    // Let's use a manual handler to give immediate feedback.

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Client-side Validation
        if (file.size > 2 * 1024 * 1024) { // 2MB
            showError("File size must be less than 2MB.");
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showError("Only JPG, PNG, GIF, and WebP images are allowed.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            // Using the server action directly
            // @ts-ignore - Action types sometimes tricky with direct calls vs hooks
            const result = await uploadAvatarAction(initialState, formData);

            if (result.success) {
                showSuccess(result.message);
                // Refresh the profile context to update the navbar immediately
                await refreshProfile();
                // Profile/Avatar will update via revalidatePath from server
            } else {
                showError(result.message || "Failed to upload avatar.");
            }
        } catch (error) {
            console.error("Upload error", error);
            showError("An unexpected error occurred.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
        }
    };


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

        // Capture refs at effect setup time to ensure consistent cleanup
        const nameInput = fullNameInputRef.current;
        const timezoneSelect = timezoneSelectRef.current;

        // Only add listeners if elements exist
        nameInput?.addEventListener('input', checkDirty);
        timezoneSelect?.addEventListener('change', checkDirty);

        return () => {
            // Use captured refs for cleanup to ensure we remove the same listeners we added
            nameInput?.removeEventListener('input', checkDirty);
            timezoneSelect?.removeEventListener('change', checkDirty);
        };
    }, [profile]);

    useEffect(() => {
        if (state.success) {
            setTimeout(() => setIsDirty(false), 0);
        }
    }, [state.success]);

    useEffect(() => {
        if (state.success) {
            showSuccess(state.message);
        } else if (state.message && (state.errors?._form || state.errors?.fullName || state.errors?.timezone)) {
            // Handle generic or specific errors
            const msg = state.errors?._form?.[0] || state.errors?.fullName?.[0] || state.errors?.timezone?.[0] || state.message;
            showError(msg);
        }
    }, [state, showSuccess, showError]);

    const handleAutoDetectTimezone = () => {
        try {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let matchingTimezone = TIMEZONE_OPTIONS.find(tz => tz.value === detectedTimezone);
            if (!matchingTimezone) matchingTimezone = findClosestTimezone(detectedTimezone);

            if (matchingTimezone && timezoneSelectRef.current) {
                timezoneSelectRef.current.value = matchingTimezone.value;
                setIsDirty(true);
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
        <div className="relative pb-24">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl font-medium text-[var(--foreground-primary)] mb-1">Profile</h2>
                <p className="text-sm text-[var(--foreground-secondary)]">Manage your personal information and identity.</p>
            </div>

            <form action={formAction} className="space-y-10 max-w-2xl">
                {/* Avatar Row */}
                <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 border border-[var(--border-default)]">
                        <AvatarImage src={profile?.avatarUrl || ''} alt={profile?.fullName || 'Avatar'} />
                        <AvatarFallback className="bg-[var(--background-secondary)] text-[var(--foreground-secondary)] text-lg font-medium">
                            {profile?.fullName?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={handleUploadClick}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <CircleNotchIcon className="mr-2 h-3 w-3 animate-spin" />
                                        Uploading...
                                    </>
                                ) : "Upload new picture"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium text-[var(--error)] hover:text-[var(--error)] hover:bg-[var(--error-bg)]"
                                onClick={() => showSuccess("Remove functionality coming soon")}
                            >
                                Remove
                            </Button>
                        </div>
                        <p className="text-[11px] text-[var(--foreground-tertiary)]">
                            JPG, or PNG. Max size of 2MB.
                        </p>
                    </div>
                </div>

                <div className="h-[1px] w-full bg-[var(--border-default)] opacity-40" />

                {/* Ghost Inputs */}
                <div className="space-y-8">
                    <GhostInput
                        label="Display Name"
                        id="fullName"
                        name="fullName"
                        ref={fullNameInputRef}
                        defaultValue={profile?.fullName || ''}
                        placeholder="Your full name"
                        error={state.errors?.fullName?.[0]}
                    />

                    <div className="group relative">
                        <div className="flex justify-between items-baseline mb-1">
                            <label htmlFor="timezone" className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wide">
                                Timezone
                            </label>
                            <button
                                type="button"
                                onClick={handleAutoDetectTimezone}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                                <MaterialIcon name="my_location" size={12} />
                                Auto-detect
                            </button>
                        </div>
                        <div className="relative">
                            <select
                                ref={timezoneSelectRef}
                                id="timezone"
                                name="timezone"
                                defaultValue={profile?.timezone || ''}
                                className="w-full bg-transparent text-[15px] text-[var(--foreground-primary)] py-3 px-1 pr-8 border-b border-[var(--border-default)] focus:border-[var(--foreground-secondary)] focus:outline-none appearance-none cursor-pointer transition-all duration-200"
                                style={{ borderRadius: 0 }}
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
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--foreground-tertiary)] flex items-center justify-center">
                                <MaterialIcon name="expand-more" size={16} />
                            </div>
                            <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-[var(--foreground-primary)] transition-all duration-300 group-focus-within:w-full" />
                        </div>
                        {state.errors?.timezone && (
                            <p className="text-xs text-[var(--error)] mt-1 flex items-center">
                                <MaterialIcon name="error" size={14} className="mr-1" />
                                {state.errors.timezone[0]}
                            </p>
                        )}
                    </div>
                </div>

                {/* Contextual Action Bar */}
                <div
                    className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[var(--background-secondary)] border border-[var(--border-default)] shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 transition-all duration-300 z-50 ${isDirty ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
                >
                    <span className="text-sm font-medium text-[var(--foreground-secondary)]">
                        Unsaved changes
                    </span>
                    <div className="h-4 w-[1px] bg-[var(--border-default)]" />
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs hover:bg-[var(--background-tertiary)]"
                            onClick={() => {
                                if (fullNameInputRef.current) fullNameInputRef.current.value = profile?.fullName || '';
                                if (timezoneSelectRef.current) timezoneSelectRef.current.value = profile?.timezone || '';
                                setIsDirty(false);
                            }}
                        >
                            Reset
                        </Button>
                        <SaveButton isDirty={isDirty} />
                    </div>
                </div>
            </form>
        </div>
    );
}