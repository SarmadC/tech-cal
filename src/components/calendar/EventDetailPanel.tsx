'use client';

import { FC } from 'react';
import Link from 'next/link';
import { MdClose, MdOpenInNew } from 'react-icons/md';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType } from '@/types';
import EventInfo from './EventInfo';
import EventActions from './EventActions';
import EventTracking from './EventTracking';
import EventAgenda from './EventAgenda';

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const EventDetailPanel: FC<EventDetailPanelProps> = ({ event, onClose, categories }) => {
    const category = categories.find(c => c.id === event.eventTypeId);

    return (
        <div className="h-full bg-[#1e1e1e] border-l border-gray-800 shadow-2xl p-6 flex flex-col relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Event Details</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                    <MdClose className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-white flex-1">{event.title}</h3>

                    <Link
                        href={`/events/${event.id}`}
                        className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                        title="View full page"
                    >
                        <MdOpenInNew className="w-5 h-5" />
                    </Link>
                </div>

                <EventInfo event={event} category={category} />
                
                {/* Enriched Agenda Section */}
                <div className="mt-6 pt-6 border-t border-gray-800">
                    <EventAgenda event={event} />
                </div>
            </div>

            <div className="mt-6 space-y-4 pt-4 border-t border-gray-800">
                <EventTracking event={event} />
                <EventActions event={event} />
            </div>
        </div>
    );
};

export default EventDetailPanel;