'use client';

// [FIX #1] Import 'React' to use React.cloneElement
import React, { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarSidebar from '@/components/calendar/CalendarSidebar';
import type { AppProfile, AppEventType } from '@/types';

// [FIX #2] Define the type for the props that will be added to the child component
interface InjectedChildProps {
    calendarRef?: React.RefObject<FullCalendar | null>;
}

export function CalendarLayout({
    profile,
    categories,
    children,
}: {
    profile: AppProfile | null;
    categories: AppEventType[];
    children: React.ReactNode;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const calendarRef = useRef<FullCalendar | null>(null);

    const dateParam = searchParams.get('date');
    const initialDate = dateParam && !isNaN(new Date(dateParam).getTime()) ? new Date(dateParam) : new Date();
    const [currentDate, setCurrentDate] = useState(initialDate);

    const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);

    const formatDateForURL = (date: Date) => date.toISOString().split('T')[0];

    const handleNavigate = useCallback((direction: 'prev' | 'next' | 'today') => {
        const view = searchParams.get('view') || 'month';
        let newDate = new Date(currentDate);

        if (direction === 'today') {
            newDate = new Date();
        } else {
            if (view === 'day') {
                newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
            } else {
                // For month/week, let FullCalendar handle it, then sync state
                const api = calendarRef.current?.getApi();
                if (!api) return;
                api[direction]();
                newDate = api.getDate();
            }
        }

        const dateStr = formatDateForURL(newDate);
        // Only push a new URL for day view or if the date actually changes
        // This avoids unnecessary re-renders for month/week view internal navigation
        if (view === 'day' || direction === 'today') {
            router.push(`/calendar?view=${view}&date=${dateStr}`);
        }
        setCurrentDate(newDate);

    }, [currentDate, router, searchParams]);

    return (
        <div className="flex h-screen bg-background-main text-foreground-primary font-sans">
            <CalendarSidebar
                currentDate={currentDate}
                setCurrentDate={() => { }}
                categories={categories}
                user={{ name: profile?.fullName || 'User', role: '' }}
                events={[]}
            />
            <main className="flex-1 flex flex-col">
                <CalendarHeader
                    currentDate={currentDate}
                    onNavigate={handleNavigate}
                    isFilterPanelOpen={isFilterPanelOpen}
                    onToggleFilters={() => setFilterPanelOpen(!isFilterPanelOpen)}
                    activeFilterCount={0}
                />
                <div className="flex-1 overflow-auto">

                    {React.isValidElement<InjectedChildProps>(children)
                        ? React.cloneElement(children, { calendarRef })
                        : children
                    }
                </div>
            </main>
        </div>
    );
}