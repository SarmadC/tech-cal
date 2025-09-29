'use client';

import { FC, useState } from 'react';
import { CheckIcon, StarIcon, UserCheckIcon, WarningOctagonIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
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

    const [optimisticStatus, setOptimisticStatus] = useState<{
        isTracked: boolean;
        status?: EventStatus;
    } | null>(null);

    // Use originalEventId for multi-day event instances, otherwise use the regular id
    const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
    
    const { trackedEventIds, trackEvent, untrackEvent, isLoading, error } = useTrackedEventsUnified();

    // Derive tracking status from the unified hook
    const isTracked = trackingEventId ? (trackedEventIds?.has(trackingEventId) ?? false) : false;
    const trackingStatus = { isTracked };
    const currentStatus = optimisticStatus || trackingStatus;

    const handleTrackEvent = async (status: EventStatus) => {
        if (!user) {
            return;
        }

        setOptimisticStatus({
            isTracked: true,
            status: status
        });

        // Use originalEventId for multi-day event instances, otherwise use the regular id
        const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

        await trackEvent(trackingEventId, status);
    };

    const handleUntrackEvent = async () => {
        setOptimisticStatus({
            isTracked: false
        });

        // Use originalEventId for multi-day event instances, otherwise use the regular id
        const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

        await untrackEvent(trackingEventId);
    };

    if (!user) {
        return (
            <div className={`text-center text-sm ${theme.textMuted} p-3 ${theme.bgCard} rounded-lg`}>
                <a href="/login" className={`${theme.textSecondary} hover:underline`}>
                    Sign in
                </a>{' '}
                to track events
            </div>
        );
    }

    if (isLoading && !optimisticStatus) {
        return (
            <div className="flex items-center justify-center p-4">
                <CircleNotchIcon className={`w-5 h-5 animate-spin ${theme.textMuted}`} />
                <span className={`ml-2 text-sm ${theme.textMuted}`}>Loading...</span>
            </div>
        );
    }

    if (error && !optimisticStatus) {
        return (
            <div className={`${theme.errorBg} ${theme.errorText} text-xs p-3 rounded-lg flex items-center space-x-2`}>
                <WarningOctagonIcon className="w-4 h-4" />
                <span>Unable to load tracking status</span>
            </div>
        );
    }

    // Determine current attendance state and next action
    const getAttendanceState = () => {
        if (!currentStatus.isTracked) return { state: 'none', label: 'Not attending', nextAction: 'attending' };
        
        // Check if we have a status property (from optimisticStatus)
        const status = 'status' in currentStatus ? currentStatus.status : null;
        
        if (status === 'attending') return { state: 'attending', label: 'Attending', nextAction: 'attended' };
        if (status === 'attended') return { state: 'attended', label: 'Attended', nextAction: 'none' };
        if (status === 'bookmarked') return { state: 'bookmarked', label: 'Bookmarked', nextAction: 'attending' };
        
        // Default to attending if tracked but no specific status
        return { state: 'attending', label: 'Attending', nextAction: 'attended' };
    };

    const attendanceState = getAttendanceState();

    const handleAttendanceToggle = async () => {
        if (attendanceState.nextAction === 'none') {
            // Remove tracking
            await handleUntrackEvent();
        } else {
            // Set next state
            await handleTrackEvent(attendanceState.nextAction as EventStatus);
        }
    };

    const getToggleIcon = () => {
        if (isLoading) return <CircleNotchIcon className="w-4 h-4 animate-spin" />;
        
        switch (attendanceState.state) {
            case 'attending':
                return <UserCheckIcon className="w-4 h-4" />;
            case 'attended':
                return <CheckIcon className="w-4 h-4" />;
            case 'bookmarked':
                return <StarIcon className="w-4 h-4" />;
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
            case 'bookmarked':
                return theme.btnWarning;
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
                title={`Currently: ${attendanceState.label}. Click to ${attendanceState.nextAction === 'none' ? 'remove' : `mark as ${attendanceState.nextAction}`}`}
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