'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, UserCircle } from '@phosphor-icons/react';
import { usePostHog } from 'posthog-js/react';

interface ProfileCompletionBannerProps {
    /** Whether the user skipped onboarding (has no career profile) */
    showBanner: boolean;
}

/**
 * Inline banner prompting users who skipped onboarding to complete their career profile.
 * Shows contextually on discover/events pages to encourage profile completion
 * without blocking the user from using the app.
 */
export function ProfileCompletionBanner({ showBanner }: ProfileCompletionBannerProps) {
    const [dismissed, setDismissed] = useState(false);
    const posthog = usePostHog();

    if (!showBanner || dismissed) return null;

    return (
        <div className="relative flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
            <UserCircle size={20} weight="duotone" className="shrink-0 text-white/50" />
            <p className="text-white/70">
                Complete your career profile for personalized event recommendations.
            </p>
            <Link
                href="/onboarding/career"
                className="shrink-0 rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white/90 transition-colors hover:bg-white/15"
                onClick={() => posthog?.capture('profile_completion_banner_clicked', { location: 'discover' })}
            >
                Set Up Profile
            </Link>
            <button
                type="button"
                className="ml-auto shrink-0 rounded p-1 text-white/40 transition-colors hover:text-white/70"
                onClick={() => {
                    setDismissed(true);
                    posthog?.capture('profile_completion_banner_dismissed', { location: 'discover' });
                }}
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </div>
    );
}
