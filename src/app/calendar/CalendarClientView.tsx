'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { createClient } from '@/utils/supabase/client';

import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import EventDetailPanel from '@/components/calendar/EventDetailPanel';
import CustomEventContent from '@/components/calendar/CustomEventContent';
import Loading from '@/components/Loading';

import { AppEvent, AppEventType, AppProfile, AppTrackedEvent } from '@/types';
// We will also update useTrackedEvents to use the new service pattern
import { UserEventService } from '@/services/userEventService';
import { useAuth } from '@/contexts/AuthContext';
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
    const [supabase] = useState(() => createClient());
    const { user } = useAuth(); // Get user for tracked events query

    const calendarRef = useRef<FullCalendar>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

    const { activeFilters, setFilters } = useFilters();

    // REMOVED THE REDUNDANT LOCAL STATE. The `activeFilters.searchTerm` from the useFilters hook is the source of truth.
    // The debouncing should happen where the user *input* is, not here.
    // For now, we will directly use activeFilters.searchTerm in the query.
    // If you add a search bar, you would use useState and useDebounce inside *that* component.

    // --- DATA FETCHING ---
    const { data: trackedEvents, isLoading: isLoadingTracked } = useQuery({
        queryKey: ['trackedEvents', user?.id],
        queryFn: () => {
            if (!user) return [];
            // useTrackedEvents was a hook, now we call the service directly
            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user,
    });

    const { data: events, isLoading: isLoadingEvents, isError, error } = useQuery({
        queryKey: ['events', activeFilters],
        queryFn: () => EventService.getEvents(activeFilters, supabase),
        initialData: initialEvents,
        placeholderData: keepPreviousData,
    });

    // --- DERIVED/MEMOIZED STATE ---
    const trackedEventIds = useMemo(() => {
        return new Set((trackedEvents || []).map((e: AppTrackedEvent) => e.eventId));
    }, [trackedEvents]);

    const enrichedEvents = useMemo(() => {
        const categoryColorMap = new Map(initialCategories.map(c => [c.id, c.color]));
        return (events || []).map((event: AppEvent) => ({
            ...event,
            color: categoryColorMap.get(event.eventTypeId) || '#737373',
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [events, initialCategories, trackedEventIds]);

    const nextUpcomingEvent = useMemo(() => {
        const now = new Date();
        return enrichedEvents
            .filter((e: AppEvent) => new Date(e.startTime) > now)
            .sort((a: AppEvent, b: AppEvent) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
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

    if (isLoadingTracked && !trackedEvents) {
        return <Loading />;
    }

    if (isError) {
        return <div>Error loading events: {error.message}</div>
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