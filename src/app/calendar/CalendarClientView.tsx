'use client';

import { useMemo, useCallback, useRef, useReducer, useEffect, startTransition } from 'react';
import { EventClickArg, FullCalendar } from '@/types/fullcalendar';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useResizeListener } from '@/hooks/useEventListener';

import { formatDateForURL } from '@/utils/dateUtils';
import { CalendarLayout, type CalendarLayoutContext } from './CalendarLayout';
import { PageErrorBoundary } from '@/components/common/ErrorBoundary';
import DiscoverySidebar from '@/components/discovery/DiscoverySidebar';
import AdaptiveCalendarRenderer from '@/components/calendar/adaptive/AdaptiveCalendarRenderer';

import { useUnifiedServerFiltering, type UnifiedFilterOptions } from '@/hooks/useUnifiedServerFiltering';
import { useNetworkEventCounts } from '@/hooks/useNetworkEventCounts';

import { Event, EventType, AppProfile, TrackedEvent, MultiDayEvent } from '@/types';
import { CalendarProvider, useAuth } from '@/contexts';
import { useIsMobile } from '@/hooks/useDeviceDetection';
import { isMobileViewportWidth } from '@/constants/responsive';

const DEFAULT_REGION_FILTER_SESSION_KEY = 'calendar-default-region-filter:v1';

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
    'America/New_York': 'United States',
    'America/Chicago': 'United States',
    'America/Denver': 'United States',
    'America/Los_Angeles': 'United States',
    'America/Phoenix': 'United States',
    'America/Anchorage': 'United States',
    'Pacific/Honolulu': 'United States',
    'America/Toronto': 'Canada',
    'America/Vancouver': 'Canada',
    'America/Montreal': 'Canada',
    'America/Edmonton': 'Canada',
    'Europe/London': 'United Kingdom',
    'Europe/Dublin': 'Ireland',
    'Europe/Paris': 'France',
    'Europe/Berlin': 'Germany',
    'Europe/Amsterdam': 'Netherlands',
    'Asia/Tokyo': 'Japan',
    'Asia/Seoul': 'South Korea',
    'Asia/Singapore': 'Singapore',
    'Asia/Hong_Kong': 'Hong Kong',
    'Asia/Shanghai': 'China',
    'Asia/Kolkata': 'India',
    'Australia/Sydney': 'Australia',
    'Australia/Melbourne': 'Australia'
};

function getProfileCountry(preferencesValue: AppProfile['preferences']): string | null {
    if (!preferencesValue || typeof preferencesValue !== 'object' || Array.isArray(preferencesValue)) {
        return null;
    }

    const preferences = preferencesValue as Record<string, unknown>;
    const location = preferences.location;
    if (!location || typeof location !== 'object' || Array.isArray(location)) {
        return null;
    }

    const country = (location as Record<string, unknown>).country;
    return typeof country === 'string' && country.trim().length > 0 ? country.trim() : null;
}

function getCountryFromTimezone(timezone: string | null | undefined): string | null {
    if (!timezone) {
        return null;
    }

    return TIMEZONE_TO_COUNTRY[timezone] ?? null;
}

