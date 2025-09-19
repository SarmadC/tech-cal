// src/app/calendar/CalendarLayout.tsx

import React, { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import MobileBottomTabNavigation from '@/components/calendar/MobileBottomTabNavigation';
import MobileCalendarApp from '@/components/calendar/mobile/MobileCalendarApp';
import CalendarTransitionWrapper from '@/components/calendar/CalendarTransitionWrapper';
/* removed legacy calendar-sidebar.css */
import '@/app/styles/calendar-heatmap.css';
import '@/components/calendar/mobile/mobile-calendar.css';

// Removed unused type imports
import { formatDateForURL, parseDateFromURL } from '@/utils/dateUtils';
import { useCalendar } from '@/contexts';
import { Event, Json } from '@/types';

type CalendarViewType = 'month' | 'week' | 'day' | 'discover';

export interface CalendarLayoutContext {
    view: string;
    date: Date;
    onNavigate: (direction: 'prev' | 'next' | 'today') => void;
    onViewChange: (view: string) => void;
    onDateChange: (date: Date) => void;
    calendarRef?: React.RefObject<FullCalendar | null>;
}


export interface CalendarLayoutProps {
    children?: ReactNode;
    onNavigate?: (direction: 'prev' | 'next' | 'today') => void;
    onDateChange?: (date: Date) => void;
    onToggleFilters?: () => void;
    isFilterPanelOpen?: boolean;
    activeFilterCount?: number;
    calendarRef?: React.RefObject<FullCalendar | null>;
    renderContent?: (context: CalendarLayoutContext) => ReactNode;
    // Sidebar toggle props
    isSidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    // Mobile app props
    onEventSelect?: (event: Event) => void;
    onAddEvent?: (date?: Date, hour?: number) => void;
    // Data props for mobile app
    events?: Event[];
    categories?: Array<{ id: string; name: string; color: string; description: string | null }>;
    profile?: { id: string; fullName: string | null; avatarUrl: string | null; timezone: string | null; preferences: Json | null; createdAt: string | null; updatedAt: string | null } | null;
}

// Header wrapper that can safely use the Sidebar context (must be rendered under provider)
const HeaderWithSidebarToggle: React.FC<{
    currentDate: Date;
    onNavigate: (dir: 'prev' | 'next' | 'today') => void;
    onToggleFilters: () => void;
    isFilterPanelOpen: boolean;
    activeFilterCount: number;
    events?: Event[];
    fallbackToggle?: () => void;
    fallbackOpen?: boolean;
}> = ({ currentDate, onNavigate, onToggleFilters, isFilterPanelOpen, activeFilterCount, events, fallbackToggle: _fallbackToggle, fallbackOpen: _fallbackOpen }) => {
    const { open, toggle } = useSidebar();
    return (
        <CalendarHeader
            currentDate={currentDate}
            onNavigate={onNavigate}
            onToggleFilters={onToggleFilters}
            isFilterPanelOpen={isFilterPanelOpen}
            activeFilterCount={activeFilterCount}
            events={events}
            onToggleSidebar={toggle}
            isSidebarOpen={open}
        />
    );
};

// Main content wrapper that adjusts margin based on sidebar state
const MainContentWithSidebarOffset: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { open } = useSidebar();
    return (
        <div 
            className={`flex-1 flex flex-col transition-[margin] duration-200 ease-in-out ${
                open ? 'md:ml-64' : 'md:ml-16'
            } ml-0`}
        >
            {children}
        </div>
    );
};

