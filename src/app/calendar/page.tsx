// src/app/calendar/page.tsx
'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useEventTracking, TrackedEvent } from '@/hooks/useEventTracking';
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

// --- Type Imports ---
import { AppEvent, AppEventType, SupabaseEvent, SupabaseEventType } from '@/types';
import { mapSupabaseEventToAppEvent, mapSupabaseEventTypeToAppEventType } from '@/lib/dataMapper';

// --- Type Definitions for this component ---
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
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null); // Use AppEvent
    const [events, setEvents] = useState<AppEvent[]>([]); // Use AppEvent[]
    const [categories, setCategories] = useState<AppEventType[]>([]); // Use AppEventType[]
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

            // --- Data Transformation Step ---
            const mappedEvents: AppEvent[] = (eventsData as SupabaseEvent[] || []).map(mapSupabaseEventToAppEvent);
            const mappedEventTypes: AppEventType[] = (eventTypesData as SupabaseEventType[] || []).map(cat => ({
                ...mapSupabaseEventTypeToAppEventType(cat),
                eventCount: (eventsData as SupabaseEvent[])?.filter(e => e.event_type_id === cat.id).length || 0,
            }));

            setCategories(mappedEventTypes);
            setSelectedCategories(new Set(mappedEventTypes.map(c => c.id)));
            setEvents(mappedEvents);
            setTrackedEventIds(new Set((trackedEventsData as TrackedEvent[]).map(e => e.eventId)));

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
            color: categoryColorMap.get(event.eventTypeId) || '#737373',
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [events, categories, trackedEventIds]);

    const filteredEvents = useMemo(() => {
        return enrichedEvents.filter(event => selectedCategories.has(event.eventTypeId));
    }, [enrichedEvents, selectedCategories]);

    const nextUpcomingEvent = useMemo(() => {
        const now = new Date();
        return filteredEvents
            .filter(e => new Date(e.startTime) > now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    }, [filteredEvents]);

    const fullCalendarEvents = useMemo(() => {
        return filteredEvents.map(event => {
            let endTime = event.endTime || undefined;
            if (event.startTime && event.endTime) {
                const startDate = new Date(event.startTime);
                const endDate = new Date(event.endTime);
                if (startDate.toDateString() !== endDate.toDateString()) {
                    endTime = undefined; // Don't span multi-day events
                }
            }
            return {
                id: event.id,
                title: event.title || 'Untitled Event',
                start: event.startTime,
                end: endTime,
                extendedProps: event
            };
        });
    }, [filteredEvents]);

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const clickedEvent = clickInfo.event.extendedProps as AppEvent;
        if (clickedEvent) {
            setSelectedEvent(clickedEvent);
        }
    }, []);

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
                /* ... Global styles remain unchanged ... */
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