
'use client';

import { useEffect, useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { updateUserProfileAction, FormState } from './actions';
import type { AppProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { TIMEZONE_OPTIONS } from '@/types/career';
import SocialSettingsPanel from './SocialSettingsPanel';

interface SettingsMobileProfileProps {
    profile: AppProfile | null;
}

// Helpers (Copied from ProfileSettingsForm to ensure standalone functionality)
function getTimezoneOffset(timezone: string): number | null {
    try {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const tzFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit', minute: '2-digit', hour12: false,
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
            className={`w-full h-10 text-sm font-medium transition-all duration-200 mt-4 rounded-md ${isDirty && !pending
                ? 'bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:opacity-90'
                : 'bg-[var(--mono-bg-hover)] text-[var(--mono-text-tertiary)] cursor-not-allowed'
                }`}
        >
            {pending ? (
                <div className="flex items-center justify-center gap-2">
                    <CircleNotchIcon className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                </div>
            ) : (
                'Save Changes'
            )}
        </Button>
    );
}

export default function SettingsMobileProfile({ profile }: SettingsMobileProfileProps) {
    const { showSuccess, showError } = useSnackbar();
    const timezoneSelectRef = useRef<HTMLSelectElement>(null);
    const fullNameInputRef = useRef<HTMLInputElement>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Avatar state (Mocking visual update, real update would need separate action or file upload logic)
    // For now assuming Avatar is managed elsewhere or just display

    const initialState: FormState = { message: '', errors: {}, success: false };
    const [state, formAction] = useActionState(updateUserProfileAction, initialState);

    useEffect(() => {
        const checkDirty = () => {
            const currentName = fullNameInputRef.current?.value || '';
            const currentTimezone = timezoneSelectRef.current?.value || '';
            const originalName = profile?.fullName || '';
            const originalTimezone = profile?.timezone || '';
            setIsDirty(currentName !== originalName || currentTimezone !== originalTimezone);
        };

        // Listeners...
        const nameInput = fullNameInputRef.current;
        const timezoneSelect = timezoneSelectRef.current;
        if (nameInput) nameInput.addEventListener('input', checkDirty);
        if (timezoneSelect) timezoneSelect.addEventListener('change', checkDirty);

        return () => {
            if (nameInput) nameInput.removeEventListener('input', checkDirty);
            if (timezoneSelect) timezoneSelect.removeEventListener('change', checkDirty);
        };
    }, [profile]);

    useEffect(() => {
        if (state.success) {
            setTimeout(() => setIsDirty(false), 0);
            showSuccess(state.message);
        } else if (state.message && (state.errors?._form || state.errors?.fullName || state.errors?.timezone)) {
            showError(state.errors?._form?.[0] || state.errors?.fullName?.[0] || state.errors?.timezone?.[0] || state.message);
        }
    }, [state, showSuccess, showError]);

    const handleAutoDetectTimezone = () => {
        // ... (Same logic as original)
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
        <div className="space-y-6">
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Personal Information
                </h3>

                <form action={formAction}>
                    <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)]">

                        {/* Name Field */}
                        <div className="p-4 border-b border-[var(--mono-border-default)] space-y-2">
                            <label htmlFor="fullName" className="text-[13px] text-[var(--mono-text-secondary)] font-medium block">
                                Display Name
                            </label>
                            <input
                                ref={fullNameInputRef}
                                id="fullName"
                                name="fullName"
                                defaultValue={profile?.fullName || ''}
                                placeholder="Enter your name"
                                className="w-full bg-transparent text-[15px] text-[var(--mono-text-primary)] placeholder-[var(--mono-text-tertiary)] focus:outline-none"
                            />
                            {state.errors?.fullName && (
                                <p className="text-xs text-red-400 mt-1">{state.errors.fullName[0]}</p>
                            )}
                        </div>

                        {/* Timezone Field */}
                        <div className="p-4 space-y-2 relative">
                            <div className="flex items-center justify-between mb-1">
                                <label htmlFor="timezone" className="text-[13px] text-[var(--mono-text-secondary)] font-medium block">
                                    Timezone
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAutoDetectTimezone}
                                    className="text-[11px] font-medium text-[var(--mono-text-tertiary)] hover:text-[var(--mono-text-secondary)] uppercase tracking-wide transition-colors"
                                >
                                    Auto-Detect
                                </button>
                            </div>

                            <div className="relative">
                                <select
                                    ref={timezoneSelectRef}
                                    id="timezone"
                                    name="timezone"
                                    defaultValue={profile?.timezone || ''}
                                    className="w-full bg-transparent text-[15px] text-[var(--mono-text-primary)] appearance-none focus:outline-none pr-8 truncate"
                                    style={{
                                        backgroundImage: "none" // Remove default arrow to style custom if needed, or keeping native for accessibility/ease
                                    }}
                                >
                                    <option value="" className="bg-[var(--mono-bg-surface)]">Select timezone</option>
                                    {Object.entries(
                                        TIMEZONE_OPTIONS.reduce((groups, tz) => {
                                            if (!groups[tz.region]) groups[tz.region] = [];
                                            groups[tz.region].push(tz);
                                            return groups;
                                        }, {} as Record<string, typeof TIMEZONE_OPTIONS[number][]>)
                                    ).map(([region, timezones]) => (
                                        <optgroup key={region} label={region} className="bg-[var(--mono-bg-surface)] text-[var(--mono-text-tertiary)]">
                                            {timezones.map(tz => (
                                                <option key={tz.value} value={tz.value} className="bg-[var(--mono-bg-surface)] text-[var(--mono-text-primary)]">
                                                    {tz.label}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--mono-text-tertiary)]">
                                    <MaterialIcon name="expand-more" size={16} />
                                </div>
                            </div>
                            {state.errors?.timezone && (
                                <p className="text-xs text-red-400 mt-1">{state.errors.timezone[0]}</p>
                            )}
                        </div>
                    </div>

                    <div className="px-1">
                        <SaveButton isDirty={isDirty} />
                    </div>
                </form>
            </div>

            <div className="px-5 py-4 text-center">
                <p className="text-[11px] text-[var(--mono-text-tertiary)] leading-relaxed">
                    Your profile information is visible to other users within your organization or events you attend.
                </p>
            </div>

            <SocialSettingsPanel compact />
        </div>
    );
}
