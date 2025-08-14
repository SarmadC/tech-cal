'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { createClient } from '@/utils/supabase/client';
import { CalendarLayout, type CalendarLayoutContext } from './CalendarLayout';
import Loading from '@/components/Loading';
import CalendarWithPreview from '@/components/calendar/CalendarWithPreview';
import SmartFilterPanel from '@/components/calendar/SmartFilterPanel';

import { useSmartFilters } from '@/hooks/useSmartFilters';
import { AppEvent, AppEventType, AppProfile } from '@/types';
import { UserEventService } from '@/services/userEventService';
import { useAuth } from '@/contexts/AuthContext';

// Dynamic import for heavy components
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

    // --- State Management ---
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

    // --- Smart Filters ---
    const {
        filters,
        filteredEvents,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount
    } = useSmartFilters(initialEvents, profile);

    // --- Data Fetching & Processing ---
    const { data: trackedEvents = [] } = useQuery({
        queryKey: ['trackedEvents', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const supabase = createClient();
            return UserEventService.getTrackedEvents(user.id, supabase);
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const enrichedEvents = useMemo(() => {
        const trackedEventIds = new Set(trackedEvents.map(te => te.eventId));
        return filteredEvents.map(event => ({
            ...event,
            isTracked: trackedEventIds.has(event.id)
        }));
    }, [filteredEvents, trackedEvents]);

    // --- Event Handlers ---
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        // The event object is nested in extendedProps in FullCalendar
        const eventData = clickInfo.event.extendedProps as AppEvent;
        setSelectedEvent(eventData);
    }, []);

    const toggleFilterPanel = useCallback(() => {
        setIsFilterPanelOpen(prev => !prev);
    }, []);

    const closeEventDetail = useCallback(() => {
        setSelectedEvent(null);
    }, []);

    // --- Render Logic ---
    const renderCalendarContent = (context: CalendarLayoutContext) => {
        // Note: Day view is now handled directly in page.tsx with TechCalendarDayView
        // This component only handles Month and Week views
        if (context.view === 'day') {
            return (
                <div className="flex items-center justify-center h-full bg-gray-50">
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Day View</h3>
                        <p className="text-gray-600">
                            Day view is handled by a specialized component.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            If you are seeing this, there might be a routing issue.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <CalendarWithPreview
                events={enrichedEvents}
                onEventClick={handleEventClick}
                view={context.view}
                calendarRef={context.calendarRef}
            />
        );
    };

    return (
        <CalendarLayout
            profile={profile}
            categories={initialCategories}
            onToggleFilters={toggleFilterPanel}
            isFilterPanelOpen={isFilterPanelOpen}
            activeFilterCount={activeFilterCount}
            calendarRef={calendarRef}
            renderContent={(context) => (
                <div className="flex h-full">
                    {/* Main Calendar Content */}
                    <div className="flex-1 relative">
                        {renderCalendarContent(context)}
                    </div>

                    {/* Smart Filter Panel (Sidebar) */}
                    {isFilterPanelOpen && (
                        <div className="w-80 border-l border-border-default bg-background-elevated">
                            <SmartFilterPanel
                                filters={filters}
                                onUpdateFilter={updateFilter}
                                onResetFilters={resetFilters}
                                onApplyQuickFilter={applyQuickFilter}
                                activeFilterCount={activeFilterCount}
                                isOpen={isFilterPanelOpen}
                                onClose={toggleFilterPanel}
                            />
                        </div>
                    )}

                    {/* Event Detail Panel (Sidebar) */}
                    {selectedEvent && (
                        <div className="w-96 border-l border-border-default bg-background-elevated">
                            <EventDetailPanelDynamic
                                event={selectedEvent}
                                onClose={closeEventDetail}
                                categories={initialCategories}
                            />
                        </div>
                    )}
                </div>
            )}
        />
    );
}