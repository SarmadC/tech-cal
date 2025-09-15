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
        <div className="flex space-x-3">
            <a href={googleCalendarLink} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-900 rounded-lg font-semibold text-center dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-900">
                Add to Google
            </a>
            <button onClick={handleIcsDownload} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
                <CalendarPlusIcon className="w-5 h-5" />
            </button>
            <button onClick={handleShare} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
                <ShareNetworkIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default EventActions;