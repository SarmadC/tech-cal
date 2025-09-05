'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { Event, EventType, AppProfile } from '@/types';

// Calendar Context Types
interface CalendarContextValue {
    // State
    selectedDate: Date | null;
    currentDate: Date;
    events: Event[];
    categories: EventType[];
    profile: AppProfile | null;
    
    // Actions
    selectDate: (date: Date) => void;
    selectEvent: (event: Event) => void;
    closeEventDetail: () => void;
}

// Create the context
const CalendarContext = createContext<CalendarContextValue | undefined>(undefined);

// Provider Props
interface CalendarProviderProps {
    children: ReactNode;
    selectedDate: Date | null;
    currentDate: Date;
    events: Event[];
    categories: EventType[];
    profile: AppProfile | null;
    onDateSelect: (date: Date) => void;
    onEventSelect: (event: Event) => void;
    onCloseEventDetail: () => void;
}

// Provider Component
export function CalendarProvider({
    children,
    selectedDate,
    currentDate,
    events,
    categories,
    profile,
    onDateSelect,
    onEventSelect,
    onCloseEventDetail,
}: CalendarProviderProps) {
    // Split stable data from frequently changing data
    const stableData = useMemo(() => ({
        events,
        categories,
        profile,
    }), [events, categories, profile]);
    
    const stableActions = useMemo(() => ({
        selectDate: onDateSelect,
        selectEvent: onEventSelect,
        closeEventDetail: onCloseEventDetail,
    }), [onDateSelect, onEventSelect, onCloseEventDetail]);
    
    const value = useMemo(() => ({
        ...stableData,
        ...stableActions,
        selectedDate,
        currentDate,
    }), [
        stableData,
        stableActions,
        selectedDate,
        currentDate,
    ]);

    return (
        <CalendarContext.Provider value={value}>
            {children}
        </CalendarContext.Provider>
    );
}

// Custom hook to use the calendar context
export function useCalendar() {
    const context = useContext(CalendarContext);
    if (context === undefined) {
        throw new Error('useCalendar must be used within a CalendarProvider');
    }
    return context;
}

// Optional: Hook for specific calendar data
export function useCalendarData() {
    const { events, categories, profile } = useCalendar();
    return { events, categories, profile };
}

// Optional: Hook for calendar actions
export function useCalendarActions() {
    const { selectDate, selectEvent, closeEventDetail } = useCalendar();
    return { selectDate, selectEvent, closeEventDetail };
}

// Optional: Hook for calendar state
export function useCalendarState() {
    const { selectedDate, currentDate } = useCalendar();
    return { selectedDate, currentDate };
}
