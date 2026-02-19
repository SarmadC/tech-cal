'use client'

import React, { useEffect, useActionState, useRef, useState, useMemo } from 'react';
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
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsControl } from '@/components/settings/SettingsControl';
import { Separator } from '@/components/ui/separator';
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
                    <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />
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
                className={`w-full bg-[var(--background-secondary)] text-[14px] text-[var(--foreground-primary)] placeholder-[var(--foreground-tertiary)] py-2 px-3 rounded-md border border-[var(--border-default)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] focus:outline-none transition-all duration-200 ${className || ''} ${error ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]' : ''}`}
                {...props}
            />
            {helperText && !error && (
                <p className="mt-1.5 text-xs text-[var(--foreground-secondary)]">{helperText}</p>
            )}
            {error && (
                <p className="mt-1.5 text-xs text-[var(--error)] flex items-center">
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
        return <div className="p-8 text-center text-[var(--foreground-tertiary)]">Loading profile settings...</div>;
    }

    return (
        <form action={formAction} onChange={checkDirty} className="relative pb-24">

            {/* Identity Group */}
            <SettingsSection title="Identity" description="Manage your personal information and how you appear to others.">
                <SettingsControl>
                    <div className="flex items-center gap-4 w-full">
                        <Avatar className="h-12 w-12 border border-[var(--border-default)]">
                            <AvatarImage src={profile?.avatarUrl || ''} />
                            <AvatarFallback>{profile?.fullName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-[var(--foreground-primary)]">
                                {profile?.fullName || 'User'}
                            </div>
                            <div className="text-xs text-[var(--foreground-tertiary)] truncate">
                                {profile?.email}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="file" ref={fileInputRef} className="hidden"
                                accept="image/png, image/jpeg, image/gif, image/webp"
                                onChange={handleFileChange}
                            />
                            <Button
                                type="button" variant="outline" size="sm"
                                disabled={isUploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8 text-xs bg-[var(--background-secondary)] hover:bg-[var(--background-tertiary)] border-[var(--border-default)]"
                            >
                                {isUploading ? <CircleNotchIcon className="animate-spin" /> : "Change avatar"}
                            </Button>
                        </div>
                    </div>
                </SettingsControl>

                <Separator className="bg-[var(--border-default)]/50" />

                <SettingsControl label="Display Name" layout="row">
                    <SettingsInput
                        name="fullName"
                        ref={fullNameRef}
                        defaultValue={profile?.fullName || ''}
                        placeholder="Your full name"
                        error={state.errors?.fullName?.[0]}
                    />
                </SettingsControl>

                <Separator className="bg-[var(--border-default)]/50" />

                <SettingsControl
                    label="Username"
                    description="Unique identifier for your public profile."
                >
                    <div className="w-full">
                        <SettingsInput
                            name="username"
                            ref={usernameRef}
                            defaultValue={socialData?.username || ''}
                            placeholder="username"
                            maxLength={30}
                            error={state.errors?.username?.[0]}
                            helperText={usernameAvailabilityMessage || "3-30 characters, letters, numbers, _ or -"}
                            onChange={(e) => {
                                checkDirty();
                                setUsernameToCheck(e.target.value);
                            }}
                            className={
                                usernameAvailabilityState === 'available' ? 'border-green-500 focus:border-green-500 focus:ring-green-500' :
                                    (usernameAvailabilityState === 'taken' || usernameAvailabilityState === 'invalid') ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]' : ''
                            }
                        />
                        {usernameAvailabilityState !== 'idle' && usernameAvailabilityState !== 'error' && (
                            <div className={`mt-1 text-xs flex items-center gap-1 ${usernameAvailabilityState === 'available' ? 'text-green-600' :
                                    usernameAvailabilityState === 'checking' ? 'text-[var(--foreground-secondary)]' : 'text-[var(--error)]'
                                }`}>
                                {usernameAvailabilityState === 'checking' && <CircleNotchIcon className="animate-spin h-3 w-3" />}
                            </div>
                        )}
                    </div>
                </SettingsControl>

                <Separator className="bg-[var(--border-default)]/50" />

                <SettingsControl label="Timezone">
                    <div className="relative w-full">
                        <select
                            ref={timezoneRef}
                            name="timezone"
                            defaultValue={profile?.timezone || ''}
                            onChange={checkDirty}
                            className="w-full bg-[var(--background-secondary)] text-[14px] text-[var(--foreground-primary)] py-2 px-3 pr-8 rounded-md border border-[var(--border-default)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="">Select timezone</option>
                            {/* Simplified rendering of options for brevity/perf, assume helper exists or map directly */}
                            {TIMEZONE_OPTIONS.map(tz => (
                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                        </select>
                        <MaterialIcon name="expand-more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--foreground-tertiary)]" />
                    </div>
                    {/* Helper/Auto-detect can go here */}
                </SettingsControl>
            </SettingsSection>

            {/* Social Presence Group */}
            <div className="mt-8">
                <SettingsSection title="Social Presence" description="Control your visibility and interactions.">
                    <SettingsControl
                        label="Headline"
                        description="A short bio that appears on your profile card."
                    >
                        <SettingsInput
                            name="headline"
                            ref={headlineRef}
                            defaultValue={socialData?.headline || ''}
                            placeholder="e.g. Product Designer at Linear"
                            maxLength={120}
                            error={state.errors?.headline?.[0]}
                        />
                    </SettingsControl>

                    <Separator className="bg-[var(--border-default)]/50" />

                    <SettingsControl label="Profile Visibility">
                        <div className="flex flex-col gap-3">
                            <div className="flex bg-[var(--background-secondary)] p-1 rounded-lg border border-[var(--border-default)] w-fit">
                                <button
                                    type="button"
                                    onClick={() => setVisibility('private')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${visibility === 'private' ? 'bg-[var(--background-main)] text-[var(--foreground-primary)] shadow-sm' : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]'}`}
                                >
                                    Private
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVisibility('public')}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${visibility === 'public' ? 'bg-[var(--background-main)] text-[var(--foreground-primary)] shadow-sm' : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground-primary)]'}`}
                                >
                                    Public
                                </button>
                            </div>
                            <input type="hidden" name="profileVisibility" value={visibility} />

                            <p className="text-xs text-[var(--foreground-secondary)]">
                                {visibility === 'private'
                                    ? "Only you can view your full profile and activity."
                                    : "Your profile can be discovered by others in the directory."}
                            </p>
                        </div>
                    </SettingsControl>

                    {visibility === 'public' && (
                        <>
                            <Separator className="bg-[var(--border-default)]/50" />
                            <SettingsControl
                                label="Attendance Visibility"
                                description="Allow others to see when you are attending public events."
                                action={
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="showAttendance" // This might need handling if value is boolean. value="true" only sends if checked.
                                            checked={showAttendance}
                                            value="true"
                                            onChange={(e) => setShowAttendance(e.target.checked)}
                                            className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                                        />
                                        {/* Hidden input to ensure false is sent if unchecked? Zod optional handles it usually, but FormData only sends checked checkboxes. 
                                             My action handles undefined/false manually. */}
                                        <input type="hidden" name="showAttendance" value={showAttendance.toString()} />
                                    </div>
                                }
                            />
                        </>
                    )}
                </SettingsSection>
            </div>

            {/* Blocked Users Group */}
            <div className="mt-8">
                <SettingsSection title="Blocked Users" description="Manage users restricted from interacting with you.">
                    {blockedUsers.length === 0 ? (
                        <SettingsControl>
                            <span className="text-sm text-[var(--foreground-tertiary)] italic">No blocked users</span>
                        </SettingsControl>
                    ) : (
                        <div className="divide-y divide-[var(--border-default)]/50">
                            {blockedUsers.map(user => (
                                <SettingsControl key={user.id} layout="row" className="py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.avatarUrl || ''} />
                                            <AvatarFallback>{(user.fullName || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="text-sm font-medium text-[var(--foreground-primary)]">{user.fullName || 'Unknown'}</div>
                                            {user.username && <div className="text-xs text-[var(--foreground-tertiary)]">@{user.username}</div>}
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
                            ))}
                        </div>
                    )}
                </SettingsSection>
            </div>


            {/* Sticky Save Footer */}
            <div
                className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[var(--background-secondary)] border border-[var(--border-default)] shadow-xl rounded-full px-4 py-2 flex items-center gap-4 transition-all duration-300 z-50 ${isDirty ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--foreground-secondary)] pl-2">
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
                    <SaveButton isDirty={isDirty} />
                </div>
            </div>
        </form>
    );
}
