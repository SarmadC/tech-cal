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

import { Event, EventType, AppProfile, TrackedEvent, enrichWithTracking } from '@/types';
import { UserEventService } from '@/services/userEventService';
import { useAuth } from '@/contexts/AuthContext';
import { TechCalendarDayView } from '@/components/calendar/TechCalendarDayView';
import TechCalendarWeekView from '@/components/calendar/TechCalendarWeekView';

const EventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { loading: () => <Loading /> }
);

interface CalendarClientViewProps {

    initialEvents: Event[];
    initialCategories: EventType[];
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


    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
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
            console.log('[CalendarClientView] Fetching tracked event IDs for user:', user.id);
            const supabase = createClient();
            const result = await UserEventService.getAllTrackedEventIds(user.id, supabase);
            console.log('[CalendarClientView] Tracked event IDs:', result);
            return result;
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });


    const enrichedEvents: TrackedEvent[] = useMemo(() => {
        const trackedSet = new Set(trackedEventIds);
        console.log('[CalendarClientView] Enriching events with tracking data:', {
            totalEvents: filteredEvents.length,
            trackedEventIds: trackedEventIds,
            trackedSet: Array.from(trackedSet)
        });

        const result = filteredEvents.map(event => {
            const isTracked = trackedSet.has(event.id);
            const enriched = enrichWithTracking(event, isTracked);
            if (isTracked) {
                console.log('[CalendarClientView] Event is tracked:', event.id, event.title);
            }
            return enriched;
        });

        console.log('[CalendarClientView] Total enriched events:', result.length, 'Tracked events:', result.filter(e => e.isTracked).length);
        return result;
    }, [filteredEvents, trackedEventIds]);


    const dayEvents = useMemo(() => {
        const view = searchParams.get('view') || 'month';
        if (view !== 'day') return [];

        const dateParam = searchParams.get('date');

        const currentDate = dateParam ? (() => {
            const [year, month, day] = dateParam.split('-').map(Number);
            return new Date(year, month - 1, day);
        })() : new Date();

        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        return enrichedEvents.filter((event: TrackedEvent) => {
            const eventStart = new Date(event.startTime);
            const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;

            return eventStart <= dayEnd && eventEnd >= dayStart;
        });
    }, [enrichedEvents, searchParams]);

    const weekEvents = useMemo(() => {
        const view = searchParams.get('view') || 'month';
        console.log('[CalendarClientView] View:', view);
        if (view !== 'week') return [];

        const dateParam = searchParams.get('date');
        const currentDate = dateParam ? (() => {
            const [year, month, day] = dateParam.split('-').map(Number);
            return new Date(year, month - 1, day);
        })() : new Date();

        console.log('[CalendarClientView] Current date:', currentDate);

        // Get start of week (Monday)
        const weekStart = new Date(currentDate);
        const dayOfWeek = weekStart.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - daysToMonday);
        weekStart.setHours(0, 0, 0, 0);

        // Get end of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        console.log('[CalendarClientView] Week range:', weekStart, 'to', weekEnd);
        console.log('[CalendarClientView] Total enriched events to filter:', enrichedEvents.length);

        const filtered = enrichedEvents.filter((event: TrackedEvent) => {
            const eventStart = new Date(event.startTime);
            const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;

            const inRange = eventStart <= weekEnd && eventEnd >= weekStart;
            console.log('[CalendarClientView] Event:', event.title, 'from', eventStart, 'to', eventEnd, 'in range:', inRange);
            
            return inRange;
        });

        console.log('[CalendarClientView] Filtered week events:', filtered.length);
        return filtered;
    }, [enrichedEvents, searchParams]);


    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as Event;
        setSelectedEvent(eventData);
    }, []);

    // --- FIX START ---
    // Create a new handler to select an event directly.
    const handleSelectEvent = useCallback((event: Event) => {
        setSelectedEvent(event);
    }, []);
    // --- FIX END ---

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
            return <TechCalendarDayView 
                events={dayEvents} 
                initialDate={context.date} 
                categories={initialCategories} 
                profile={profile}
                onEventSelect={handleSelectEvent}
            />;
        }

        if (context.view === 'week') {
            return <TechCalendarWeekView 
                events={weekEvents} 
                initialDate={context.date} 
                categories={initialCategories} 
                profile={profile}
                onEventSelect={handleSelectEvent}
            />;
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
            // --- FIX START ---
            // Pass the new handler down to the layout component.
            onSelectEvent={handleSelectEvent}
            // --- FIX END ---
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