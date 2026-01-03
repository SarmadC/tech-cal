// src/components/calendar/TechCalendarWeekView.tsx
'use client';

import React, { useMemo } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { WeekHeader } from './shared/WeekHeader';
import { AllDayEventsRow } from './shared/AllDayEventsRow';
import { TimeSlotGrid } from './shared/TimeSlotGrid';
import '@/app/styles/tech-week-view.css';
import '@/app/styles/event-card.css';
import {
    getWeekDays,
    generateWeekTimeSlots
} from '@/utils/eventViewUtils';
import { processEventsForWeekView } from '@/utils/multiDayEventUtils';

export interface TechCalendarWeekViewProps {
    events: MultiDayEvent[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: MultiDayEventInstance | Event) => void;
}

export default function TechCalendarWeekView({
    events,
    initialDate,
    categories: _categories,
    profile: _profile,
    onEventSelect,
}: TechCalendarWeekViewProps) {
    // Get week days
    const weekDays = useMemo(() => {
        return getWeekDays(initialDate);
    }, [initialDate]);

    // Define consistent start and end hours
    const START_HOUR = 5;
    const END_HOUR = 23;

    // Generate time slots
    const timeSlots = useMemo(() => {
        return generateWeekTimeSlots(START_HOUR, END_HOUR);
    }, []);

    // Split events into "Top Row" (Multi-day continuous) and "Grid" (Single day or specific overlapping instances)
    // The user wants "Multi-Day Events" like conferences to be at the top.
    const { topRowEvents, gridEventsInput } = useMemo(() => {
        if (!events) return { topRowEvents: [], gridEventsInput: [] };

        const topRow: MultiDayEvent[] = [];
        const grid: MultiDayEvent[] = [];

        events.forEach(event => {
            // Check if it's a multi-day event that spans more than 24 hours effectively
            // or is marked as isMultiDay.
            // Be careful: A daily recurring meeting (9am-10am every day) is technically "MultiDay" in our types
            // but should be shown in the grid.
            // "Conferences" usually don't have a `dailySchedule` of 9-5 type recurring, or if they do, the user explicitly asked to move them.
            // User said: "SnowCamp ... appear to be full-day or multi-day conferences ... blocking out specific hours".
            // Implementation Strategy:
            // if event.isMultiDay AND (no dailySchedule OR duration > 24h) -> Top Row?
            // Let's look at the type.

            // If it's a "daily_recurring" type, it typically belongs in the grid (like a standup).
            // BUT the user specifically complained about "SnowCamp" repeating daily.
            // Let's check the duration of the *instance*.
            // If the user wants a "continuous horizontal bar", that implies the event represents the WHOLE period.

            // Simplest Heuristic for "Conference":
            // If it's "isMultiDay" and the daily instances would overlap significantly or block view, move to top.
            // Let's try: If it's multi-day, move to top row. 
            // EXCEPT if it is a specific short duration recurring event?
            // Actually, `processEventsForWeekView` explodes them into daily instances. 
            // If I move them to top row, I skip that explosion.

            // Refined Heuristic:
            // Move to top if `isMultiDay` is true.
            // NOTE: If we move ALL multi-day events to top, we lose the specific time-blocking in the grid.
            // The user wanted "Free Up the Grid: This clears the hourly grid for actual specific sessions".
            // So yes, move the main blocking event to the top.

            if (event.isMultiDay) {
                topRow.push(event);
            } else {
                grid.push(event);
            }
        });

        return { topRowEvents: topRow, gridEventsInput: grid };
    }, [events]);

    // Process ONLY grid events for the hourly grid
    const processedGridEvents = useMemo(() => {
        return processEventsForWeekView(gridEventsInput);
    }, [gridEventsInput]);

    // Group processed events by day for the grid
    const eventsByDay = useMemo(() => {
        const grouped = new Map<number, (Event | MultiDayEventInstance)[]>();

        weekDays.forEach((day, dayIndex) => {
            const dayEvents = processedGridEvents.filter(event => {
                // For multi-day instances, match by instanceDate
                if ('isInstance' in event && event.isInstance) {
                    const instance = event as MultiDayEventInstance;
                    const [year, month, dayNum] = instance.instanceDate.split('-').map(Number);
                    const instanceDate = new Date(year, month - 1, dayNum);
                    return instanceDate.toDateString() === day.toDateString();
                }

                // For regular events, check if they occur on this day
                const eventStart = new Date((event as Event | MultiDayEventInstance).startTime);
                return eventStart.toDateString() === day.toDateString();
            });

            grouped.set(dayIndex, dayEvents);
        });

        return grouped;
    }, [processedGridEvents, weekDays]);

    // Event handlers
    const handleEventClick = (event: Event | MultiDayEventInstance) => {
        onEventSelect?.(event);
    };

    const handleEventHover = (event: Event | MultiDayEventInstance, mouseEvent: React.MouseEvent) => {
        // Hover handling will be managed by CSS/EventCard for expansion
    };

    const handleEventLeave = () => {
        // Leave handling will be managed by CSS/EventCard for expansion
    };

    return (
        <div className="tech-calendar-week-view flex-shrink-0 w-full">
            {/* Header with days */}
            <WeekHeader weekDays={weekDays} />

            {/* All Day / Multi-Day Events Row */}
            <React.Suspense fallback={null}>
                <AllDayEventsRow
                    weekDays={weekDays}
                    events={topRowEvents}
                    onEventClick={handleEventClick}
                />
            </React.Suspense>

            {/* Time slots grid with events */}
            <div className="flex-1">
                <TimeSlotGrid
                    timeSlots={timeSlots}
                    weekDays={weekDays}
                    eventsByDay={eventsByDay}
                    startHour={START_HOUR}
                    endHour={END_HOUR}
                    onEventClick={handleEventClick}
                    onEventHover={handleEventHover}
                    onEventLeave={handleEventLeave}
                />
            </div>
        </div>
    );
}