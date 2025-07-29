// src/components/calendar/EventDetailPanel.tsx (The final, clean version)
'use client';

import { FC } from 'react';
import { X } from 'lucide-react';
import { AppEvent, AppEventType } from '@/types';
import EventInfo from './EventInfo';
import EventActions from './EventActions';
import EventTracking from './EventTracking';

interface EventDetailPanelProps {
    event: AppEvent;
    onClose: () => void;
    categories: AppEventType[];
}

const EventDetailPanel: FC<EventDetailPanelProps> = ({ event, onClose, categories }) => {
    const category = categories.find(c => c.id === event.eventTypeId);

    return (
        <aside className="w-96 bg-[#1e1e1e] border-l border-gray-800 p-6 flex flex-col relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Event Details</h2>
                <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto">
                <h3 className="text-2xl font-bold text-white">{event.title}</h3>
                {/* Component for displaying info */}
                <EventInfo event={event} category={category} />
            </div>

            <div className="mt-6 space-y-4">
                {/* Component for user tracking state */}
                <EventTracking event={event} />
                {/* Component for external actions */}
                <EventActions event={event} />
            </div>
        </aside>
    );
};

export default EventDetailPanel;