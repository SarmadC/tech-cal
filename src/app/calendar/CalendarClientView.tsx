'use client';

import { useMemo, useCallback, useRef, useReducer } from 'react';
import { EventClickArg, FullCalendar } from '@/types/fullcalendar';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useResizeListener } from '@/hooks/useEventListener';

import { formatDateForURL } from '@/utils/dateUtils';
import { CalendarLayout, type CalendarLayoutContext } from './CalendarLayout';
import { PageErrorBoundary } from '@/components/common/ErrorBoundary';
import Loading from '@/components/Loading';
import SmartFilterPanel from '@/components/calendar/SmartFilterPanel';
import AdaptiveCalendarRenderer from '@/components/calendar/adaptive/AdaptiveCalendarRenderer';

import { useUnifiedServerFiltering } from '@/hooks/useUnifiedServerFiltering';

import { Event, EventType, AppProfile, TrackedEvent, MultiDayEvent } from '@/types';
import { CalendarProvider } from '@/contexts';
import { useIsMobile } from '@/hooks/useDeviceDetection';

const EventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/EventDetailPanel'),
    { loading: () => <Loading /> }
);

const MobileEventDetailPanelDynamic = dynamic(
    () => import('@/components/calendar/mobile/MobileEventDetailPanel'),
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
        isSidebarOpen: false, // Start with sidebar closed to prevent mobile intrusion
    });
    
    // Sidebar starts closed by default - no auto-open behavior
    // useEffect(() => {
    //     if (typeof window === 'undefined') return;

    //     const isMobile = window.innerWidth < 768;
    //     if (!isMobile) {
    //         dispatch({ type: 'TOGGLE_SIDEBAR' }); // Open sidebar on desktop initially
    //     }
    // }, []); // Empty dependency array - only run on mount

    // Handle mobile resize - close sidebar when switching to mobile
    useResizeListener(() => {
        if (typeof window === 'undefined') return;

        const isMobile = window.innerWidth < 768;

        // Only close sidebar on mobile if it's open
        if (isMobile && state.isSidebarOpen) {
            dispatch({ type: 'TOGGLE_SIDEBAR' }); // Close sidebar on mobile
        }
    }, typeof window !== 'undefined' ? window : null, { passive: true });

    const actions = useMemo(() => ({
        selectEvent: (event: Event | null) => dispatch({ type: 'SELECT_EVENT', event }),
        selectDate: (date: Date | null) => dispatch({ type: 'SELECT_DATE', date }),
        toggleFilterPanel: () => dispatch({ type: 'TOGGLE_FILTER_PANEL' }),
        toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
        closeEventDetail: () => dispatch({ type: 'CLOSE_EVENT_DETAIL' }),
    }), []);

    return { state, actions };
}

// Custom hook for event data management - now uses server-side filtering
function useEventData(profile: AppProfile | null) {
    const {
        filteredEvents: enrichedEvents,
        isLoading,
        isBackgroundRefetch,
        error,
        filters,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount,
        isFilterPanelOpen,
        setIsFilterPanelOpen,
        refetch
    } = useUnifiedServerFiltering(
        profile,
        {},
        { surface: 'calendar', autoLoadAllPages: true }
    );

    return {
        enrichedEvents,
        isLoading,
        isBackgroundRefetch,
        error,
        filters,
        updateFilter,
        resetFilters,
        applyQuickFilter,
        activeFilterCount,
        isFilterPanelOpen,
        setIsFilterPanelOpen,
        refetch
    };
}

