'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserCheck } from '@phosphor-icons/react';
import { useAuth } from '@/contexts';
import { useEventEngagement } from '@/hooks/useEventEngagement';

interface AttendanceEventButtonProps {
    eventId: string;
    loginRedirect: string;
    variant?: 'desktop' | 'mobile';
}

export default function AttendanceEventButton({
    eventId,
    loginRedirect,
    variant = 'desktop',
}: AttendanceEventButtonProps) {
    const { user } = useAuth();
    const { getAttendanceStatus, setAttendanceStatus } = useEventEngagement();
    const [isBusy, setIsBusy] = useState(false);

    const status = getAttendanceStatus(eventId);
    const isAttending = status === 'attending';

    const desktopClasses = `flex w-full items-center justify-center h-10 rounded-md text-[13px] font-medium transition-colors gap-2 ${
        isAttending
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-foreground-primary hover:bg-foreground-secondary text-background-main'
    } disabled:opacity-60 disabled:cursor-not-allowed`;

    const mobileClasses = `flex-1 h-11 flex items-center justify-center rounded-lg text-[14px] font-medium transition-colors gap-2 ${
        isAttending
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
            : 'bg-foreground-primary hover:bg-foreground-secondary text-background-main'
    } disabled:opacity-60 disabled:cursor-not-allowed`;

    const buttonClasses = variant === 'mobile' ? mobileClasses : desktopClasses;

    if (!user) {
        return (
            <Link
                href={`/login?redirect=${encodeURIComponent(loginRedirect)}`}
                className={buttonClasses}
            >
                <UserCheck className="h-4 w-4" />
                {"I'm attending"}
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
        >
            <UserCheck className="h-4 w-4" weight={isAttending ? 'fill' : 'regular'} />
            {isAttending ? 'Attending' : "I'm attending"}
        </button>
    );
}
