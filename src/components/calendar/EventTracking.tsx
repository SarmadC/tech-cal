'use client';

import { FC, useState } from 'react';
import { CheckIcon, UserCheckIcon, WarningOctagonIcon } from '@phosphor-icons/react';
import { BrandLoadingLogo } from '@/components/brand/BrandLoadingLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
// 1. UPDATE IMPORTS: Use the new, canonical `Event` type.
import { Event, EventStatus, MultiDayEventInstance } from '@/types';

// 2. UPDATE PROPS: The interface now uses the `Event` type.
interface EventTrackingProps {
    event: Event | MultiDayEventInstance;
    variant?: 'full' | 'compact';
}

const EventTracking: FC<EventTrackingProps> = ({ event, variant = 'full' }) => {
    const theme = useTimelineTheme();
    const { user } = useAuth();

    const [optimisticStatus, setOptimisticStatus] = useState<EventStatus | null | undefined>(undefined);

    // Use originalEventId for multi-day event instances, otherwise use the regular id
    const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

    const { getAttendanceStatus, setAttendanceStatus, isLoading, error } = useEventEngagement();

    // Get current attendance status (check optimistic first, then actual status)
    const actualStatus = getAttendanceStatus(trackingEventId);
    const currentStatus = optimisticStatus !== undefined ? optimisticStatus : actualStatus;

    const handleSetAttendance = async (status: EventStatus | null) => {
        if (!user) {
            return;
        }

        // Set optimistic status
        setOptimisticStatus(status);

        try {
            await setAttendanceStatus(trackingEventId, status);
            // Clear optimistic status after successful update
            setOptimisticStatus(undefined);
        } catch (error) {
            // On error, revert optimistic status
            setOptimisticStatus(undefined);
            throw error;
        }
    };

    // Determine current attendance state and next action
    // Note: Only attendance states are shown here, bookmark is handled separately
    const getAttendanceState = () => {
        // If no status (null or undefined), show "Not attending"
        if (!currentStatus || currentStatus === null) {
            return { state: 'none', label: 'Not attending', nextAction: 'attending' };
        }

        if (currentStatus === 'attending') {
            // Check if potential future event
            const eventDate = new Date(event.startTime);
            const now = new Date();
            const isFutureEvent = eventDate > now;

            // If event is in future, we cannot mark as attended yet
            // So simpler toggle: Attending -> None
            if (isFutureEvent) {
                return { state: 'attending', label: 'Attending', nextAction: null };
            }

            return { state: 'attending', label: 'Attending', nextAction: 'attended' };
        }

        if (currentStatus === 'attended') {
            return { state: 'attended', label: 'Attended', nextAction: null };
        }

        // For cancelled or any other status, show as not attending with option to set attending
        return { state: 'none', label: 'Not attending', nextAction: 'attending' };
    };

    const attendanceState = getAttendanceState();
    const isInitialLoad = isLoading && optimisticStatus === undefined;
    const hasLoadError = Boolean(error) && optimisticStatus === undefined;

    const getActionDescription = () => {
        if (attendanceState.nextAction === null) {
            return 'remove attendance';
        }

        if (attendanceState.nextAction === 'attending') {
            return 'mark as attending';
        }

        return 'mark as attended';
    };

    const defaultTitle = `Currently: ${attendanceState.label}. Click to ${getActionDescription()}`;
    const defaultAriaLabel = `Attendance status: ${attendanceState.label}`;

    const handleAttendanceToggle = async () => {
        try {
            if (attendanceState.nextAction === null) {
                // Remove attendance status (set to null)
                await handleSetAttendance(null);
            } else if (attendanceState.nextAction === 'attending') {
                // Set to attending
                await handleSetAttendance('attending');
            } else if (attendanceState.nextAction === 'attended') {
                // Set to attended
                await handleSetAttendance('attended');
            }
        } catch {
            // Errors are already surfaced by the engagement hook.
        }
    };

    const getToggleIcon = () => {
        if (isInitialLoad) {
            return <BrandLoadingLogo size={16} inline label={null} />;
        }

        if (hasLoadError) {
            return <WarningOctagonIcon className="w-4 h-4" />;
        }

        switch (attendanceState.state) {
            case 'attending':
                return <UserCheckIcon className="w-4 h-4" weight="fill" />;
            case 'attended':
                return <CheckIcon className="w-4 h-4" />;
            default:
                return <UserCheckIcon className="w-4 h-4" />;
        }
    };

    const getFullToggleStyles = () => {
        switch (attendanceState.state) {
            case 'attending':
                return theme.btnPrimary;
            case 'attended':
                return theme.btnSuccess;
            default:
                return theme.btnSecondary;
        }
    };

    const compactBaseClasses = 'p-2 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-70';

    const getCompactToggleStyles = () => {
        if (hasLoadError) {
            return 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300';
        }

        switch (attendanceState.state) {
            case 'attending':
                return 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white';
            case 'attended':
                return 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white';
            default:
                return 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300';
        }
    };

    if (variant === 'compact') {
        if (!user) {
            return (
                <button
                    type="button"
                    disabled
                    className={`${compactBaseClasses} bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-500 dark:text-gray-400`}
                    title="Sign in to manage attendance"
                    aria-label="Sign in to manage attendance"
                >
                    <UserCheckIcon className="w-4 h-4" />
                </button>
            );
        }

        const compactTitle = hasLoadError ? 'Unable to load attendance status' : isInitialLoad ? 'Loading attendance status' : defaultTitle;
        const compactAriaLabel = hasLoadError ? 'Unable to load attendance status' : isInitialLoad ? 'Loading attendance status' : defaultAriaLabel;

        return (
            <button
                type="button"
                onClick={handleAttendanceToggle}
                disabled={isInitialLoad || hasLoadError}
                className={`${compactBaseClasses} ${getCompactToggleStyles()}`}
                title={compactTitle}
                aria-label={compactAriaLabel}
                aria-pressed={attendanceState.state !== 'none'}
            >
                {getToggleIcon()}
            </button>
        );
    }

    if (!user) {
        return (
            <div className={`text-center text-sm ${theme.textMuted} p-3 ${theme.bgCard} rounded-lg`}>
                <a href="/login" className={`${theme.textSecondary} hover:underline`}>
                    Sign in
                </a>{' '}
                to manage attendance
            </div>
        );
    }

    if (isInitialLoad) {
        return (
            <div className="flex items-center justify-center p-4">
                <BrandLoadingLogo size={20} inline label={null} className={theme.textMuted} />
                <span className={`ml-2 text-sm ${theme.textMuted}`}>Loading...</span>
            </div>
        );
    }

    if (hasLoadError) {
        return (
            <div className={`${theme.errorBg} ${theme.errorText} text-xs p-3 rounded-lg flex items-center space-x-2`}>
                <WarningOctagonIcon className="w-4 h-4" />
                <span>Unable to load attendance status</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={handleAttendanceToggle}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 border ${getFullToggleStyles()} disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${theme.isDark ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
                title={defaultTitle}
                aria-pressed={attendanceState.state !== 'none'}
                aria-label={defaultAriaLabel}
            >
                {getToggleIcon()}
                <span>{attendanceState.label}</span>
            </button>
        </div>
    );
};

export default EventTracking;
