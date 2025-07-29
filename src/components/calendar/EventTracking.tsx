// src/components/calendar/EventTracking.tsx
'use client';

import { FC, useState, useEffect } from 'react';
import { Check, Star, UserCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking, EventStatus } from '@/hooks/useEventTracking';
import { AppEvent } from '@/types';

interface EventTrackingProps {
    event: AppEvent;
}

const EventTracking: FC<EventTrackingProps> = ({ event }) => {
    const { user } = useAuth();
    const { trackEvent, untrackEvent, isEventTracked, loading } = useEventTracking();
    const [trackingStatus, setTrackingStatus] = useState<{ isTracked: boolean; status?: EventStatus; }>({ isTracked: false });
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            if (!user) return;
            const status = await isEventTracked(event.id);
            setTrackingStatus(status);
        };
        checkStatus();
    }, [event.id, user, isEventTracked]);

    const handleTrackEvent = async (status: EventStatus) => {
        if (!user) return;
        setError(null);
        const result = await trackEvent(event.id, status, notes);
        if (result.success) {
            setTrackingStatus({ isTracked: true, status });
        } else {
            setError(result.error || 'Failed to track event');
        }
    };

    const handleUntrackEvent = async () => {
        if (!user) return;
        setError(null);
        const result = await untrackEvent(event.id);
        if (result.success) {
            setTrackingStatus({ isTracked: false });
        } else {
            setError(result.error || 'Failed to untrack event');
        }
    };

    if (!user) {
        return null; // Or show a "Login to track" message
    }

    return (
        <div className= "space-y-4" >
        { error && (
            <div className="bg-red-500/10 text-red-300 text-xs p-3 rounded-lg flex items-center space-x-2" >
                <AlertTriangle className="w-4 h-4" />
                    <span>{ error } </span>
                    </div>
      )}

{
    trackingStatus.isTracked ? (
        <div className= "flex items-center justify-between p-3 bg-green-500/10 rounded-lg" >
        <div className="flex items-center space-x-2" >
            <Check className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-medium text-sm" > Tracked as {trackingStatus.status
} </span>
    </div>
    < button onClick = { handleUntrackEvent } disabled = { loading } className = "text-red-400 hover:text-red-300 text-sm font-medium" >
        { loading? 'Removing...': 'Remove' }
        </button>
        </div>
      ) : (
    <div className= "space-y-3" >
    <textarea
            value={ notes }
onChange = {(e) => setNotes(e.target.value)}
placeholder = "Add a note..."
rows = { 2}
className = "w-full bg-gray-800 text-sm p-2 rounded-lg border border-gray-700 focus:ring-blue-500 focus:border-blue-500"
    />
    <div className="grid grid-cols-3 gap-2" >
        <button onClick={ () => handleTrackEvent('bookmarked') } disabled = { loading } className = "flex flex-col items-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg" >
            { loading?<RefreshCw className = "w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
<span className="text-xs" > Bookmark </span>
    </button>
    < button onClick = {() => handleTrackEvent('attending')} disabled = { loading } className = "flex flex-col items-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg" >
        { loading?<RefreshCw className = "w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
<span className="text-xs" > Attending </span>
    </button>
    < button onClick = {() => handleTrackEvent('attended')} disabled = { loading } className = "flex flex-col items-center space-y-1 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg" >
        { loading?<RefreshCw className = "w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
<span className="text-xs" > Attended </span>
    </button>
    </div>
    </div>
      )}
</div>
  );
};

export default EventTracking;