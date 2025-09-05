'use client';

import { useMemo, useCallback, useRef, useReducer } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';

import { createClient } from '@/utils/supabase/client';
import { formatDateForURL } from '@/utils/dateUtils';
import { CalendarLayout, type CalendarLayoutContext } from './CalendarLayout';
import Loading from '@/components/Loading';
import CalendarWithPreview from '@/components/calendar/CalendarWithPreview';
import SmartFilterPanel from '@/components/calendar/SmartFilterPanel';

import { useSmartFilters } from '@/hooks/useSmartFilters';

import { Event, EventType, AppProfile, TrackedEvent, enrichWithTracking } from '@/types';
import { UserEventService } from '@/services/userEventService';
import { useAuth, CalendarProvider } from '@/contexts';
import { TechCalendarDayView } from '@/components/calendar/TechCalendarDayView';
import TechCalendarWeekView from '@/components/calendar/TechCalendarWeekView';

const EventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { loading: () => <Loading /> }
);

// State management interfaces
interface CalendarUIState {
    selectedEvent: Event | null;
    selectedDate: Date | null;
    isFilterPanelOpen: boolean;
    isSidebarOpen: boolean;
}

type CalendarUIAction = 
    | { type: 'SELECT_EVENT'; event: Event | null }
    | { type: 'SELECT_DATE'; date: Date | null }
    | { type: 'TOGGLE_FILTER_PANEL' }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'CLOSE_EVENT_DETAIL' };

// State reducer
function calendarUIReducer(state: CalendarUIState, action: CalendarUIAction): CalendarUIState {
    switch (action.type) {
        case 'SELECT_EVENT':
            return { ...state, selectedEvent: action.event };
        case 'SELECT_DATE':
            return { ...state, selectedDate: action.date };
        case 'TOGGLE_FILTER_PANEL':
            return { ...state, isFilterPanelOpen: !state.isFilterPanelOpen };
        case 'TOGGLE_SIDEBAR':
            return { ...state, isSidebarOpen: !state.isSidebarOpen };
        case 'CLOSE_EVENT_DETAIL':
            return { ...state, selectedEvent: null };
        default:
            return state;
    }
}

// Custom hook for calendar UI state
function useCalendarUIState() {
    const [state, dispatch] = useReducer(calendarUIReducer, {
        selectedEvent: null,
        selectedDate: null,
        isFilterPanelOpen: false,
        isSidebarOpen: true,
    });

    const actions = useMemo(() => ({
        selectEvent: (event: Event | null) => dispatch({ type: 'SELECT_EVENT', event }),
        selectDate: (date: Date | null) => dispatch({ type: 'SELECT_DATE', date }),
        toggleFilterPanel: () => dispatch({ type: 'TOGGLE_FILTER_PANEL' }),
        toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
        closeEventDetail: () => dispatch({ type: 'CLOSE_EVENT_DETAIL' }),
    }), []);

    return { state, actions };
}

// Custom hook for event data management
function useEventData(initialEvents: Event[], profile: AppProfile | null) {
    const { user } = useAuth();
    
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
            if (process.env.NODE_ENV === 'development') {
                console.log('[CalendarClientView] Fetching tracked event IDs for user:', user.id);
            }
            const supabase = createClient();
            const result = await UserEventService.getAllTrackedEventIds(user.id, supabase);
            if (process.env.NODE_ENV === 'development') {
                console.log('[CalendarClientView] Tracked event IDs:', result);
            }
            return result;
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    const enrichedEvents: TrackedEvent[] = useMemo(() => {
        const trackedSet = new Set(trackedEventIds);
        if (process.env.NODE_ENV === 'development' && filteredEvents.length > 0) {
            console.log('[CalendarClientView] Enriching events:', filteredEvents.length, 'total');
        }

        const result = filteredEvents.map(event => {
            const isTracked = trackedSet.has(event.id);
            const enriched = enrichWithTracking(event, isTracked);
            if (isTracked && process.env.NODE_ENV === 'development') {
                console.log('[CalendarClientView] Event is tracked:', event.id, event.title);
            }
            return enriched;
        });

        if (process.env.NODE_ENV === 'development' && result.length > 0) {
            console.log('[CalendarClientView] Enriched events:', result.length, 'Tracked:', result.filter(e => e.isTracked).length);
        }
        return result;
    }, [filteredEvents, trackedEventIds]);

    return {
        enrichedEvents,
        filters,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount
    };
}

