// src/app/calendar/CalendarClientView.tsx
'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import EventDetailPanel from '@/components/calendar/EventDetailPanel';
import CustomEventContent from '@/components/calendar/CustomEventContent';
import { AppEvent, AppEventType, AppProfile, AppTrackedEvent } from '@/types';
import { useTrackedEvents } from '@/hooks/useEventTracking';
import Loading from '@/components/Loading';

// Define props to receive data from the server
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

export default function CalendarClientView({
    initialEvents,
    initialCategories,
    profile,
}: CalendarClientViewProps) {
    // 👇 FIX #3: Use the new `useTrackedEvents` query hook
    // It handles fetching, loading, and error states for us.
    const { data: trackedEvents, isLoading: isLoadingTracked } = useTrackedEvents();

    // Server-side props are still used for the initial display
    const [events, _setEvents] = useState<AppEvent[]>(initialEvents);
    const [categories, _setCategories] = useState<AppEventType[]>(initialCategories);

    // Local UI state remains the same
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set(initialCategories.map(c => c.id)));

    const calendarRef = useRef<FullCalendar>(null);
    const trackedEventIds = useMemo(() => {
        return new Set((trackedEvents || []).map((e: AppTrackedEvent) => e.eventId));
    }, [trackedEvents]);

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
        return filteredEvents.map(event => ({
            id: event.id,
            title: event.title || 'Untitled Event',
            start: event.startTime,
            end: event.endTime || undefined,
            extendedProps: event,
            color: event.color
        }));
    }, [filteredEvents]);

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

    if (isLoadingTracked) {
        return <Loading />;
    }

    return (
        <div className="flex h-screen bg-[#171717] text-gray-300 font-sans">
            <CalendarSidebar
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                categories={categories}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                nextUpcomingEvent={nextUpcomingEvent}
                user={{
                    name: profile?.fullName || 'Kure-Cal User',
                    role: 'Product Designer'
                }}
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
                    // ... other FullCalendar props
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
    );
}