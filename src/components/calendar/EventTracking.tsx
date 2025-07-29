// src/components/calendar/EventTracking.tsx
'use client';

import { FC, useState } from 'react';
import { Check, Star, UserCheck, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking, useEventTrackingStatus } from '@/hooks/useEventTracking';
import { AppEvent, EventStatus } from '@/types';
interface EventTrackingProps {
    event: AppEvent;
}

const EventTracking: FC<EventTrackingProps> = ({ event }) => {
    const { user } = useAuth();
    const [notes, setNotes] = useState('');

    // --- Data Reading Hook ---
    // Fetches the current tracking status for *this specific event*.
    // It automatically handles loading, error, and data states.
    const {
        data: trackingStatus,
        isLoading: isLoadingStatus,
        error: statusError
    } = useEventTrackingStatus(event.id);

    // --- Data Writing Hooks ---
    // Provides functions to mutate the data on the server.
    const { trackEvent, untrackEvent, isLoading: isMutating } = useEventTracking();

    const handleTrackEvent = (status: EventStatus) => {
        // Call the mutation. The hook's `onSuccess` will handle UI updates.
        trackEvent({
            eventId: event.id,
            status: status,
            notes: notes,
        });
        // Clear notes after submission
        setNotes('');
    };

    const handleUntrackEvent = () => {
        untrackEvent({ eventId: event.id });
    };

    // If there's no user, show a message or hide the component.
    if (!user) {
        return (
            <div className="text-center text-sm text-gray-500 p-4 bg-gray-800 rounded-lg">
                <a href="/login" className="text-blue-400 hover:underline">Sign in</a> to track this event.
            </div>
        );
    }

    // --- Render Logic ---

    if (isLoadingStatus) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-gray-700 rounded-lg"></div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="h-14 bg-gray-700 rounded-lg"></div>
                    <div className="h-14 bg-gray-700 rounded-lg"></div>
                    <div className="h-14 bg-gray-700 rounded-lg"></div>
                </div>
            </div>
        );
    }
    
    // Any error from fetching the status will be displayed here.
    if (statusError) {
        return (
            <div className="bg-red-500/10 text-red-300 text-xs p-3 rounded-lg flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Error loading status: {statusError.message}</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Display the tracked status if the event is tracked */}
            {trackingStatus?.isTracked ? (
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <Check className="w-5 h-5 text-green-400" />
                        <span className="text-green-300 font-medium text-sm capitalize">
                            Tracked as {trackingStatus.status}
                        </span>
                    </div>
                    <button
                        onClick={handleUntrackEvent}
                        disabled={isMutating}
                        className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50"
                    >
                        {isMutating ? 'Removing...' : 'Remove'}
                    </button>
                </div>
            ) : (
                // Display tracking options if the event is not tracked
                <div className="space-y-3">
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add a note (optional)..."
                        rows={2}
                        className="w-full bg-gray-800 text-sm p-2 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <div className="grid grid-cols-3 gap-2">
                        {/* Track Button: Bookmarked */}
                        <button
                            onClick={() => handleTrackEvent('bookmarked')}
                            disabled={isMutating}
                            className="flex flex-col items-center justify-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                        >
                            {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 text-yellow-400" />}
                            <span className="text-xs">Bookmark</span>
                        </button>
                        
                        {/* Track Button: Attending */}
                        <button
                            onClick={() => handleTrackEvent('attending')}
                            disabled={isMutating}
                            className="flex flex-col items-center justify-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                        >
                            {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4 text-blue-400" />}
                            <span className="text-xs">Attending</span>
                        </button>

                        {/* Track Button: Attended */}
                        <button
                            onClick={() => handleTrackEvent('attended')}
                            disabled={isMutating}
                            className="flex flex-col items-center justify-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
                        >
                            {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-400" />}
                            <span className="text-xs">Attended</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventTracking;