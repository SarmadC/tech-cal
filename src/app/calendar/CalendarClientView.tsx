// src/app/calendar/CalendarClientView.tsx
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useQuery } from '@tanstack/react-query';

import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import EventDetailPanel from '@/components/calendar/EventDetailPanel';
import CustomEventContent from '@/components/calendar/CustomEventContent';
import Loading from '@/components/Loading';

import { AppEvent, AppEventType, AppProfile } from '@/types';
import { useTrackedEvents } from '@/hooks/useEventTracking';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilters } from '@/hooks/useFilters';
import { EventService } from '@/services/eventServices';

// --- Prop Definitions ---
interface CalendarClientViewProps {
    initialEvents: AppEvent[];
    initialCategories: AppEventType[];
    profile: AppProfile | null;
}

type CalendarViewType = 'month' | 'week' | 'day';

const viewMap: { [key: string]: string } = {
    day: 'timeGridDay',
    week: 'timeGridWeek',
    month: 'dayGridMonth',
};

// --- Main Component ---
export default function CalendarClientView({
    initialEvents,
    initialCategories,
    profile,
}: CalendarClientViewProps) {
    // --- State & Refs ---
    const calendarRef = useRef<FullCalendar>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

    // --- Filter & Search State Management ---
    const { activeFilters, setFilters } = useFilters();
    const [localSearchTerm, setLocalSearchTerm] = useState(activeFilters.searchTerm);
    const debouncedSearchTerm = useDebounce(localSearchTerm, 500);

    // Sync debounced search term back to the URL
    useEffect(() => {
        // This check prevents an unnecessary router push on initial load
        if (debouncedSearchTerm !== activeFilters.searchTerm) {
            setFilters({ searchTerm: debouncedSearchTerm });
        }
    }, [debouncedSearchTerm, activeFilters.searchTerm, setFilters]);

    // --- Data Fetching with TanStack Query ---

    // Query 1: Fetches the main list of events based on active filters
    const { data: events, isLoading: isLoadingEvents } = useQuery({
        queryKey: ['events', activeFilters],
        queryFn: async () => {
            const response = await EventService.getEvents(activeFilters);
            if (!response.success) throw new Error(response.error || 'Failed to fetch events');
            return response.data || [];
        },
        // Use the server-fetched data as the initial state for this query
        initialData: initialEvents,
        // Keep the data fresh, but don't cause excessive refetching
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Query 2: Fetches the user's tracked events (for enrichment)
    const { data: trackedEvents } = useTrackedEvents();
    
    // --- Memoized Derived State ---

    const trackedEventIds = useMemo(() => new Set((trackedEvents || []).map(e => e.eventId)), [trackedEvents]);

    const enrichedEvents = useMemo(() => {
        return (events || []).map(event => ({
            ...event,
            isTracked: trackedEventIds.has(event.id),
        }));
    }, [events, trackedEventIds]);

    const nextUpcomingEvent = useMemo(() => {
        const now = new Date();
        return (enrichedEvents || [])
            .filter(e => new Date(e.startTime) > now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    }, [enrichedEvents]);

    const fullCalendarEvents = useMemo(() => {
        return (enrichedEvents || []).map(event => ({
            id: event.id,
            title: event.title,
            start: event.startTime,
            end: event.endTime || undefined,
            extendedProps: event,
            color: event.category?.color || '#737373',
        }));
    }, [enrichedEvents]);

    // --- Event Handlers ---

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        setSelectedEvent(clickInfo.event.extendedProps as AppEvent);
    }, []);

    const navigateCalendar = (direction: 'prev' | 'next' | 'today') => {
        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi) return;
        if (direction === 'today') calendarApi.today();
        else if (direction === 'prev') calendarApi.prev();
        else calendarApi.next();
        setCurrentDate(calendarApi.getDate());
    };

    const changeView = (newView: CalendarViewType) => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.changeView(viewMap[newView]);
            setView(newView);
        }
    };

    // --- Render Logic ---
    if (isLoadingEvents && !initialEvents) {
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
                    role: 'Product Designer',
                }}
                events={enrichedEvents}
            />
            <main className="flex-1 flex flex-col">
                <CalendarHeader
                    currentDate={currentDate}
                    view={view}
                    onNavigate={navigateCalendar}
                    onChangeView={changeView}
                    // TODO: Add search bar to the header
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