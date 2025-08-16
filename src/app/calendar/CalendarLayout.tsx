import React, { ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import type { AppProfile, AppEventType, AppEvent } from '@/types';

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
    monthlyEventCounts?: Map<string, Map<number, number>>;
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
    monthlyEventCounts,
}: CalendarLayoutProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const view = (searchParams.get('view') as CalendarViewType) || 'month';

    const dateParam = searchParams.get('date');

    // --- FIX IS HERE: THIS IS THE TIMEZONE-SAFE PARSING LOGIC ---
    const urlDate = dateParam ? (() => {
        // The 'T00:00:00' part is crucial. It tells the constructor to treat
        // the date as local time, not UTC. This avoids the "day behind" bug.
        const [year, month, day] = dateParam.split('-').map(Number);
        // We construct the date this way to ensure it's interpreted in the user's timezone.
        // new Date(year, month - 1, day) creates a date at midnight local time.
        return new Date(year, month - 1, day);
    })() : null;

    const activeDate = currentDate || urlDate || new Date();

    const formatDateForURL = (date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
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
        <div className="flex h-screen bg-background-main">
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
                    monthlyEventCounts={monthlyEventCounts}
                />
            </div>

            <div className="flex-1 flex flex-col">
                <CalendarHeader
                    currentDate={activeDate}
                    onNavigate={handleNavigation}
                    onToggleFilters={handleToggleFilters}
                    isFilterPanelOpen={isFilterPanelOpen}
                    activeFilterCount={activeFilterCount}
                />
                <div className="flex-1 overflow-hidden">
                    {content}
                </div>
            </div>
        </div>
    );
}