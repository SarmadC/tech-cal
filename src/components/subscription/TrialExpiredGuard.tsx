'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useSubscriptionContext } from '@/contexts';
import { TrialExpiredModal } from './TrialExpiredModal';

const TRIAL_DISMISSED_KEY = 'trial_expired_dismissed';

interface TrialExpiredGuardProps {
    children: ReactNode;
}

/**
 * TrialExpiredGuard - Blocks dashboard access for users with expired trials
 * until they either upgrade or explicitly acknowledge continuing with free tier.
 *
 * Uses localStorage to remember user's choice so they don't see the modal on every page load.
 * The key is cleared when a new subscription is created (e.g., after upgrade).
 */
export function TrialExpiredGuard({ children }: TrialExpiredGuardProps) {
    const { isTrialExpired, isLoading, isPro, isTrialing } = useSubscriptionContext();
    const [isDismissed, setIsDismissed] = useState(true); // Default to true to prevent flash
    const [hasChecked, setHasChecked] = useState(false);

    // Check localStorage on mount
    useEffect(() => {
        const dismissed = localStorage.getItem(TRIAL_DISMISSED_KEY);
        setIsDismissed(dismissed === 'true');
        setHasChecked(true);
    }, []);

    // Clear dismissal when user upgrades
    useEffect(() => {
        if (isPro || isTrialing) {
            localStorage.removeItem(TRIAL_DISMISSED_KEY);
            setIsDismissed(false);
        }
    }, [isPro, isTrialing]);

    const handleContinueWithFree = () => {
        localStorage.setItem(TRIAL_DISMISSED_KEY, 'true');
        setIsDismissed(true);
    };

    const handleClose = () => {
        // Same as continue with free for consistency
        handleContinueWithFree();
    };

    // Show nothing while loading or checking localStorage
    if (isLoading || !hasChecked) {
        return <>{children}</>;
    }

    // Show blocking modal if trial expired and user hasn't dismissed
    const shouldShowModal = isTrialExpired && !isDismissed && !isPro && !isTrialing;

    return (
        <>
            {children}
            <TrialExpiredModal
                isOpen={shouldShowModal}
                onClose={handleClose}
                onContinueWithFree={handleContinueWithFree}
                blocking={true}
            />
        </>
    );
}

export default TrialExpiredGuard;
