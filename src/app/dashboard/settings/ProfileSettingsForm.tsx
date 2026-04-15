'use client'

import React, { useEffect, useActionState, useRef, useState, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfileAction, uploadAvatarAction, FormState } from './actions';
import type { AppProfile } from '@/types';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { Button } from '@/components/ui/button';
import { MaterialIcon } from '@/components/ui/Icon';
import { TIMEZONE_OPTIONS } from '@/types/career';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsControl } from '@/components/settings/SettingsControl';
import { Switch } from '@/components/ui/switch'; // Assuming we have a Switch component or use native
import BlockUserButton from '@/components/social/BlockUserButton';
import { ProfileVisibility } from '@/services/socialProfileService';

interface ProfileSettingsFormProps {
    profile: AppProfile | null;
}

interface SocialProfileData {
    username: string | null;
    headline: string | null;
    profileVisibility: ProfileVisibility;
    showAttendance: boolean;
    trustLevel: number;
}

type UsernameAvailabilityState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'error';

interface UsernameAvailabilityPayload {
    username: string;
    available: boolean;
    reason?: 'taken' | 'invalid' | 'reserved';
    message: string;
}

interface BlockedUser {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    username: string | null;
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
                    <BrandLoadingLogo size={16} inline label={null} className="mr-2 shrink-0" />
                    Saving...
                </>
            ) : (
                'Save changes'
            )}
        </Button>
    );
}

// Custom Input Component for the settings design
const SettingsInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: string, helperText?: string }>(
    ({ className, error, helperText, ...props }, ref) => (
        <div className="w-full">
            <input
                ref={ref}
                className={`w-full bg-transparent text-[13px] text-[var(--foreground-primary)] placeholder-[var(--foreground-tertiary)] px-3 py-1.5 rounded-md border border-[var(--border-default)] focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-primary)]/10 focus:outline-none transition-all duration-200 ${className || ''} ${error ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/10' : ''}`}
                {...props}
            />
            {helperText && !error && (
                <p className="mt-1.5 text-[12px] text-[var(--foreground-tertiary)]">{helperText}</p>
            )}
            {error && (
                <p className="mt-1.5 text-[12px] text-[var(--error)] flex items-center">
                    <MaterialIcon name="error" size={14} className="mr-1" />
                    {error}
                </p>
            )}
        </div>
    )
);
SettingsInput.displayName = 'SettingsInput';