// Custom hook for view-specific event filtering
function useViewEvents(enrichedEvents: TrackedEvent[], searchParams: URLSearchParams) {
    const dayEvents = useMemo((): MultiDayEvent[] => {
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

        // First, let's see what events we have
        console.log('All tracked events:', enrichedEvents.map(te => ({
            title: te.title || 'No title',
            startTime: te.startTime || 'No start time',
            endTime: te.endTime || 'No end time',
            isMultiDay: 'isMultiDay' in te ? te.isMultiDay : false
        })));

        const filtered = enrichedEvents
            .filter((trackedEvent: TrackedEvent) => {
                // TrackedEvent is EventWithTracking, so properties are spread directly
                const eventStart = new Date(trackedEvent.startTime);
                const eventEnd = trackedEvent.endTime ? new Date(trackedEvent.endTime) : eventStart;
                const inRange = eventStart <= dayEnd && eventEnd >= dayStart;
                
                // Debug each event's date range - simplified
                if (trackedEvent.title.includes('Microsoft') || trackedEvent.title.includes('Ignite')) {
                    console.log('Microsoft Ignite event check:', {
                        title: trackedEvent.title,
                        eventStart: trackedEvent.startTime,
                        eventEnd: trackedEvent.endTime,
                        parsedStart: eventStart.toISOString(),
                        parsedEnd: eventEnd.toISOString(),
                        dayStart: dayStart.toISOString(),
                        dayEnd: dayEnd.toISOString(),
                        inRange: inRange,
                        isMultiDay: 'isMultiDay' in trackedEvent ? trackedEvent.isMultiDay : false
                    });
                }
                
                return inRange;
            });
        
        console.log('Day events filtered:', {
            totalTrackedEvents: enrichedEvents.length,
            filteredCount: filtered.length,
            viewDate: currentDate.toDateString(),
            dayStart: dayStart.toISOString(),
            dayEnd: dayEnd.toISOString(),
            filteredEvents: filtered.map(e => ({ title: e.title, startTime: e.startTime }))
        });
        
        return filtered as unknown as MultiDayEvent[];
    }, [enrichedEvents, searchParams]);

    const weekEvents = useMemo((): MultiDayEvent[] => {
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

        const filtered = enrichedEvents
            .filter((trackedEvent: TrackedEvent) => {
                // TrackedEvent is EventWithTracking, so properties are spread directly
                const eventStart = new Date(trackedEvent.startTime);
                const eventEnd = trackedEvent.endTime ? new Date(trackedEvent.endTime) : eventStart;
                const inRange = eventStart <= weekEnd && eventEnd >= weekStart;
                return inRange;
            });

        // Event filtering complete

        return filtered as unknown as MultiDayEvent[];
    }, [enrichedEvents, searchParams]);

    return { dayEvents, weekEvents };
}

interface CalendarClientViewProps {
    initialEvents: (Event | MultiDayEvent)[];
    initialCategories: EventType[];
    profile: AppProfile | null;
}

