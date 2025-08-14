// src/components/calendar/EventActions.tsx
import { FC } from 'react';
import { Calendar as CalendarIcon, Share2 } from 'lucide-react';
import { AppEvent } from '@/types';
import { useEventActions } from '@/hooks/useEventActions';

interface EventActionsProps {
    event: AppEvent;
}

const EventActions: FC<EventActionsProps> = ({ event }) => {
    // The hook is now simpler to use. It doesn't return any state.
    const { handleShare, googleCalendarLink, handleIcsDownload } = useEventActions(event);

    return (
        <div className="flex space-x-3">
            <a href={googleCalendarLink} target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-center">
                Add to Google
            </a>
            <button onClick={handleIcsDownload} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
                <CalendarIcon className="w-5 h-5" />
            </button>
            <button onClick={handleShare} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
                <Share2 className="w-5 h-5" />
            </button>
        </div>
    );
};

export default EventActions;