'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserCheck } from '@phosphor-icons/react';
import { useAuth } from '@/contexts';
import { useEventEngagement } from '@/hooks/useEventEngagement';

interface AttendanceEventButtonProps {
    eventId: string;
    loginRedirect: string;
    variant?: 'desktop' | 'mobile' | 'primary';
    label?: string;
    activeLabel?: string;
}

export default function AttendanceEventButton({
    eventId,
    loginRedirect,
    variant = 'desktop',
    label,
    activeLabel,
}: AttendanceEventButtonProps) {
    const { user } = useAuth();
    const { getAttendanceStatus, setAttendanceStatus } = useEventEngagement();
    const [isBusy, setIsBusy] = useState(false);

    const status = getAttendanceStatus(eventId);
    const isAttending = status === 'attending';

    const desktopClasses = `flex flex-1 items-center justify-center w-10 h-10 rounded-md transition-all ${isAttending
            ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'
            : 'bg-transparent text-foreground-tertiary hover:bg-background-tertiary/80 hover:text-foreground-primary'
        } disabled:opacity-60 disabled:cursor-not-allowed`;

    const mobileClasses = `flex-1 h-11 flex items-center justify-center rounded-lg text-[14px] font-medium transition-colors gap-2 ${isAttending
        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
        : 'bg-foreground-primary hover:bg-foreground-secondary text-background-main'
        } disabled:opacity-60 disabled:cursor-not-allowed`;

    const primaryClasses = `flex h-10 w-full items-center justify-between rounded-md px-3 text-[13px] font-semibold transition-colors ${isAttending
        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
        : 'bg-emerald-600 text-white hover:bg-emerald-500'
        } disabled:opacity-60 disabled:cursor-not-allowed`;

    const buttonClasses = variant === 'primary'
        ? primaryClasses
        : variant === 'mobile'
            ? mobileClasses
            : desktopClasses;
    const contentLabel = isAttending ? (activeLabel ?? label) : label;
    const showLabel = variant === 'primary' || Boolean(contentLabel);
    const icon = <UserCheck size={20} weight={isAttending ? 'fill' : 'regular'} />;

    if (!user) {
        return (
            <Link
                href={`/login?redirect=${encodeURIComponent(loginRedirect)}`}
                className={buttonClasses}
                title="I'm attending"
            >
                {showLabel ? (
                    <>
                        <span>{contentLabel ?? 'RSVP on Kure-Cal'}</span>
                        {icon}
                    </>
                ) : (
                    icon
                )}
            </Link>
        );
    }

    const handleAttendance = async () => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            await setAttendanceStatus(eventId, isAttending ? null : 'attending');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleAttendance}
            disabled={isBusy}
            className={buttonClasses}
            aria-pressed={isAttending}
            title={isAttending ? 'Attending' : "I'm attending"}
        >
            {showLabel ? (
                <>
                    <span>{contentLabel ?? 'RSVP on Kure-Cal'}</span>
                    {icon}
                </>
            ) : (
                icon
            )}
        </button>
    );
}
