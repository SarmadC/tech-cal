'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { sendTelemetryEvent } from '@/utils/telemetryClient';
import BlockUserButton from '@/components/social/BlockUserButton';

type ProfileVisibility = 'private' | 'connections' | 'public';

interface SocialProfilePayload {
  username: string | null;
  headline: string | null;
  profileVisibility: ProfileVisibility;
  showAttendance: boolean;
  trustLevel: number;
}

interface BlockedUserPayload {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  headline: string | null;
  blockedAt: string;
}

interface SocialSettingsPanelProps {
  compact?: boolean;
}

type UsernameAvailabilityState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'
  | 'reserved'
  | 'error';

interface UsernameAvailabilityPayload {
  username: string;
  available: boolean;
  reason?: 'taken' | 'invalid' | 'reserved';
  message: string;
}

const visibilities: Array<{ value: Extract<ProfileVisibility, 'private' | 'public'>; label: string; description: string }> = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can view your social profile and attendance.',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Your profile can be discovered by other users.',
  },
];

const TRUST_LEVEL_LABELS: Record<number, string> = {
  0: 'New',
  1: 'Basic',
  2: 'Member',
  3: 'Regular',
  4: 'Leader',
};

const normalizeInput = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{2,29}$/;

export default function SocialSettingsPanel({ compact = false }: SocialSettingsPanelProps) {
  const { showSuccess, showError } = useSnackbar();
  const [initialData, setInitialData] = useState<SocialProfilePayload | null>(null);
  const [formData, setFormData] = useState<SocialProfilePayload | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserPayload[]>([]);
  const [usernameAvailabilityState, setUsernameAvailabilityState] = useState<UsernameAvailabilityState>('idle');
  const [usernameAvailabilityMessage, setUsernameAvailabilityMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSocialProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [profileResponse, blockedUsersResponse] = await Promise.all([
          fetch('/api/profile/social', {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch('/api/blocks', {
            credentials: 'include',
            cache: 'no-store',
          }),
        ]);

        if (!profileResponse.ok) {
          throw new Error('Failed to load social settings.');
        }

        const payload = await profileResponse.json() as { success?: boolean; data?: SocialProfilePayload; error?: string };
        const blockedPayload = await blockedUsersResponse.json() as {
          success?: boolean;
          data?: BlockedUserPayload[];
        };

        if (!payload.success || !payload.data) {
          throw new Error(payload.error || 'Failed to load social settings.');
        }

        if (!isMounted) {
          return;
        }

        setInitialData(payload.data);
        setFormData(payload.data);
        if (blockedPayload.success && blockedPayload.data) {
          setBlockedUsers(blockedPayload.data);
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : 'Failed to load social settings.';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadSocialProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const isDirty = useMemo(() => {
    if (!initialData || !formData) {
      return false;
    }

    return (
      normalizeInput(formData.username ?? '') !== normalizeInput(initialData.username ?? '') ||
      normalizeInput(formData.headline ?? '') !== normalizeInput(initialData.headline ?? '') ||
      formData.profileVisibility !== initialData.profileVisibility ||
      formData.showAttendance !== initialData.showAttendance
    );
  }, [initialData, formData]);

  useEffect(() => {
    const normalizedUsername = normalizeInput(formData?.username ?? '');
    const normalizedInitialUsername = normalizeInput(initialData?.username ?? '');

    if (!normalizedUsername || normalizedUsername === normalizedInitialUsername) {
      setUsernameAvailabilityState('idle');
      setUsernameAvailabilityMessage(null);
      return;
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setUsernameAvailabilityState('invalid');
      setUsernameAvailabilityMessage(
        'Username must be 3-30 chars, start with a letter, and use only letters, numbers, "_" or "-".'
      );
      return;
    }

    setUsernameAvailabilityState('checking');
    setUsernameAvailabilityMessage('Checking availability...');

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/profile/username-check?q=${encodeURIComponent(normalizedUsername)}`,
          {
            credentials: 'include',
          }
        );

        const payload = await response.json() as {
          success?: boolean;
          data?: UsernameAvailabilityPayload;
          error?: string;
        };

        if (!isActive) {
          return;
        }

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || 'Failed to validate username.');
        }

        if (payload.data.available) {
          setUsernameAvailabilityState('available');
          setUsernameAvailabilityMessage(payload.data.message);
          return;
        }

        const reason = payload.data.reason || 'taken';
        setUsernameAvailabilityState(reason);
        setUsernameAvailabilityMessage(payload.data.message);
      } catch {
        if (!isActive) {
          return;
        }

        setUsernameAvailabilityState('error');
        setUsernameAvailabilityMessage('Unable to validate username right now. You can still try saving.');
      }
    }, 350);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [formData?.username, initialData?.username]);

  const isUsernameChanged = useMemo(() => {
    return normalizeInput(formData?.username ?? '') !== normalizeInput(initialData?.username ?? '');
  }, [formData?.username, initialData?.username]);

  const isUsernameBlockingSave =
    isUsernameChanged &&
    (usernameAvailabilityState === 'checking' ||
      usernameAvailabilityState === 'taken' ||
      usernameAvailabilityState === 'invalid' ||
      usernameAvailabilityState === 'reserved');

  const handleSave = async () => {
    if (!formData || !initialData) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const requestBody = {
        username: normalizeInput(formData.username ?? ''),
        headline: normalizeInput(formData.headline ?? ''),
        profileVisibility: formData.profileVisibility,
        showAttendance: formData.showAttendance,
      };

      const response = await fetch('/api/profile/social', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json() as { success?: boolean; data?: SocialProfilePayload; error?: string };

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Failed to save social settings.');
      }

      if (!initialData.showAttendance && payload.data.showAttendance) {
        void sendTelemetryEvent({
          eventType: 'attendance_opt_in',
          context: {
            surface: 'settings_profile',
          },
        });
      }

      setInitialData(payload.data);
      setFormData(payload.data);
      showSuccess('Social settings updated.');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save social settings.';
      setError(message);
      showError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={compact ? 'space-y-2' : 'space-y-2 max-w-2xl'}>
        <h3 className="text-lg font-semibold text-[var(--foreground-primary)]">Social Presence</h3>
        <p className="text-sm text-[var(--foreground-secondary)]">Loading social settings...</p>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className={compact ? 'space-y-2' : 'space-y-2 max-w-2xl'}>
        <h3 className="text-lg font-semibold text-[var(--foreground-primary)]">Social Presence</h3>
        <p className="text-sm text-[var(--error)]">{error || 'Unable to load social settings.'}</p>
      </div>
    );
  }

  return (
    <section className={compact ? 'space-y-5' : 'space-y-6 max-w-2xl'}>
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground-primary)]">Social Presence</h3>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Control whether people can discover you and see that you are attending events.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-4 sm:p-5">
        <div className="space-y-2">
          <label htmlFor="social-username" className="text-sm font-medium text-[var(--foreground-primary)]">
            Username
          </label>
          <input
            id="social-username"
            value={formData.username ?? ''}
            onChange={(event) => {
              setFormData((current) => current ? { ...current, username: event.target.value } : current);
            }}
            placeholder="your-name"
            maxLength={30}
            className="h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--background-main)] px-3 text-sm text-[var(--foreground-primary)] outline-none focus:border-[var(--accent-primary)]"
          />
          <p className="text-xs text-[var(--foreground-tertiary)]">
            3-30 chars. Start with a letter; use letters, numbers, `_` or `-`.
          </p>
          {usernameAvailabilityState !== 'idle' && usernameAvailabilityMessage && (
            <p
              className={`flex items-center gap-1 text-xs ${
                usernameAvailabilityState === 'available'
                  ? 'text-green-600 dark:text-green-400'
                  : usernameAvailabilityState === 'checking'
                    ? 'text-[var(--foreground-secondary)]'
                    : 'text-[var(--error)]'
              }`}
            >
              {usernameAvailabilityState === 'checking' && <CircleNotchIcon className="h-3 w-3 animate-spin" />}
              <span>{usernameAvailabilityMessage}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="social-headline" className="text-sm font-medium text-[var(--foreground-primary)]">
            Headline
          </label>
          <input
            id="social-headline"
            value={formData.headline ?? ''}
            onChange={(event) => {
              setFormData((current) => current ? { ...current, headline: event.target.value } : current);
            }}
            placeholder="Staff Engineer in AI Infrastructure"
            maxLength={120}
            className="h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--background-main)] px-3 text-sm text-[var(--foreground-primary)] outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium text-[var(--foreground-primary)]">Profile visibility</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibilities.map((visibility) => (
              <button
                key={visibility.value}
                type="button"
                onClick={() => {
                  setFormData((current) => current ? { ...current, profileVisibility: visibility.value } : current);
                }}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  formData.profileVisibility === visibility.value
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                    : 'border-[var(--border-default)] hover:border-[var(--foreground-tertiary)]'
                }`}
              >
                <p className="text-sm font-medium text-[var(--foreground-primary)]">{visibility.label}</p>
                <p className="mt-1 text-xs text-[var(--foreground-secondary)]">{visibility.description}</p>
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border border-[var(--border-default)] p-3">
          <input
            type="checkbox"
            checked={formData.showAttendance}
            onChange={(event) => {
              const { checked } = event.target;
              setFormData((current) => current ? { ...current, showAttendance: checked } : current);
            }}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--foreground-primary)]">Show my attendance</p>
            <p className="text-xs text-[var(--foreground-secondary)]">
              Allows others to see you in Who&apos;s Going when you mark an event as attending.
            </p>
          </div>
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--foreground-tertiary)]">
            Trust level: {TRUST_LEVEL_LABELS[formData.trustLevel] || 'Unknown'} ({formData.trustLevel})
          </p>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving || isUsernameBlockingSave}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <CircleNotchIcon className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              'Save Social'
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-4 sm:p-5">
        <div>
          <h4 className="text-sm font-medium text-[var(--foreground-primary)]">Blocked users</h4>
          <p className="text-xs text-[var(--foreground-secondary)]">
            Blocked users cannot view your social profile or interact with you.
          </p>
        </div>

        {blockedUsers.length === 0 ? (
          <p className="text-xs text-[var(--foreground-tertiary)]">No blocked users.</p>
        ) : (
          <ul className="space-y-2">
            {blockedUsers.map((blockedUser) => (
              <li
                key={blockedUser.id}
                className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] bg-[var(--background-main)] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={blockedUser.avatarUrl || ''} alt={blockedUser.fullName || 'Blocked user'} />
                    <AvatarFallback>
                      {(blockedUser.fullName || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[var(--foreground-primary)]">
                      {blockedUser.fullName || blockedUser.username || 'Unknown user'}
                    </p>
                    {blockedUser.username && (
                      <p className="truncate text-[11px] text-[var(--foreground-tertiary)]">@{blockedUser.username}</p>
                    )}
                  </div>
                </div>

                <BlockUserButton
                  userId={blockedUser.id}
                  username={blockedUser.username}
                  initialBlocked
                  compact
                  onStatusChange={(isBlocked) => {
                    if (!isBlocked) {
                      setBlockedUsers((current) => current.filter((user) => user.id !== blockedUser.id));
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
