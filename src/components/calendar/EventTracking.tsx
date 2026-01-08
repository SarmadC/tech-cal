'use client';

import { FC, useState } from 'react';
import { CheckIcon, UserCheckIcon, WarningOctagonIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventEngagement } from '@/hooks/useEventEngagement';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
// 1. UPDATE IMPORTS: Use the new, canonical `Event` type.
import { Event, EventStatus, MultiDayEventInstance } from '@/types';

// 2. UPDATE PROPS: The interface now uses the `Event` type.
interface EventTrackingProps {
    event: Event | MultiDayEventInstance;
}

const EventTracking: FC<EventTrackingProps> = ({ event }) => {
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

    if (isLoading && optimisticStatus === undefined) {
        return (
            <div className="flex items-center justify-center p-4">
                <CircleNotchIcon className={`w-5 h-5 animate-spin ${theme.textMuted}`} />
                <span className={`ml-2 text-sm ${theme.textMuted}`}>Loading...</span>
            </div>
        );
    }

    if (error && optimisticStatus === undefined) {
        return (
            <div className={`${theme.errorBg} ${theme.errorText} text-xs p-3 rounded-lg flex items-center space-x-2`}>
                <WarningOctagonIcon className="w-4 h-4" />
                <span>Unable to load attendance status</span>
            </div>
        );
    }

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

    const handleAttendanceToggle = async () => {
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
    };

    const getToggleIcon = () => {
        if (isLoading) return <CircleNotchIcon className="w-4 h-4 animate-spin" />;

        switch (attendanceState.state) {
            case 'attending':
                return <UserCheckIcon className="w-4 h-4" />;
            case 'attended':
                return <CheckIcon className="w-4 h-4" />;
            default:
                return <UserCheckIcon className="w-4 h-4" />;
        }
    };

    const getToggleStyles = () => {
        switch (attendanceState.state) {
            case 'attending':
                return theme.btnPrimary;
            case 'attended':
                return theme.btnSuccess;
            default:
                return theme.btnSecondary;
        }
    };

    return (
        <div className="space-y-3">
            {/* Single Attendance Toggle */}
            <button
                onClick={handleAttendanceToggle}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 border ${getToggleStyles()} disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${theme.isDark ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}`}
                title={`Currently: ${attendanceState.label}. Click to ${attendanceState.nextAction === null ? 'remove attendance' : attendanceState.nextAction === 'attending' ? 'mark as attending' : 'mark as attended'}`}
                aria-pressed={attendanceState.state !== 'none'}
                aria-label={`Attendance status: ${attendanceState.label}`}
            >
                {getToggleIcon()}
                <span>{attendanceState.label}</span>
            </button>
        </div>
    );
};

export default EventTracking;