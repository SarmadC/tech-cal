'use client';

import { FC, useState } from 'react';
import { CheckIcon, StarIcon, UserCheckIcon, WarningOctagonIcon, CircleNotchIcon } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
// 1. UPDATE IMPORTS: Use the new, canonical `Event` type.
import { Event, EventStatus, MultiDayEventInstance } from '@/types';

// 2. UPDATE PROPS: The interface now uses the `Event` type.
interface EventTrackingProps {
    event: Event | MultiDayEventInstance;
}

const EventTracking: FC<EventTrackingProps> = ({ event }) => {
    const { user } = useAuth();

    const [optimisticStatus, setOptimisticStatus] = useState<{
        isTracked: boolean;
        status?: EventStatus;
    } | null>(null);

    // Use originalEventId for multi-day event instances, otherwise use the regular id
    const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
    
    const { trackedEventIds, trackEvent, untrackEvent, isLoading, error } = useTrackedEventsUnified();

    // Derive tracking status from the unified hook
    const isTracked = trackingEventId ? trackedEventIds.has(trackingEventId) : false;
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
            <div className="text-center text-sm text-gray-400 p-3 bg-gray-800 rounded-lg">
                <a href="/login" className="text-foreground-secondary hover:underline">
                    Sign in
                </a>{' '}
                to track events
            </div>
        );
    }

    if (isLoading && !optimisticStatus) {
        return (
            <div className="flex items-center justify-center p-4">
                <CircleNotchIcon className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-400">Loading...</span>
            </div>
        );
    }

    if (error && !optimisticStatus) {
        return (
            <div className="bg-red-500/10 text-red-300 text-xs p-3 rounded-lg flex items-center space-x-2">
                <WarningOctagonIcon className="w-4 h-4" />
                <span>Unable to load tracking status</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {currentStatus.isTracked ? (
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <CheckIcon className="w-5 h-5 text-zinc-300" />
                        <span className="text-zinc-300 font-medium text-sm capitalize">
                            Tracked
                        </span>
                    </div>
                    <button
                        onClick={handleUntrackEvent}
                        disabled={isLoading}
                        className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? (
                            <CircleNotchIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            'Remove'
                        )}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleTrackEvent('bookmarked')}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 group"
                        title="Bookmark this event"
                    >
                        {isLoading ? (
                            <CircleNotchIcon className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <StarIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-200" />
                        )}
                        <span className="text-sm text-gray-300">Bookmark</span>
                    </button>
                    <button
                        onClick={() => handleTrackEvent('attending')}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 group"
                        title="Mark as attending"
                    >
                        {isLoading ? (
                            <CircleNotchIcon className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <UserCheckIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-200" />
                        )}
                        <span className="text-sm text-gray-300">Attending</span>
                    </button>
                    <button
                        onClick={() => handleTrackEvent('attended')}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 group"
                        title="Mark as attended"
                    >
                        {isLoading ? (
                            <CircleNotchIcon className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <CheckIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-200" />
                        )}
                        <span className="text-sm text-gray-300">Attended</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default EventTracking;