// src/app/calendar/page.tsx
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking } from '@/hooks/useEventTracking';
// cspell:disable-next-line
import { EventClickArg } from '@fullcalendar/core';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import {
    Sidebar,
    CalendarHeader,
    EventDetailPanel,
    CustomEventContent
} from '@/components/calendar/CalendarComponents';

// --- Type Definitions ---
type EnrichedEvent = {
    id: string;
    event_type_id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string | null;
    organizer: string;
    location: string;
    status: string;
    source_url: string;
    livestream_url: string | null;
    color: string;
    isTracked?: boolean;
};

type Category = {
    id: string;
    name: string;
    color: string;
    count?: number;
};

type CalendarViewType = 'month' | 'week' | 'day';

const viewMap: { [key: string]: string } = {
    day: 'timeGridDay',
    week: 'timeGridWeek',
    month: 'dayGridMonth',
};


// --- Main Page Component ---
export default function KureCalendarPage() {
    const { user, profile } = useAuth();
    const { getTrackedEvents } = useEventTracking();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<EnrichedEvent | null>(null);
    const [events, setEvents] = useState<EnrichedEvent[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trackedEventIds, setTrackedEventIds] = useState<Set<string>>(new Set());

    const calendarRef = useRef<FullCalendar>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [
                { data: eventTypesData, error: eventTypesError },
                { data: eventsData, error: eventsError },
                trackedEventsData
            ] = await Promise.all([
                supabase.from('event_type').select('*').order('name'),
                supabase.from('events').select('*').order('start_time', { ascending: true }),
                user ? getTrackedEvents() : Promise.resolve([])
            ]);

            if (eventTypesError) throw new Error('Failed to load event categories.');
            if (eventsError) throw new Error('Failed to load events.');

            const eventTypes: Category[] = (eventTypesData || []).map(type => ({
                ...type,
                count: eventsData?.filter(e => e.event_type_id === type.id).length || 0
            }));

            setCategories(eventTypes);
            setSelectedCategories(new Set(eventTypes.map(c => c.id)));
            setEvents(eventsData || []);
            setTrackedEventIds(new Set(trackedEventsData.map((e: { event_id: string }) => e.event_id)));

        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [user, getTrackedEvents]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const enrichedEvents = useMemo(() => {
        const categoryColorMap = new Map(categories.map(c => [c.id, c.color]));
        return events.map(event => ({
            ...event,
            color: categoryColorMap.get(event.event_type_id) || '#737373',
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [events, categories, trackedEventIds]);

    const filteredEvents = useMemo(() => {
        return enrichedEvents.filter(event => selectedCategories.has(event.event_type_id));
    }, [enrichedEvents, selectedCategories]);

    const nextUpcomingEvent = useMemo(() => {
        const now = new Date();
        return filteredEvents
            .filter(e => new Date(e.start_time) > now)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];
    }, [filteredEvents]);

    const fullCalendarEvents = useMemo(() => {
        return filteredEvents.map(event => {
            let endTime = event.end_time || undefined;
            if (event.start_time && event.end_time) {
                const startDate = new Date(event.start_time);
                const endDate = new Date(event.end_time);
                if (startDate.toDateString() !== endDate.toDateString()) {
                    endTime = undefined; // Don't span multi-day events
                }
            }
            return {
                id: event.id,
                title: event.title || 'Untitled Event',
                start: event.start_time,
                end: endTime,
                extendedProps: event
            };
        });
    }, [filteredEvents]);

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventId = clickInfo.event.id;
        const clickedEvent = enrichedEvents.find(e => e.id === eventId);
        if (clickedEvent) {
            setSelectedEvent(clickedEvent);
        }
    }, [enrichedEvents]);

    const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi) return;

        if (direction === 'today') {
            calendarApi.today();
        } else if (direction === 'prev') {
            calendarApi.prev();
        } else {
            calendarApi.next();
        }
        setCurrentDate(calendarApi.getDate());
    };

    const changeView = (newView: CalendarViewType) => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.changeView(viewMap[newView]);
            setView(newView);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                <p className="ml-4">Loading Calendar...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-red-900 text-white">
                <p>Error: {error}</p>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
                :root {
                    --fc-border-color: #262626;
                    --fc-daygrid-day-bg-color: transparent;
                    --fc-list-event-hover-bg-color: #262626;
                    --fc-page-bg-color: #171717;
                    --fc-theme-standard-border-color: #262626;
                    --fc-day-bg-color: transparent;
                    --fc-neutral-bg-color: #171717;
                }
                .fc .fc-toolbar.fc-header-toolbar {
                    margin: 0;
                    padding: 0;
                    display: none;
                }
                .fc .fc-col-header-cell-cushion {
                    color: #a3a3a3;
                    font-weight: 500;
                    padding: 1rem 0;
                }
                .fc .fc-daygrid-day-number {
                    color: #a3a3a3;
                    padding: 0.5rem;
                }
                .fc .fc-day-today .fc-daygrid-day-number {
                    color: #3b82f6;
                    font-weight: 700;
                }
                .fc .fc-day-today {
                    background-color: rgba(59, 130, 246, 0.05) !important;
                }
                .fc .fc-event {
                    border-radius: 12px;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    overflow: hidden;
                    background-color: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                }
                .fc .fc-event:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                .fc .fc-timegrid-slot-label-cushion {
                    color: #737373;
                }
                .fc .fc-timegrid-slot-lane {
                    border-color: #262626;
                }
                .fc-direction-ltr .fc-timegrid-col-events {
                    margin: 0;
                }
                .fc .fc-timegrid-event-harness-inset {
                    right: 2% !important;
                    left: 2% !important;
                }
                .fc-v-event .fc-event-main {
                    height: 100%;
                }
            `}</style>
            <div className="flex h-screen bg-[#171717] text-gray-300 font-sans">
                <Sidebar
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    categories={categories}
                    selectedCategories={selectedCategories}
                    setSelectedCategories={setSelectedCategories}
                    nextUpcomingEvent={nextUpcomingEvent}
                    user={{ name: profile?.full_name || 'Kure-Cal User', role: 'Product Designer' }}
                    events={filteredEvents}
                />

                <main className="flex-1 flex flex-col">
                    <CalendarHeader
                        currentDate={currentDate}
                        view={view}
                        onNavigate={navigateCalendar}
                        onChangeView={changeView}
                    />
                    <div className="flex-1 overflow-hidden p-6">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin]}
                            initialView={viewMap[view]}
                            headerToolbar={false}
                            events={fullCalendarEvents}
                            eventContent={CustomEventContent}
                            eventClick={handleEventClick}
                            height="100%"
                            dayHeaderClassNames="!border-x-0 !border-t-0"
                            dayCellClassNames="!border-x-0"
                            slotLaneClassNames="!border-x-0"
                            allDaySlot={false}
                        />
                    </div>
                </main>

                {selectedEvent && (
                    <EventDetailPanel
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        categories={categories}
                    />
                )}
            </div>
        </>
    );
}