export default function CalendarClientView({
    initialEvents: _initialEvents, // No longer needed with server-side filtering
    initialCategories,
    profile,
}: CalendarClientViewProps) {
    const calendarRef = useRef<FullCalendar | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const isMobile = useIsMobile();

    // Use custom hooks for simplified state management
    const { state, actions } = useCalendarUIState();
    const eventData = useEventData(profile);
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
        // Event selection handled
        actions.selectEvent(event);
    }, [actions]);
    
    const handleDateSelect = useCallback((date: Date) => {
        actions.selectDate(date);
        const params = new URLSearchParams(searchParams.toString());
        params.set('date', formatDateForURL(date));
        router.push(`/calendar?${params.toString()}`, { scroll: false });
    }, [searchParams, router, actions]);

    
    const renderCalendarContent = (context: CalendarLayoutContext) => {
        // Show loading state (only on initial load)
        if (eventData.isLoading) {
            return (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading events...</p>
                    </div>
                </div>
            );
        }

        // Show error state
        if (eventData.error) {
            return (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">Error loading events: {eventData.error}</p>
                        <button
                            onClick={eventData.refetch}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="relative">
                <AdaptiveCalendarRenderer
                    view={context.view}
                    events={eventData.enrichedEvents}
                    weekEvents={weekEvents}
                    dayEvents={dayEvents}
                    initialDate={context.date}
                    categories={initialCategories}
                    profile={profile}
                    trackedEvents={eventData.enrichedEvents.filter(e => e.isTracked)}
                    onEventSelect={handleSelectEvent}
                    onEventClick={handleEventClick}
                    calendarRef={context.calendarRef}
                />
                {/* Background refetch indicator */}
                {eventData.isBackgroundRefetch && (
                    <div className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-card/95 dark:bg-card/40 backdrop-blur-sm border border-border rounded-lg shadow-lg text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
                        Updating results...
                    </div>
                )}
            </div>
        );
    };

    return (
        <PageErrorBoundary name="Calendar">
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
                onToggleFilters={() => eventData.setIsFilterPanelOpen(!eventData.isFilterPanelOpen)}
                isFilterPanelOpen={eventData.isFilterPanelOpen}
                activeFilterCount={eventData.activeFilterCount}
                calendarRef={calendarRef}
                isSidebarOpen={state.isSidebarOpen}
                onToggleSidebar={actions.toggleSidebar}
                onEventSelect={handleSelectEvent}
                onAddEvent={(_date, _hour) => {
                    // Handle add event - could open a modal or navigate to create event page
                    // Add event functionality handled
                }}
                events={eventData.enrichedEvents}
                categories={initialCategories}
                profile={profile}
                renderContent={(context) => (
                    <div className="flex h-full relative">
                        <div className="flex-1 relative">
                            {renderCalendarContent(context)}
                        </div>
                        {eventData.isFilterPanelOpen && (
                            <div 
                                className="fixed inset-0 z-40 bg-black bg-opacity-50"
                                onClick={() => eventData.setIsFilterPanelOpen(false)}
                            >
                                <div 
                                    className="absolute right-0 top-0 h-full w-80 transform transition-transform duration-300 ease-in-out"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <SmartFilterPanel 
                                        filters={{
                                            searchTerm: eventData.filters.searchTerm,
                                            categories: eventData.filters.categories,
                                            dateRange: eventData.filters.dateRange,
                                            format: eventData.filters.format,
                                            cost: eventData.filters.cost,
                                            difficulty: eventData.filters.difficulty,
                                            availability: eventData.filters.availability,
                                            popularity: eventData.filters.popularity,
                                            duration: eventData.filters.duration,
                                            sortBy: eventData.filters.sortBy,
                                            myTracked: eventData.filters.myTracked,
                                            myNetwork: eventData.filters.myNetwork,
                                            recommended: eventData.filters.recommended
                                        }} 
                                        onUpdateFilter={(key: string, value: unknown) => {
                                            // Handle pagination fields separately
                                            if (key === 'page' || key === 'pageSize') return;
                                            eventData.updateFilter(key as keyof typeof eventData.filters, value as never);
                                        }} 
                                        onResetFilters={eventData.resetFilters} 
                                        onApplyQuickFilter={eventData.applyQuickFilter} 
                                        activeFilterCount={eventData.activeFilterCount} 
                                        isOpen={eventData.isFilterPanelOpen} 
                                        onClose={() => eventData.setIsFilterPanelOpen(false)} 
                                    />
                                </div>
                            </div>
                        )}
                        {state.selectedEvent && (
                            <>
                                {isMobile ? (
                                    <MobileEventDetailPanelDynamic
                                        event={state.selectedEvent}
                                        onClose={actions.closeEventDetail}
                                        categories={initialCategories}
                                    />
                                ) : (
                                    <div 
                                        className="fixed inset-0 z-40"
                                        onClick={actions.closeEventDetail}
                                    >
                                        <div 
                                            className="fixed right-0 top-0 h-full w-full sm:w-[28rem] md:w-[40rem] lg:w-[48rem] xl:w-[56rem] max-w-[95vw] z-50 transform transition-transform duration-300 ease-in-out"
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
                            </>
                        )}
                    </div>
                )}
            />
        </CalendarProvider>
        </PageErrorBoundary>
    );
}