function getDefaultRegionalLocation(
    preferencesValue: AppProfile['preferences'],
    timezoneValue: AppProfile['timezone']
): string | null {
    const profileCountry = getProfileCountry(preferencesValue);
    if (profileCountry) {
        return profileCountry;
    }

    const timezoneCountry = getCountryFromTimezone(timezoneValue);
    if (timezoneCountry) {
        return timezoneCountry;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    return getCountryFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

function normalizeLocationLabel(value: string): string {
    const trimmed = value.trim();
    const normalized = trimmed.toLowerCase();

    if (normalized === 'usa' || normalized === 'us' || normalized === 'america') {
        return 'United States';
    }

    if (normalized === 'uk' || normalized === 'britain' || normalized === 'england') {
        return 'United Kingdom';
    }

    if (normalized === 'uae') {
        return 'United Arab Emirates';
    }

    return trimmed;
}

function deriveCalendarLocationOptions(events: Event[]): Array<{ value: string; count: number }> {
    const counts = new Map<string, number>();

    events.forEach((event) => {
        const rawLocation = event.location?.trim();
        if (!rawLocation || rawLocation.toLowerCase() === 'online') {
            return;
        }

        const parts = rawLocation.split(',').map((part) => part.trim()).filter(Boolean);
        const candidate = parts.length > 1 ? parts[parts.length - 1] : rawLocation;
        const label = normalizeLocationLabel(candidate);

        counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return Array.from(counts.entries())
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        })
        .slice(0, 8)
        .map(([value, count]) => ({ value, count }));
}

// Shared Desktop Sidebar
const EventDetailSidebarDynamic = dynamic(
    () => import('@/components/calendar/EventDetailSidebar'),
    { ssr: false }
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

        const isMobile = isMobileViewportWidth(window.innerWidth);

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
function useEventData(profile: AppProfile | null, initialFilters: Partial<Record<string, unknown>>) {
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
        refetch,
        counts
    } = useUnifiedServerFiltering(
        profile,
        initialFilters as Partial<UnifiedFilterOptions>,
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
        refetch,
        counts
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

        const filtered = enrichedEvents
            .filter((trackedEvent: TrackedEvent) => {
                // TrackedEvent is EventWithTracking, so properties are spread directly
                const eventStart = new Date(trackedEvent.startTime);
                const eventEnd = trackedEvent.endTime ? new Date(trackedEvent.endTime) : eventStart;
                return eventStart <= dayEnd && eventEnd >= dayStart;
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
    initialFilters?: Partial<Record<string, unknown>>;
}

export default function CalendarClientView({
    initialEvents: _initialEvents, // No longer needed with server-side filtering
    initialCategories,
    profile,
    initialFilters = {},
}: CalendarClientViewProps) {
    const calendarRef = useRef<FullCalendar | null>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const isMobile = useIsMobile();
    const { profile: authProfile } = useAuth();
    const activeProfile = authProfile ?? profile;
    const defaultRegionalLocation = useMemo(
        () => getDefaultRegionalLocation(activeProfile?.preferences ?? null, activeProfile?.timezone ?? null),
        [activeProfile?.preferences, activeProfile?.timezone]
    );

    // Use custom hooks for simplified state management
    const { state, actions } = useCalendarUIState();
    const eventData = useEventData(activeProfile, initialFilters);
    const activeLocationCount = eventData.filters.locations.length;
    const updateEventFilter = eventData.updateFilter;
    const { countsByEventId } = useNetworkEventCounts(eventData.enrichedEvents.map((event) => event.id));

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const hasSeededRegionFilter = window.sessionStorage.getItem(DEFAULT_REGION_FILTER_SESSION_KEY) === '1';
        if (hasSeededRegionFilter) {
            return;
        }

        if (searchParams.get('locations')) {
            window.sessionStorage.setItem(DEFAULT_REGION_FILTER_SESSION_KEY, '1');
            return;
        }

        if (activeLocationCount > 0) {
            window.sessionStorage.setItem(DEFAULT_REGION_FILTER_SESSION_KEY, '1');
            return;
        }

        if (!defaultRegionalLocation) {
            return;
        }

        window.sessionStorage.setItem(DEFAULT_REGION_FILTER_SESSION_KEY, '1');
        startTransition(() => {
            updateEventFilter('locations', [defaultRegionalLocation]);
        });
    }, [activeLocationCount, defaultRegionalLocation, searchParams, updateEventFilter]);

    const enrichedEventsWithNetwork = useMemo(() => {
        if (Object.keys(countsByEventId).length === 0) {
            return eventData.enrichedEvents;
        }

        return eventData.enrichedEvents.map((event) => {
            const networkCounts = countsByEventId[event.id];
            if (!networkCounts) {
                return event;
            }

            const existingSampleAvatars = event.networkSampleAvatars ?? [];
            const sampleAvatarsUnchanged =
                existingSampleAvatars.length === networkCounts.sampleAvatars.length &&
                existingSampleAvatars.every((avatar, index) => avatar === networkCounts.sampleAvatars[index]);

            if (
                networkCounts.networkCount === (event.networkAttendingCount ?? 0) &&
                sampleAvatarsUnchanged
            ) {
                return event;
            }

            return {
                ...event,
                networkAttendingCount: networkCounts.networkCount,
                networkSampleAvatars: networkCounts.sampleAvatars,
            };
        });
    }, [eventData.enrichedEvents, countsByEventId]);
    const calendarLocationOptions = useMemo(
        () => deriveCalendarLocationOptions(enrichedEventsWithNetwork),
        [enrichedEventsWithNetwork]
    );

    const { dayEvents, weekEvents } = useViewEvents(enrichedEventsWithNetwork, searchParams);

    // Get current date from URL params
    const currentDate = useMemo(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const [year, month, day] = dateParam.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date();
    }, [searchParams]);

    // Derive stable primitive keys from array filters to avoid object referential instability
    // causing the sync effect to re-run on every render.
    const filterCategoriesKey = eventData.filters.categories?.join(',') ?? '';
    const filterTagsKey = eventData.filters.tags?.join(',') ?? '';
    const filterLocationsKey = eventData.filters.locations?.join(',') ?? '';
    const filterFormat = eventData.filters.format;
    const filterCost = eventData.filters.cost;
    const filterDifficulty = eventData.filters.difficulty;
    const filterBudget = eventData.filters.budget;

    // Sync filters to URL when they change
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());

        const updateArrayParam = (key: string, values: string[] | undefined) => {
            if (values && values.length > 0) params.set(key, values.join(','));
            else params.delete(key);
        };

        updateArrayParam('categories', filterCategoriesKey ? filterCategoriesKey.split(',') : []);
        updateArrayParam('tags', filterTagsKey ? filterTagsKey.split(',') : []);
        updateArrayParam('locations', filterLocationsKey ? filterLocationsKey.split(',') : []);

        if (filterFormat && filterFormat !== 'all') params.set('format', filterFormat);
        else params.delete('format');

        if (filterCost && filterCost !== 'all') params.set('cost', filterCost);
        else params.delete('cost');

        if (filterDifficulty && filterDifficulty !== 'all') params.set('difficulty', filterDifficulty);
        else params.delete('difficulty');

        if (filterBudget && filterBudget !== 'all') params.set('budget', filterBudget);
        else params.delete('budget');

        // Only update if the URL actually changed to prevent infinite loops
        const newQuery = params.toString();
        const currentQuery = searchParams.toString();

        if (newQuery !== currentQuery) {
            router.replace(`/calendar?${newQuery}`, { scroll: false });
        }
    }, [filterCategoriesKey, filterTagsKey, filterLocationsKey, filterFormat, filterCost, filterDifficulty, filterBudget, router, searchParams]);    // Event handlers using simplified state management
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
                    events={enrichedEventsWithNetwork}
                    weekEvents={weekEvents}
                    dayEvents={dayEvents}
                    initialDate={context.date}
                    categories={initialCategories}
                    profile={activeProfile}
                    trackedEvents={enrichedEventsWithNetwork.filter(e => e.isTracked)}
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
            <main className="min-h-screen">
                <CalendarProvider
                    selectedDate={state.selectedDate}
                    currentDate={currentDate}
                    events={enrichedEventsWithNetwork}
                    categories={initialCategories}
                    profile={activeProfile}
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
                        events={enrichedEventsWithNetwork}
                        categories={initialCategories}
                        profile={activeProfile}
                        renderContent={(context) => (
                            <div className="flex h-full relative">
                                <h1 className="sr-only">Tech events calendar</h1>
                                <div className="flex-1 relative">
                                    {renderCalendarContent(context)}
                                </div>
                                {eventData.isFilterPanelOpen && (
                                    <div
                                        className="fixed inset-0 z-40 bg-black bg-opacity-50"
                                        onClick={() => eventData.setIsFilterPanelOpen(false)}
                                    >
                                        <div
                                            className="fixed right-0 top-0 h-full w-80 bg-background-elevated border-l border-border-default shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col pt-20 pb-4 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="px-4 pb-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-semibold text-foreground-primary">Filters</h3>
                                                    <button
                                                        onClick={eventData.resetFilters}
                                                        className="text-xs text-accent-primary hover:underline"
                                                    >
                                                        Reset all
                                                    </button>
                                                </div>
                                                <DiscoverySidebar
                                                    filters={{
                                                        format: eventData.filters.format,
                                                        cost: eventData.filters.cost,
                                                        categories: eventData.filters.categories,
                                                        tags: eventData.filters.tags,
                                                        locations: eventData.filters.locations
                                                    }}
                                                    onUpdateFilter={eventData.updateFilter}
                                                    categories={initialCategories}
                                                    locationOptions={calendarLocationOptions}
                                                    events={enrichedEventsWithNetwork}
                                                    counts={eventData.counts || {}}
                                                    mobileMode={true}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {state.selectedEvent && !isMobile && (
                                    <EventDetailSidebarDynamic
                                        event={state.selectedEvent}
                                        onClose={actions.closeEventDetail}
                                        categories={initialCategories}
                                    />
                                )}
                            </div>
                        )}
                    />
                </CalendarProvider>
            </main>
        </PageErrorBoundary>
    );
}
