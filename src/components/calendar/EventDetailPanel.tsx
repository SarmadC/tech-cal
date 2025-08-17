'use client';

import { FC } from 'react';
import Link from 'next/link';
import { X, ArrowUpRight } from 'lucide-react';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType } from '@/types';
import EventInfo from './EventInfo';
import EventActions from './EventActions';
import EventTracking from './EventTracking';

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
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

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-white flex-1">{event.title}</h3>

                    <Link
                        href={`/events/${event.id}`}
                        className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                        title="View full page"
                    >
                        <ArrowUpRight className="w-5 h-5" />
                    </Link>
                </div>

                <EventInfo event={event} category={category} />
            </div>

            <div className="mt-6 space-y-4 pt-4 border-t border-gray-800">
                <EventTracking event={event} />
                <EventActions event={event} />
            </div>
        </aside>
    );
};

export default EventDetailPanel;