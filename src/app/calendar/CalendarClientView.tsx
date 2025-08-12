// src/app/calendar/CalendarClientView.tsx (Fully Modified Imports)
'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic'; // Added

import { createClient } from '@/utils/supabase/client';

import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import Loading from '@/components/Loading';
import CalendarWithPreview from '@/components/calendar/CalendarWithPreview';
import { useSmartFilters } from '@/hooks/useSmartFilters';

import { AppEvent, AppEventType, AppProfile, AppTrackedEvent } from '@/types';
import { UserEventService } from '@/services/userEventService';
import { useAuth } from '@/contexts/AuthContext';

// Dynamically import the components that are not visible on initial load
const EventDetailPanel = dynamic(() => import('@/components/calendar/EventDetailPanel'), {
    ssr: false,
});

const SmartFilterPanel = dynamic(() => import('@/components/calendar/SmartFilterPanel'), {
    ssr: false,
});

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
    const [supabase] = useState(() => createClient());
    const { user } = useAuth();

    const calendarRef = useRef<FullCalendar>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<CalendarViewType>('week');
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

    const {
        filters,
        filteredEvents,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount,
        isFilterPanelOpen,
        setIsFilterPanelOpen,
    } = useSmartFilters(initialEvents, profile);

    const { data: trackedEvents, isLoading: isLoadingTracked } = useQuery({
        queryKey: ['trackedEvents', user?.id],
        queryFn: () => {
            if (!user) return [];
            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user,
    });

    const trackedEventIds = useMemo(() => {
        return new Set((trackedEvents || []).map((e: AppTrackedEvent) => e.eventId));
    }, [trackedEvents]);

    const enrichedEvents = useMemo(() => {
        const categoryColorMap = new Map(initialCategories.map(c => [c.id, c.color]));
        return filteredEvents.map((event: AppEvent) => ({
            ...event,
            color: categoryColorMap.get(event.eventTypeId) || '#737373',
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [filteredEvents, initialCategories, trackedEventIds]);


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

    return (
        <div className="flex h-screen bg-background-main text-foreground-primary font-sans">
            <CalendarSidebar
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                categories={initialCategories} // Used by MiniCalendar for event dots
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
                    isFilterPanelOpen={isFilterPanelOpen}
                    onToggleFilters={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                    activeFilterCount={activeFilterCount}
                />
                <div className="flex-1 flex relative overflow-hidden">
                    <div className="flex-1 transition-all duration-300">
                        <div className="h-full overflow-y-auto p-4 md:p-6">
                            <CalendarWithPreview
                                events={enrichedEvents}
                                onEventClick={handleEventClick}
                                view={viewMap[view]}
                                date={currentDate}
                                calendarRef={calendarRef}
                            />
                        </div>
                    </div>
                    {isFilterPanelOpen && (
                        <div className="w-80 border-l border-border-subtle bg-background-secondary shadow-lg">
                            <SmartFilterPanel
                                filters={filters}
                                onUpdateFilter={updateFilter}
                                onResetFilters={resetFilters}
                                onApplyQuickFilter={applyQuickFilter}
                                activeFilterCount={activeFilterCount}
                                isOpen={isFilterPanelOpen}
                                onClose={() => setIsFilterPanelOpen(false)}
                            />
                        </div>
                    )}
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