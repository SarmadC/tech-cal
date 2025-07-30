// src/app/calendar/CalendarClientView.tsx
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import EventDetailPanel from '@/components/calendar/EventDetailPanel';
import CustomEventContent from '@/components/calendar/CustomEventContent';
import Loading from '@/components/Loading';

import { AppEvent, AppEventType, AppProfile, AppTrackedEvent } from '@/types';
import { useTrackedEvents } from '@/hooks/useEventTracking';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilters } from '@/hooks/useFilters';
import { EventService } from '@/services/eventServices';

interface CalendarClientViewProps {
    initialEvents: AppEvent[];
    initialCategories: AppEventType[];
    profile: AppProfile | null;
}

type CalendarViewType = 'month' | 'week' | 'day';

const viewMap: { [key: string]: string } = {
    day: 'timeGridDay', week: 'timeGridWeek', month: 'dayGridMonth',
};

export default function CalendarClientView({
    initialEvents,
    initialCategories,
    profile,
}: CalendarClientViewProps) {
    // --- STATE MANAGEMENT ---
    const calendarRef = useRef<FullCalendar>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

    // --- URL-BASED FILTER STATE ---
    const { activeFilters, setFilters } = useFilters();
    const [localSearchTerm, _setLocalSearchTerm] = useState(activeFilters.searchTerm);
    const debouncedSearchTerm = useDebounce(localSearchTerm, 400);

    // Effect to sync debounced search term back to the URL
    useEffect(() => {
        setFilters({ searchTerm: debouncedSearchTerm });
    }, [debouncedSearchTerm, setFilters]);

    // --- DATA FETCHING ---
    const { data: trackedEvents, isLoading: isLoadingTracked } = useTrackedEvents();

    const { data: events, isLoading: isLoadingEvents } = useQuery({
        queryKey: ['events', activeFilters],
        queryFn: async () => {
            const response = await EventService.getEvents(activeFilters);
            if (!response.success) throw new Error(response.error || 'Failed to fetch events');
            return response.data || [];
        },
        initialData: initialEvents,
        placeholderData: keepPreviousData,
    });

    // --- DERIVED/MEMOIZED STATE ---
    const trackedEventIds = useMemo(() => {
        return new Set((trackedEvents || []).map((e: AppTrackedEvent) => e.eventId));
    }, [trackedEvents]);

    const enrichedEvents = useMemo(() => {
        const categoryColorMap = new Map(initialCategories.map(c => [c.id, c.color]));
        return (events || []).map(event => ({
            ...event,
            color: categoryColorMap.get(event.eventTypeId) || '#737373',
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [events, initialCategories, trackedEventIds]);

    const nextUpcomingEvent = useMemo(() => {
        const now = new Date();
        return enrichedEvents
            .filter(e => new Date(e.startTime) > now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    }, [enrichedEvents]);

    const fullCalendarEvents = useMemo(() => {
        return enrichedEvents.map(event => ({
            id: event.id,
            title: event.title || 'Untitled Event',
            start: event.startTime,
            end: event.endTime || undefined,
            extendedProps: event,
            color: event.color
        }));
    }, [enrichedEvents]);

    // --- CALLBACKS & HANDLERS ---
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        setSelectedEvent(clickInfo.event.extendedProps as AppEvent);
    }, []);

    const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
        const api = calendarRef.current?.getApi();
        if (!api) return;
        api[direction]();
        setCurrentDate(api.getDate());
    };

    const changeView = (newView: CalendarViewType) => {
        calendarRef.current?.getApi().changeView(viewMap[newView]);
        setView(newView);
    };

    // Use the most relevant loading state
    if (isLoadingTracked && !trackedEvents) {
        return <Loading />;
    }

    return (
        <div className="flex h-screen bg-[#171717] text-gray-300 font-sans">
            <CalendarSidebar
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                categories={initialCategories}
                selectedCategories={new Set(activeFilters.categories)}
                setSelectedCategories={(newSet) => setFilters({ categories: Array.from(newSet) })}
                nextUpcomingEvent={nextUpcomingEvent}
                user={{
                    name: profile?.fullName || 'Kure-Cal User',
                    role: 'Product Designer'
                }}
                events={enrichedEvents}
            />
            <main className="flex-1 flex flex-col">
                <CalendarHeader
                    currentDate={currentDate}
                    view={view}
                    onNavigate={navigateCalendar}
                    onChangeView={changeView}
                // TODO: Pass search term props to a SearchBar in the header
                />
                <div className="flex-1 overflow-hidden p-6">
                    {isLoadingEvents && (
                        <div className="absolute top-24 right-10 z-10 p-2 bg-gray-600/50 rounded-lg text-xs animate-pulse">
                            Loading...
                        </div>
                    )}
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
                    categories={initialCategories}
                />
            )}
        </div>
    );
}