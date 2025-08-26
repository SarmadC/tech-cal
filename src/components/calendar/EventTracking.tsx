'use client';

import { FC, useState } from 'react';
import { Check, Star, UserCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking, useEventTrackingStatus } from '@/hooks/useEventTracking';
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
    
    const {
        data: trackingStatus,
        isLoading: isLoadingStatus,
        error: statusError
    } = useEventTrackingStatus(trackingEventId);

    const { trackEvent, untrackEvent, isLoading: isMutating } = useEventTracking();

    const currentStatus = optimisticStatus || trackingStatus || { isTracked: false };

    const handleTrackEvent = (status: EventStatus) => {
        if (!user) {
            return;
        }

        setOptimisticStatus({
            isTracked: true,
            status: status
        });

        // Use originalEventId for multi-day event instances, otherwise use the regular id
        const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

        trackEvent({
            eventId: trackingEventId,
            status: status,
        });
    };

    const handleUntrackEvent = () => {
        setOptimisticStatus({
            isTracked: false
        });

        // Use originalEventId for multi-day event instances, otherwise use the regular id
        const trackingEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;

        untrackEvent({ eventId: trackingEventId });
    };

    if (!user) {
        return (
            <div className="text-center text-sm text-gray-400 p-3 bg-gray-800 rounded-lg">
                <a href="/login" className="text-blue-400 hover:underline">
                    Sign in
                </a>{' '}
                to track events
            </div>
        );
    }

    if (isLoadingStatus && !optimisticStatus) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-400">Loading...</span>
            </div>
        );
    }

    if (statusError && !optimisticStatus) {
        return (
            <div className="bg-red-500/10 text-red-300 text-xs p-3 rounded-lg flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Unable to load tracking status</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {currentStatus.isTracked ? (
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <Check className="w-5 h-5 text-green-400" />
                        <span className="text-green-300 font-medium text-sm capitalize">
                            {currentStatus.status === 'bookmarked' && 'Bookmarked'}
                            {currentStatus.status === 'attending' && 'Attending'}
                            {currentStatus.status === 'attended' && 'Attended'}
                            {!currentStatus.status && 'Tracked'}
                        </span>
                    </div>
                    <button
                        onClick={handleUntrackEvent}
                        disabled={isMutating}
                        className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                        {isMutating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            'Remove'
                        )}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleTrackEvent('bookmarked')}
                        disabled={isMutating}
                        className="flex flex-col items-center justify-center space-y-1 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 group"
                    >
                        {isMutating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <Star className="w-4 h-4 text-yellow-400 group-hover:text-yellow-300" />
                        )}
                        <span className="text-xs text-gray-300">Bookmark</span>
                    </button>
                    <button
                        onClick={() => handleTrackEvent('attending')}
                        disabled={isMutating}
                        className="flex flex-col items-center justify-center space-y-1 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 group"
                    >
                        {isMutating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <UserCheck className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                        )}
                        <span className="text-xs text-gray-300">Attending</span>
                    </button>
                    <button
                        onClick={() => handleTrackEvent('attended')}
                        disabled={isMutating}
                        className="flex flex-col items-center justify-center space-y-1 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 group"
                    >
                        {isMutating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                            <Check className="w-4 h-4 text-green-400 group-hover:text-green-300" />
                        )}
                        <span className="text-xs text-gray-300">Attended</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default EventTracking;