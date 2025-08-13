// src/app/calendar/CalendarLayout.tsx
import React, { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import type { AppProfile, AppEventType, AppEvent } from '@/types';

type CalendarViewType = 'month' | 'week' | 'day';

// Calendar context for passing data to children
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
    profile: AppProfile | null;
    categories: AppEventType[];
    events?: AppEvent[];
    currentDate?: Date;
    onDateChange?: (date: Date) => void;
    onNavigate?: (direction: 'prev' | 'next' | 'today') => void;
    onToggleFilters?: () => void;
    isFilterPanelOpen?: boolean;
    activeFilterCount?: number;
    calendarRef?: React.RefObject<FullCalendar | null>;
    renderContent?: (context: CalendarLayoutContext) => ReactNode;
}

export function CalendarLayout({
    children,
    profile,
    categories,
    events = [],
    currentDate,
    onDateChange,
    onNavigate,
    onToggleFilters,
    isFilterPanelOpen = false,
    activeFilterCount = 0,
    calendarRef,
    renderContent,
}: CalendarLayoutProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get current view from URL
    const view = (searchParams.get('view') as CalendarViewType) || 'month';

    // Get current date from URL or use provided date or default to today
    const dateParam = searchParams.get('date');
    const urlDate = dateParam ? new Date(dateParam) : null;
    const activeDate = currentDate || urlDate || new Date();

    const formatDateForURL = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

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

        // Get the new date from the calendar after navigation
        if (calendarRef?.current) {
            const calendarApi = calendarRef.current.getApi();
            const newDate = calendarApi.getDate();
            handleDateChange(newDate);
        }
    };

    const handleToggleFilters = () => {
        onToggleFilters?.();
    };

    // Create context object to pass to children or render prop
    const layoutContext: CalendarLayoutContext = {
        view,
        date: activeDate,
        onNavigate: handleNavigation,
        onViewChange: handleViewChange,
        onDateChange: handleDateChange,
        calendarRef,
    };

    // Use render prop if provided, otherwise use children
    const content = renderContent ? renderContent(layoutContext) : children;

    // If no sidebar data provided (like in Next.js layout), render simpler layout
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
        <div className="flex h-screen bg-background-main">
            {/* Sidebar */}
            <div className="w-80 border-r border-border-default bg-background-elevated">
                <CalendarSidebar
                    currentDate={activeDate}
                    setCurrentDate={handleDateChange}
                    categories={categories}
                    user={{
                        name: profile?.fullName || 'User',
                        role: 'Member'
                    }}
                    events={events}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <CalendarHeader
                    currentDate={activeDate}
                    onNavigate={handleNavigation}
                    onToggleFilters={handleToggleFilters}
                    isFilterPanelOpen={isFilterPanelOpen}
                    activeFilterCount={activeFilterCount}
                />

                {/* Calendar Content */}
                <div className="flex-1 overflow-hidden">
                    {content}
                </div>
            </div>
        </div>
    );
}