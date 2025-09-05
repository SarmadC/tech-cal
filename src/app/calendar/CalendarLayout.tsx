// src/app/calendar/CalendarLayout.tsx

import React, { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import MobileCalendarNavigation from '@/components/calendar/MobileCalendarNavigation';
import '@/app/styles/calendar-sidebar.css';

// Removed unused type imports
import { formatDateForURL, parseDateFromURL } from '@/utils/dateUtils';
import { useCalendar } from '@/contexts';

type CalendarViewType = 'month' | 'week' | 'day';

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
}

export function CalendarLayout({
    children,
    onNavigate,
    onDateChange,
    onToggleFilters,
    isFilterPanelOpen = false,
    activeFilterCount = 0,
    calendarRef,
    renderContent,
    isSidebarOpen = true,
    onToggleSidebar,
}: CalendarLayoutProps) {
    // Get data from context instead of props
    const { currentDate, profile, categories } = useCalendar();
    const router = useRouter();
    const searchParams = useSearchParams();

    const view = (searchParams.get('view') as CalendarViewType) || 'month';

    const dateParam = searchParams.get('date');

    const urlDate = dateParam ? parseDateFromURL(dateParam) : null;

    const activeDate = currentDate || urlDate || new Date();

    const handleViewChange = (newView: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', newView);
        params.set('date', formatDateForURL(activeDate));
        router.push(`/calendar?${params.toString()}`, { scroll: false });
    };

    const handleDateChange = (newDate: Date) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('date', formatDateForURL(newDate));
        router.push(`/calendar?${params.toString()}`, { scroll: false });
        onDateChange?.(newDate);
    };

    const handleNavigation = (direction: 'prev' | 'next' | 'today') => {
        onNavigate?.(direction);

        if (calendarRef?.current) {
            const calendarApi = calendarRef.current.getApi();
            const newDate = calendarApi.getDate();
            handleDateChange(newDate);
        }
    };

    const handleToggleFilters = () => {
        onToggleFilters?.();
    };


    const layoutContext: CalendarLayoutContext = {
        view,
        date: activeDate,
        onNavigate: handleNavigation,
        onViewChange: handleViewChange,
        onDateChange: handleDateChange,
        calendarRef,
    };

    const content = renderContent ? renderContent(layoutContext) : children;

    if (!profile && categories.length === 0) {
        return (
            <div className="flex h-screen bg-background-main">
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-hidden">
                        {content}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background-main overflow-hidden">
            {/* Sidebar - Different behavior for mobile vs desktop */}
            {isSidebarOpen && (
                <>
                    {/* Mobile overlay - only on mobile */}
                    <div 
                        className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
                        onClick={onToggleSidebar}
                    />
                    
                    {/* Sidebar */}
                    <div className={`calendar-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                        <CalendarSidebar
                            onClose={onToggleSidebar}
                        />
                    </div>
                </>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Desktop Header */}
                <div className="hidden md:block">
                    <CalendarHeader
                        currentDate={activeDate}
                        onNavigate={handleNavigation}
                        onToggleFilters={handleToggleFilters}
                        isFilterPanelOpen={isFilterPanelOpen}
                        activeFilterCount={activeFilterCount}
                        onToggleSidebar={onToggleSidebar || (() => {})}
                        isSidebarOpen={isSidebarOpen}
                    />
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden">
                    <MobileCalendarNavigation
                        currentView={view}
                        onViewChange={handleViewChange}
                        onToggleSidebar={onToggleSidebar || (() => {})}
                        onToggleFilters={handleToggleFilters}
                        activeFilterCount={activeFilterCount}
                        isSidebarOpen={isSidebarOpen}
                    />
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {content}
                </div>
            </div>
        </div>
    );
}