export default function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
    const { showSuccess, showError } = useSnackbar();
    const { refreshProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Combined State
    const [socialData, setSocialData] = useState<SocialProfileData | null>(null);
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [isLoadingSocial, setIsLoadingSocial] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    // Username Availability State
    const [usernameAvailabilityState, setUsernameAvailabilityState] = useState<UsernameAvailabilityState>('idle');
    const [usernameAvailabilityMessage, setUsernameAvailabilityMessage] = useState<string | null>(null);

    // Form Action State
    const initialState: FormState = {
        message: '',
        errors: {},
        success: false,
    };
    const [state, formAction] = useActionState(updateUserProfileAction, initialState);

    // Refs for managed inputs to check dirty state
    const fullNameRef = useRef<HTMLInputElement>(null);
    const timezoneRef = useRef<HTMLSelectElement>(null);
    const usernameRef = useRef<HTMLInputElement>(null);
    const headlineRef = useRef<HTMLInputElement>(null);

    // Visibility state managed in React state since it's a custom control
    const [visibility, setVisibility] = useState<ProfileVisibility>('private');
    const [showAttendance, setShowAttendance] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const [profileRes, blocksRes] = await Promise.all([
                    fetch('/api/profile/social'),
                    fetch('/api/blocks')
                ]);

                if (profileRes.ok && blocksRes.ok) {
                    const profileData = await profileRes.json();
                    const blocksData = await blocksRes.json();

                    if (isMounted) {
                        if (profileData.success && profileData.data) {
                            setSocialData(profileData.data);
                            setVisibility(profileData.data.profileVisibility);
                            setShowAttendance(profileData.data.showAttendance);
                        }
                        if (blocksData.success && blocksData.data) {
                            setBlockedUsers(blocksData.data);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load social settings", err);
            } finally {
                if (isMounted) setIsLoadingSocial(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, []);

    // Dirty Checking
    const checkDirty = () => {
        if (!socialData || !profile) return;

        const currentFullName = fullNameRef.current?.value || '';
        const currentTimezone = timezoneRef.current?.value || '';
        const currentUsername = usernameRef.current?.value || '';
        const currentHeadline = headlineRef.current?.value || '';

        const isProfileDirty =
            currentFullName !== (profile.fullName || '') ||
            currentTimezone !== (profile.timezone || '');

        const isSocialDirty =
            currentUsername !== (socialData.username || '') ||
            currentHeadline !== (socialData.headline || '') ||
            visibility !== socialData.profileVisibility ||
            showAttendance !== socialData.showAttendance;

        setIsDirty(isProfileDirty || isSocialDirty);
    };

    // Attach listeners
    const [usernameToCheck, setUsernameToCheck] = useState<string | null>(null);

    // Debounced Username Check
    useEffect(() => {
        const checkUsername = async () => {
            if (!usernameToCheck || usernameToCheck === socialData?.username) {
                setUsernameAvailabilityState('idle');
                setUsernameAvailabilityMessage(null);
                return;
            }

            const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{2,29}$/;
            if (!USERNAME_PATTERN.test(usernameToCheck)) {
                setUsernameAvailabilityState('invalid');
                setUsernameAvailabilityMessage('Username must be 3-30 chars, start with a letter, and use only letters, numbers, "_" or "-".');
                return;
            }

            setUsernameAvailabilityState('checking');
            setUsernameAvailabilityMessage('Checking availability...');

            try {
                const response = await fetch(`/api/profile/username-check?q=${encodeURIComponent(usernameToCheck)}`);
                const payload = await response.json();

                if (payload.success && payload.data) {
                    if (payload.data.available) {
                        setUsernameAvailabilityState('available');
                        setUsernameAvailabilityMessage(payload.data.message);
                    } else {
                        setUsernameAvailabilityState(payload.data.reason || 'taken');
                        setUsernameAvailabilityMessage(payload.data.message);
                    }
                } else {
                    // If error, just reset or show generic
                    setUsernameAvailabilityState('error');
                    setUsernameAvailabilityMessage(null);
                }
            } catch (err) {
                setUsernameAvailabilityState('error');
                setUsernameAvailabilityMessage(null);
            }
        };

        const timer = setTimeout(checkUsername, 500);
        return () => clearTimeout(timer);
    }, [usernameToCheck, socialData]);



    // Handle File Upload
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showError("File size must be less than 2MB.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const result = await uploadAvatarAction(initialState, formData);
            if (result.success) {
                showSuccess(result.message);
                await refreshProfile();
            } else {
                showError(result.message || "Failed to upload avatar.");
            }
        } catch (error) {
            showError("An unexpected error occurred.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Effect for form submission feedback
    useEffect(() => {
        if (state.success) {
            showSuccess(state.message);
            // Update socialData baseline to match new values so dirty check passes
            if (usernameRef.current && headlineRef.current) {
                setSocialData(prev => prev ? ({
                    ...prev,
                    username: usernameRef.current?.value || null,
                    headline: headlineRef.current?.value || null,
                    profileVisibility: visibility,
                    showAttendance: showAttendance
                }) : null);
            }
            setIsDirty(false);
        } else if (state.message) {
            const msg = state.errors?._form?.[0] || Object.values(state.errors || {}).flat()[0] || state.message;
            showError(msg);
        }
    }, [state, showSuccess, showError]);


    if (isLoadingSocial) {
        return (
            <div className="flex items-center justify-center gap-3 p-8 text-center text-[var(--foreground-tertiary)]">
                <BrandLoadingLogo size={18} inline label={null} />
                <span>Loading profile settings...</span>
            </div>
        );
    }

    return (
        <form action={formAction} onChange={checkDirty} className="relative pb-24">

            {/* Identity Group */}
            <SettingsSection title="Identity" description="Manage your personal information and how you appear to others.">
                {/* Header-like Avatar Row */}
                {/* Header-like Avatar Row */}
                <div className="group py-2.5 grid gap-4 border-b border-[var(--border-default)]/40 items-center grid-cols-1 sm:grid-cols-[200px_1fr]">
                    <div className="min-w-0 space-y-0.5 mb-2 sm:mb-0">
                        <div className="text-[13px] font-medium text-[var(--foreground-primary)]">
                            Profile Picture
                        </div>
                    </div>
                    <div className="min-w-0 flex items-center justify-start gap-4">
                        <Avatar className="h-10 w-10 border border-[var(--border-default)]">
                            <AvatarImage src={profile?.avatarUrl || ''} />
                            <AvatarFallback>{profile?.fullName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>

                        <div className="relative">
                            <input
                                type="file" ref={fileInputRef} className="hidden"
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button" variant="outline" size="sm"
                                disabled={isUploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="h-7 text-[12px] font-medium bg-[var(--background-main)] hover:bg-[var(--background-secondary)] border-[var(--border-default)] text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] transition-all duration-200 active:scale-95"
                            >
                                {isUploading ? <BrandLoadingLogo size={14} inline label={null} /> : "Change avatar"}
                            </Button>
                        </div>
                    </div>
                </div>

                <SettingsControl label="Display Name">
                    <div className="w-full sm:w-[320px]">
                        <SettingsInput
                            name="fullName"
                            ref={fullNameRef}
                            defaultValue={profile?.fullName || ''}
                            placeholder="Your full name"
                            error={state.errors?.fullName?.[0]}
                        />
                    </div>
                </SettingsControl>

                <SettingsControl label="Username">
                    <div className="w-full sm:w-[320px]">
                        <SettingsInput
                            name="username"
                            ref={usernameRef}
                            defaultValue={socialData?.username || ''}
                            placeholder="username"
                            maxLength={30}
                            error={state.errors?.username?.[0]}
                            helperText={usernameAvailabilityMessage || "Unique identifier (3-30 chars)"}
                            onChange={(e) => {
                                checkDirty();
                                setUsernameToCheck(e.target.value);
                            }}
                            className={
                                usernameAvailabilityState === 'available' ? 'text-green-600' :
                                    (usernameAvailabilityState === 'taken' || usernameAvailabilityState === 'invalid') ? 'text-[var(--error)]' : ''
                            }
                        />
                        {usernameAvailabilityState !== 'idle' && usernameAvailabilityState !== 'error' && (
                            <div className={`mt-1 text-xs flex items-center gap-1 ${usernameAvailabilityState === 'available' ? 'text-green-600' :
                                usernameAvailabilityState === 'checking' ? 'text-[var(--foreground-secondary)]' : 'text-[var(--error)]'
                                }`}>
                                {usernameAvailabilityState === 'checking' && <BrandLoadingLogo size={12} inline label={null} />}
                            </div>
                        )}
                    </div>
                </SettingsControl>

                <SettingsControl label="Timezone">
                    <div className="relative w-full sm:w-[320px]">
                        <select
                            ref={timezoneRef}
                            name="timezone"
                            defaultValue={profile?.timezone || ''}
                            onChange={checkDirty}
                            className="w-full bg-transparent text-[13px] text-[var(--foreground-primary)] px-3 py-1.5 rounded-md border border-[var(--border-default)] focus:border-[var(--accent-primary)] focus:ring-[3px] focus:ring-[var(--accent-primary)]/10 focus:outline-none appearance-none cursor-pointer hover:bg-[var(--background-secondary)]/50 transition-colors"
                        >
                            <option value="">Select timezone</option>
                            {TIMEZONE_OPTIONS.map(tz => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </select>
                        <MaterialIcon name="expand-more" size={16} className="absolute right-3 top-3 pointer-events-none text-[var(--foreground-tertiary)]" />
                        <div className="mt-1.5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
                                    if (timezoneRef.current) {
                                        timezoneRef.current.value = detected;
                                        checkDirty();
                                    }
                                }}
                                className="text-[11px] font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-all duration-200 active:scale-95 flex items-center gap-1"
                            >
                                <MaterialIcon name="my_location" size={12} />
                                Auto-detect timezone
                            </button>
                        </div>
                    </div>
                </SettingsControl>
            </SettingsSection>

            {/* Social Presence Group */}
            <div className="mt-8">
                <SettingsSection title="Social Presence" description="Control your visibility and interactions.">
                    <SettingsControl label="Headline">
                        <div className="w-full sm:w-[320px]">
                            <SettingsInput
                                name="headline"
                                ref={headlineRef}
                                defaultValue={socialData?.headline || ''}
                                placeholder="e.g. Product Designer at Linear"
                                maxLength={120}
                                error={state.errors?.headline?.[0]}
                                className="bg-[var(--background-secondary)] border border-[var(--border-default)]"
                            />
                        </div>
                    </SettingsControl>

                    <SettingsControl label="Profile Visibility">
                        <div className="flex flex-col gap-2 w-full sm:w-[320px]">
                            <div className="inline-flex bg-[var(--background-secondary)]/50 p-0.5 rounded-full border border-[var(--border-default)]/60 w-fit">
                                <button
                                    type="button"
                                    onClick={() => setVisibility('private')}
                                    className={`px-3 py-1 text-[12px] font-medium rounded-full transition-all duration-200 active:scale-95 border border-transparent ${visibility === 'private' ? 'bg-[var(--background-main)] text-[var(--foreground-primary)] shadow-sm border-[var(--border-default)]/20' : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]'}`}
                                >
                                    Private
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVisibility('public')}
                                    className={`px-3 py-1 text-[12px] font-medium rounded-full transition-all duration-200 active:scale-95 border border-transparent ${visibility === 'public' ? 'bg-[var(--background-main)] text-[var(--foreground-primary)] shadow-sm border-[var(--border-default)]/20' : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]'}`}
                                >
                                    Public
                                </button>
                            </div>
                            <input type="hidden" name="profileVisibility" value={visibility} />

                            <p className="mt-1 text-[12px] text-[var(--foreground-tertiary)]">
                                {visibility === 'private'
                                    ? "Only you can view your full profile and activity."
                                    : "Anyone in the workspace can view your profile and activity."}
                            </p>
                        </div>
                    </SettingsControl>

                    {visibility === 'public' && <SettingsControl
                        label="Show Attendance"
                        description="Let others see which public events you are attending."
                    >
                        <div className="flex items-center h-6">
                            <Switch
                                name="showAttendance"
                                checked={showAttendance}
                                onCheckedChange={setShowAttendance}
                                className="scale-90"
                            />
                            {/* FormData helper since Switch might not submit value if not standard input */}
                            <input type="hidden" name="showAttendance" value={showAttendance.toString()} />
                        </div>
                    </SettingsControl>
                    }
                </SettingsSection>
            </div>

            {/* Blocked Users Group */}
            <div className="mt-8">
                <SettingsSection title="Blocked Users" description="Manage users restricted from interacting with you.">
                    {blockedUsers.length === 0 ? (
                        <SettingsControl>
                            <div className="flex w-full flex-col gap-3 text-[13px] sm:w-[320px] sm:flex-row sm:items-center sm:gap-4">
                                <span className="text-[var(--foreground-tertiary)] italic">No blocked users</span>
                                <Button variant="ghost" size="sm" className="h-6 text-[11px] text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)] px-2 transition-all duration-200 active:scale-95">
                                    Block someone...
                                </Button>
                            </div>
                        </SettingsControl>
                    ) : (
                        blockedUsers.map(user => (
                            <SettingsControl key={user.id} layout="row">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.avatarUrl || ''} />
                                        <AvatarFallback>{(user.fullName || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="text-[13px] font-medium text-[var(--foreground-primary)]">{user.fullName || 'Unknown'}</div>
                                        {user.username && <div className="text-[11px] text-[var(--foreground-tertiary)]">@{user.username}</div>}
                                    </div>
                                </div>
                                <BlockUserButton
                                    userId={user.id}
                                    username={user.username}
                                    initialBlocked={true}
                                    compact
                                    onStatusChange={(blocked) => {
                                        if (!blocked) setBlockedUsers(prev => prev.filter(u => u.id !== user.id));
                                    }}
                                />
                            </SettingsControl>
                        ))
                    )
                    }
                </SettingsSection>
            </div>


            {/* Sticky Save Footer */}
            <div
                className={`fixed bottom-[calc(var(--mobile-app-tabbar-offset)-0.25rem)] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[30rem] -translate-x-1/2 items-center gap-4 rounded-3xl border border-[var(--border-default)] bg-[var(--background-secondary)] px-3 py-2 shadow-xl transition-all duration-300 sm:bottom-6 sm:w-auto sm:max-w-none sm:rounded-full sm:px-4 ${isDirty ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
            >
                <div className="flex w-full items-center gap-2">
                    <span className="pl-2 text-sm font-medium text-[var(--foreground-secondary)]">
                        Unsaved changes
                    </span>
                    <div className="h-4 w-[1px] bg-[var(--border-default)] mx-2" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs hover:bg-[var(--background-tertiary)]"
                        onClick={() => {
                            // Reset
                            if (fullNameRef.current && profile) fullNameRef.current.value = profile.fullName || '';
                            if (usernameRef.current && socialData) usernameRef.current.value = socialData.username || '';
                            if (headlineRef.current && socialData) headlineRef.current.value = socialData.headline || '';
                            if (timezoneRef.current && profile) timezoneRef.current.value = profile.timezone || '';
                            if (socialData) {
                                setVisibility(socialData.profileVisibility);
                                setShowAttendance(socialData.showAttendance);
                            }
                            setIsDirty(false);
                        }}
                    >
                        Reset
                    </Button>
                    <div className="ml-auto">
                        <SaveButton isDirty={isDirty} />
                    </div>
                </div>
            </div>
        </form >
    );
}