export function CalendarLayout({
    children,
    onNavigate,
    onDateChange,
    onToggleFilters,
    isFilterPanelOpen = false,
    activeFilterCount = 0,
    calendarRef,
    renderContent,
    isSidebarOpen = false,
    onToggleSidebar,
    onEventSelect,
    onAddEvent: _onAddEvent,
    events = [],
    categories = [],
    profile = null,
}: CalendarLayoutProps) {
    // Get data from context for desktop, props for mobile
    const { currentDate } = useCalendar();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Check if we should use the new mobile views - use React state for client-side detection
    const [useNewMobileViews, setUseNewMobileViews] = React.useState(false);
    
    React.useEffect(() => {
        const checkMobile = () => {
            setUseNewMobileViews(window.innerWidth < 768);
        };
        
        // Check initially
        checkMobile();
        
        // Listen for resize events
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const view = (searchParams.get('view') as CalendarViewType) || 'discover';

    const dateParam = searchParams.get('date');

    const urlDate = dateParam ? parseDateFromURL(dateParam) : null;

    const initialActiveDate = currentDate || urlDate || new Date();
    const [localDate, setLocalDate] = React.useState<Date>(initialActiveDate);
    const containerRef = React.useRef<HTMLDivElement | null>(null);

    // Keep localDate in sync if URL/date context changes externally
    React.useEffect(() => {
        const nextDate = currentDate || urlDate || new Date();
        if (Math.abs(nextDate.getTime() - localDate.getTime()) > 1000 * 60) {
            setLocalDate(nextDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateParam, currentDate]);

    const handleViewChange = (newView: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', newView);
        params.set('date', formatDateForURL(localDate));
        router.push(`/calendar?${params.toString()}`, { scroll: false });
    };

    const handleDateChange = (newDate: Date) => {
        // Optimistically update local state for instant UI response
        setLocalDate(newDate);
        const params = new URLSearchParams(searchParams.toString());
        params.set('date', formatDateForURL(newDate));
        router.push(`/calendar?${params.toString()}`, { scroll: false });
        onDateChange?.(newDate);
    };

    const handleNavigation = (direction: 'prev' | 'next' | 'today') => {
        onNavigate?.(direction);

        if (calendarRef?.current) {
            const calendarApi = calendarRef.current.getApi();
            if (calendarApi) {
                // Perform the navigation on the calendar first
                if (direction === 'today') {
                    calendarApi.today();
                } else if (direction === 'prev') {
                    calendarApi.prev();
                } else if (direction === 'next') {
                    calendarApi.next();
                }
                // Read the new active date and sync URL/state
                const newDate = calendarApi.getDate();
                handleDateChange(newDate);
                return;
            }
        }
        // Fallback: compute date based on current view when FullCalendar API is not available
        if (direction === 'today') {
            handleDateChange(new Date());
            return;
        }

        const sign = direction === 'prev' ? -1 : 1;
        const newDate = new Date(localDate);
        if (view === 'day') {
            newDate.setDate(newDate.getDate() + sign);
        } else if (view === 'week') {
            newDate.setDate(newDate.getDate() + 7 * sign);
        } else {
            newDate.setMonth(newDate.getMonth() + sign);
        }
        handleDateChange(newDate);
    };

    const handleToggleFilters = () => {
        onToggleFilters?.();
    };


    const layoutContext: CalendarLayoutContext = {
        view,
        date: localDate,
        onNavigate: handleNavigation,
        onViewChange: handleViewChange,
        onDateChange: handleDateChange,
        calendarRef,
    };

    const content = renderContent ? renderContent(layoutContext) : children;

    // Ensure FullCalendar recalculates layout when container size changes (e.g., sidebar toggle)
    React.useEffect(() => {
        const updateCalendarSize = () => {
            try {
                const api = calendarRef?.current?.getApi?.();
                api?.updateSize();
            } catch {
                // no-op
            }
        };

        // Initial update after mount
        const timer = setTimeout(updateCalendarSize, 0);

        // Observe container size changes
        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
            resizeObserver = new ResizeObserver(() => updateCalendarSize());
            resizeObserver.observe(containerRef.current);
        }

        // Also update on window resize
        window.addEventListener('resize', updateCalendarSize);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateCalendarSize);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, [calendarRef]);

    // Handle loading states
    if (!profile && categories.length === 0) {
        return (
            <div className="flex h-screen calendar-page">
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-hidden">
                        {content}
                    </div>
                </div>
            </div>
        );
    }

    // Render new mobile app for mobile devices
    if (useNewMobileViews) {
        return (
            <div className="flex h-screen calendar-page">
                <MobileCalendarApp
                    events={events || []}
                    currentDate={localDate}
                    categories={categories}
                    profile={profile}
                    trackedEvents={[]} // Will be passed from parent with enriched events
                    onEventSelect={onEventSelect}
                    onEventTrack={async (_event) => {
                        // This should be handled by parent component
                        console.warn('Event tracking should be handled by parent');
                    }}
                    onDateChange={handleDateChange}
                />
            </div>
        );
    }

    return (
        <SidebarProvider>
        <div className="flex h-screen calendar-page">
            {/* Legacy overlay sidebar removed in favor of AppSidebar */}

            <AppSidebar />
            <MainContentWithSidebarOffset>
                {/* Desktop Header */}
                <div className="hidden md:block">
                    <HeaderWithSidebarToggle
                        currentDate={localDate}
                        onNavigate={handleNavigation}
                        onToggleFilters={handleToggleFilters}
                        isFilterPanelOpen={isFilterPanelOpen}
                        activeFilterCount={activeFilterCount}
                        events={events}
                        fallbackToggle={onToggleSidebar}
                        fallbackOpen={isSidebarOpen}
                    />
                </div>

                {/* Mobile Navigation - Bottom Tab Style - Only show when NOT using new mobile views */}
                {!useNewMobileViews && (
                <div className="md:hidden">
                    <MobileBottomTabNavigation
                        currentView={view === 'discover' ? 'month' : view as 'month' | 'week' | 'day'}
                        onViewChange={handleViewChange}
                        onToggleSidebar={onToggleSidebar || (() => {})}
                        onToggleFilters={handleToggleFilters}
                        onDateChange={handleDateChange}
                        activeFilterCount={activeFilterCount}
                        isSidebarOpen={isSidebarOpen}
                        currentDate={localDate}
                        filters={{
                            searchTerm: '',
                            format: 'all',
                            cost: 'all',
                            difficulty: 'all',
                            myTracked: false,
                            myNetwork: false,
                            recommended: false,
                            categories: [],
                            dateRange: { start: null, end: null },
                            availability: 'all',
                            popularity: 'all',
                            duration: 'all'
                        }}
                        onUpdateFilter={(_key, _value) => {
                            // TODO: Implement filter updates for mobile
                            // Mobile filter update handled
                        }}
                        onResetFilters={() => {
                            // TODO: Implement filter reset for mobile
                            // Mobile filter reset handled
                        }}
                        onApplyQuickFilter={(_filterType) => {
                            // TODO: Implement quick filter application for mobile
                            // Mobile quick filter handled
                        }}
                        searchSuggestions={[]}
                        onSearchSuggestionSelect={() => {}}
                    />
                </div>
                )}

                <div ref={containerRef} className="flex-1 flex flex-col calendar-content-with-bottom-tabs">
                    <CalendarTransitionWrapper view={view} date={localDate}>
                        {content}
                    </CalendarTransitionWrapper>
                </div>
            </MainContentWithSidebarOffset>
        </div>
        </SidebarProvider>
    );
}