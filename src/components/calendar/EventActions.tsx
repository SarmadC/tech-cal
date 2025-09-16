// src/components/calendar/EventActions.tsx
'use client';
import { FC } from 'react';
import { CalendarPlusIcon, ShareNetworkIcon } from '@phosphor-icons/react';
// 1. UPDATE IMPORT: Use the new, canonical `Event` type.
import { Event } from '@/types';
import { useEventActions } from '@/hooks/useEventActions';

// 2. UPDATE PROPS: The interface now uses the `Event` type.
interface EventActionsProps {
    event: Event;
}

const EventActions: FC<EventActionsProps> = ({ event }) => {
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(event);

    return (
        <div className="space-y-3">
            {/* Primary Action - Full width for better balance */}
            <a 
                href={googleCalendarLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg font-medium text-sm transition-colors dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-900 w-full"
            >
                <CalendarPlusIcon className="w-4 h-4" />
                <span>Add to Calendar</span>
            </a>
            
            {/* Secondary Actions - Evenly spaced row */}
            <div className="flex gap-3">
                <button 
                    onClick={handleIcsDownload} 
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Download ICS file"
                >
                    <CalendarPlusIcon className="w-4 h-4 text-gray-300" />
                    <span className="text-sm text-gray-300">Download .ics</span>
                </button>
                <button 
                    onClick={handleShare} 
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Share event"
                >
                    <ShareNetworkIcon className="w-4 h-4 text-gray-300" />
                    <span className="text-sm text-gray-300">Share</span>
                </button>
            </div>
        </div>
    );
};

export default EventActions;