// Custom hook for view-specific event filtering
function useViewEvents(enrichedEvents: TrackedEvent[], searchParams: URLSearchParams) {
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
        if (view !== 'week') return [];

        const dateParam = searchParams.get('date');
        const currentDate = dateParam ? (() => {
            const [year, month, day] = dateParam.split('-').map(Number);
            return new Date(year, month - 1, day);
        })() : new Date();

        // Get start of week (Monday)
        const dayOfWeek = currentDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() + daysToMonday);
        weekStart.setHours(0, 0, 0, 0);

        // Get end of week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Week calculation complete

        const filtered = enrichedEvents.filter((event: TrackedEvent) => {
            const eventStart = new Date(event.startTime);
            const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;
            const inRange = eventStart <= weekEnd && eventEnd >= weekStart;
            return inRange;
        });

        // Event filtering complete

        return filtered;
    }, [enrichedEvents, searchParams]);

    return { dayEvents, weekEvents };
}

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
    const calendarRef = useRef<FullCalendar | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();

    // Use custom hooks for simplified state management
    const { state, actions } = useCalendarUIState();
    const eventData = useEventData(initialEvents, profile);
    const { dayEvents, weekEvents } = useViewEvents(eventData.enrichedEvents, searchParams);

    // Get current date from URL params
    const currentDate = useMemo(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const [year, month, day] = dateParam.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date();
    }, [searchParams]);






    // Event handlers using simplified state management
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        const eventData = clickInfo.event.extendedProps as Event;
        actions.selectEvent(eventData);
    }, [actions]);

    const handleSelectEvent = useCallback((event: Event) => {
        actions.selectEvent(event);
    }, [actions]);
    
    const handleDateSelect = useCallback((date: Date) => {
        actions.selectDate(date);
        const params = new URLSearchParams(searchParams.toString());
        params.set('date', formatDateForURL(date));
        router.push(`/calendar?${params.toString()}`, { scroll: false });
    }, [searchParams, router, actions]);

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

        return <CalendarWithPreview events={eventData.enrichedEvents} onEventClick={handleEventClick} view={context.view} calendarRef={context.calendarRef} />;
    };

    return (
        <CalendarProvider
            selectedDate={state.selectedDate}
            currentDate={currentDate}
            events={eventData.enrichedEvents}
            categories={initialCategories}
            profile={profile}
            onDateSelect={handleDateSelect}
            onEventSelect={handleSelectEvent}
            onCloseEventDetail={actions.closeEventDetail}
        >
            <CalendarLayout
                onNavigate={(_direction) => {
                    // Handle navigation if needed
                }}
                onDateChange={handleDateSelect}
                onToggleFilters={actions.toggleFilterPanel}
                isFilterPanelOpen={state.isFilterPanelOpen}
                activeFilterCount={eventData.activeFilterCount}
                calendarRef={calendarRef}
                isSidebarOpen={state.isSidebarOpen}
                onToggleSidebar={actions.toggleSidebar}
                renderContent={(context) => (
                    <div className="flex h-full relative">
                        <div className="flex-1 relative">
                            {renderCalendarContent(context)}
                        </div>
                        {state.isFilterPanelOpen && (
                            <div 
                                className="fixed inset-0 z-40 bg-black bg-opacity-50"
                                onClick={actions.toggleFilterPanel}
                            >
                                <div 
                                    className="absolute right-0 top-0 h-full w-80 transform transition-transform duration-300 ease-in-out"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <SmartFilterPanel 
                                        filters={eventData.filters} 
                                        onUpdateFilter={eventData.updateFilter} 
                                        onResetFilters={eventData.resetFilters} 
                                        onApplyQuickFilter={eventData.applyQuickFilter} 
                                        activeFilterCount={eventData.activeFilterCount} 
                                        isOpen={state.isFilterPanelOpen} 
                                        onClose={actions.toggleFilterPanel} 
                                    />
                                </div>
                            </div>
                        )}
                        {state.selectedEvent && (
                            <div 
                                className="fixed inset-0 z-50 bg-black bg-opacity-50"
                                onClick={actions.closeEventDetail}
                            >
                                <div 
                                    className="absolute right-0 top-0 h-full w-96 transform transition-transform duration-300 ease-in-out"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <EventDetailPanelDynamic 
                                        event={state.selectedEvent} 
                                        onClose={actions.closeEventDetail} 
                                        categories={initialCategories} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            />
        </CalendarProvider>
    );
}