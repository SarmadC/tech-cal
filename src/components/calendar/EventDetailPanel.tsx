'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { XIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';

// 1. UPDATE IMPORTS: Use the new, specific type names.
import { Event, EventType, AgendaItem, MultiDayEventInstance } from '@/types';
import { EventService } from '@/services/eventServices';
import { createClient } from '@/utils/supabase/client';
import EventInfo from './EventInfo';
import EventActions from './EventActions';
import EventTracking from './EventTracking';
import AdaptiveTimeline from './AdaptiveTimeline';

// 2. UPDATE PROPS: The interface now uses the new types.
interface EventDetailPanelProps {
    event: Event;
    onClose: () => void;
    categories: EventType[];
}

const EventDetailPanel: FC<EventDetailPanelProps> = ({ event, onClose, categories }) => {
    const category = categories.find(c => c.id === event.eventTypeId);
    const [eventWithAgenda, setEventWithAgenda] = useState<Event & { agenda?: AgendaItem[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch complete event details with agenda
    useEffect(() => {
        const fetchEventWithAgenda = async () => {
            try {
                setIsLoading(true);
                const supabase = createClient();
                // Use originalEventId for multi-day instances, otherwise the regular id
                const fetchEventId = ('originalEventId' in event ? (event as MultiDayEventInstance).originalEventId : null) || event.id;
                const fullEvent = await EventService.getEventWithAgenda(fetchEventId, supabase);
                setEventWithAgenda(fullEvent);
            } catch (error) {
                console.warn('Failed to fetch event agenda, using basic event data:', error);
                setEventWithAgenda(event);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEventWithAgenda();
    }, [event.id, event]);

    const displayEvent = eventWithAgenda || event;

    return (
        <div className="h-full bg-[#1e1e1e] border-l border-gray-800 shadow-2xl p-6 flex flex-col relative">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white font-dm-sans">Event Details</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                    <XIcon className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto pr-2 -mr-2">
                <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-bold text-white flex-1">{displayEvent.title}</h3>

                    <Link
                        href={`/events/${displayEvent.id}`}
                        className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                        title="View full page"
                    >
                        <ArrowSquareOutIcon className="w-5 h-5" />
                    </Link>
                </div>

                <EventInfo event={displayEvent} category={category} />
                
                {/* Adaptive Timeline Section */}
                <div className="mt-6 pt-6 border-t border-gray-800">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-gray-400 text-sm">Loading agenda...</div>
                        </div>
                    ) : (
                        <AdaptiveTimeline event={displayEvent} />
                    )}
                </div>
            </div>

            <div className="mt-6 space-y-4 pt-4 border-t border-gray-800">
                <EventTracking event={displayEvent} />
                <EventActions event={displayEvent} />
            </div>
        </div>
    );
};

export default EventDetailPanel;