'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

import { createClient } from '@/utils/supabase/client';
import { CalendarLayout, type CalendarLayoutContext } from './CalendarLayout';
import Loading from '@/components/Loading';
import CalendarWithPreview from '@/components/calendar/CalendarWithPreview';
import SmartFilterPanel from '@/components/calendar/SmartFilterPanel';

import { useSmartFilters } from '@/hooks/useSmartFilters';
import { AppEvent, AppEventType, AppProfile } from '@/types';
import { UserEventService } from '@/services/userEventService';
import { useAuth } from '@/contexts/AuthContext';
import { TechCalendarDayView } from '@/components/calendar/TechCalendarDayView';

const EventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { loading: () => <Loading /> }
);

interface CalendarClientViewProps {
    initialEvents: AppEvent[];
    initialCategories: AppEventType[];
    profile: AppProfile | null;
}

export default function CalendarClientView({
    initialEvents,
    initialCategories,
    profile,
}: CalendarClientViewProps) {
    const { user } = useAuth();
    const calendarRef = useRef<FullCalendar | null>(null);
    const searchParams = useSearchParams();

    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    const {
        filters,
        filteredEvents,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount
    } = useSmartFilters(initialEvents, profile);

    const { data: trackedEventIds = [] } = useQuery({
        queryKey: ['allTrackedEventIds', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const supabase = createClient();
            return UserEventService.getAllTrackedEventIds(user.id, supabase);
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    const enrichedEvents = useMemo(() => {
        const trackedSet = new Set(trackedEventIds);
        return filteredEvents.map(event => ({
            ...event,
            isTracked: trackedSet.has(event.id)
        }));
    }, [filteredEvents, trackedEventIds]);

    // Replace the dayEvents useMemo in CalendarClientView.tsx

    const dayEvents = useMemo(() => {
        const view = searchParams.get('view') || 'month';
        if (view !== 'day') return [];

        const dateParam = searchParams.get('date');

        // Use the same timezone-safe parsing logic as CalendarLayout
        const currentDate = dateParam ? (() => {
            const [year, month, day] = dateParam.split('-').map(Number);
            // This creates a date at midnight in the user's LOCAL timezone.
            return new Date(year, month - 1, day);
        })() : new Date();

        // Create date boundaries for the current view day
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        // FIXED: Filter for events that overlap with the current day
        return enrichedEvents.filter((event: AppEvent) => {
            const eventStart = new Date(event.startTime);
            const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;

            // Include event if it overlaps with the current day
            // Event overlaps if: event starts before day ends AND event ends after day starts
            return eventStart <= dayEnd && eventEnd >= dayStart;
        });
    }, [enrichedEvents, searchParams]);

    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as AppEvent;
        setSelectedEvent(eventData);
    }, []);

    const monthlyEventCounts = useMemo(() => {
        const counts = new Map<string, Map<number, number>>();
        for (const event of enrichedEvents) {
            const eventDate = new Date(event.startTime);
            const year = eventDate.getFullYear();
            const month = eventDate.getMonth();
            const day = eventDate.getDate();
            const key = `${year}-${month}`;
            if (!counts.has(key)) {
                counts.set(key, new Map<number, number>());
            }
            const monthMap = counts.get(key)!;
            monthMap.set(day, (monthMap.get(day) || 0) + 1);
        }
        return counts;
    }, [enrichedEvents]);

    const toggleFilterPanel = useCallback(() => setIsFilterPanelOpen(prev => !prev), []);
    const closeEventDetail = useCallback(() => setSelectedEvent(null), []);

    const renderCalendarContent = (context: CalendarLayoutContext) => {
        if (context.view === 'day') {
            return <TechCalendarDayView events={dayEvents} initialDate={context.date} categories={initialCategories} profile={profile} />;
        }
        return <CalendarWithPreview events={enrichedEvents} onEventClick={handleEventClick} view={context.view} calendarRef={context.calendarRef} />;
    };

    return (
        <CalendarLayout
            profile={profile}
            categories={initialCategories}
            events={enrichedEvents}
            monthlyEventCounts={monthlyEventCounts}
            onToggleFilters={toggleFilterPanel}
            isFilterPanelOpen={isFilterPanelOpen}
            activeFilterCount={activeFilterCount}
            calendarRef={calendarRef}
            renderContent={(context) => (
                <div className="flex h-full">
                    <div className="flex-1 relative">
                        {renderCalendarContent(context)}
                    </div>
                    {isFilterPanelOpen && (
                        <div className="w-80 border-l border-border-default bg-background-elevated">
                            <SmartFilterPanel filters={filters} onUpdateFilter={updateFilter} onResetFilters={resetFilters} onApplyQuickFilter={applyQuickFilter} activeFilterCount={activeFilterCount} isOpen={isFilterPanelOpen} onClose={toggleFilterPanel} />
                        </div>
                    )}
                    {selectedEvent && (
                        <div className="w-96 border-l border-border-default bg-background-elevated">
                            <EventDetailPanelDynamic event={selectedEvent} onClose={closeEventDetail} categories={initialCategories} />
                        </div>
                    )}
                </div>
            )}
        />
    );
}