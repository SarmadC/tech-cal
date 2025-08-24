// src/utils/multiDayEventUtils.ts

import type { MultiDayEvent, Event } from '@/types';

export interface MultiDayEventInstance extends Event {
    isInstance: boolean;
    originalEventId: string;
    instanceDate: string;
    dayInfo?: {
        currentDay: number;
        totalDays: number;
        isFirstDay: boolean;
        isLastDay: boolean;
        continuationType: 'start' | 'middle' | 'end' | 'single';
    };
}

/**
 * Generates specific daily instances for a given multi-day event on a specific view date.
 * This is the core logic that powers the day and week views.
 * @param event The multi-day event object from the database.
 * @param viewDate The specific day the user is looking at in the calendar.
 * @returns An array of event instances for that day (usually just one, but allows for flexibility).
 */
export function generateDailyEventInstances(
    event: MultiDayEvent,
    viewDate: Date
): MultiDayEventInstance[] {

    // --- Entry Guard ---
    // If the event is not marked as multi-day or lacks a schedule, treat it as a single event.
    // This ensures regular, single-day events are handled correctly.
    if (!event.isMultiDay || !event.dailySchedule) {
        // We only return it if it actually occurs on the viewDate.
        const eventDate = new Date(event.startTime);
        if (eventDate.toDateString() === viewDate.toDateString()) {
            return [{
                ...event,
                isInstance: false,
                originalEventId: event.id,
                instanceDate: event.startTime.split('T')[0],
                dayInfo: { currentDay: 1, totalDays: 1, isFirstDay: true, isLastDay: true, continuationType: 'single' }
            }];
        }
        return [];
    }

    const startDate = new Date(event.startTime);
    const endDate = event.endTime ? new Date(event.endTime) : startDate;

    // --- Robust Date Comparison ---
    // Use Date.UTC to compare dates without being affected by local timezones.
    const viewDateOnly = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), viewDate.getUTCDate()));
    const startDateOnly = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endDateOnly = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    // If the view date is outside the event's overall range, it has no instance on this day.
    if (viewDateOnly < startDateOnly || viewDateOnly > endDateOnly) {
        return [];
    }

    // --- Day Information Calculation ---
    const totalDays = Math.ceil((endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysDiff = Math.floor((viewDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.max(1, daysDiff + 1);

    const isFirstDay = viewDateOnly.getTime() === startDateOnly.getTime();
    const isLastDay = viewDateOnly.getTime() === endDateOnly.getTime();
    let continuationType: 'start' | 'middle' | 'end' | 'single' = 'middle';
    if (totalDays <= 1) { continuationType = 'single'; }
    else if (isFirstDay) { continuationType = 'start'; }
    else if (isLastDay) { continuationType = 'end'; }

    const dayInfo = { currentDay, totalDays, isFirstDay, isLastDay, continuationType };

    const instances: MultiDayEventInstance[] = [];
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const day = String(viewDate.getDate()).padStart(2, '0');
    const viewDateStr = `${year}-${month}-${day}`;

    // --- Instance Generation from dailySchedule (The Core Fix) ---
    switch (event.dailySchedule.type) {
        case 'daily_recurring':
            // Prioritize the daily schedule for start and end times.
            const dailyStart = event.dailySchedule.dailyStart || '09:00';
            const dailyEnd = event.dailySchedule.dailyEnd || '17:00';

            // Construct local time strings (without 'Z') so the browser displays them as "wall clock" time.
            const instanceStartTimeStr = `${year}-${month}-${day}T${dailyStart}:00`;
            const instanceEndTimeStr = `${year}-${month}-${day}T${dailyEnd}:00`;

            instances.push({
                ...event,
                id: `${event.id}-${viewDateStr}`,
                startTime: instanceStartTimeStr,
                endTime: instanceEndTimeStr,
                isInstance: true,
                originalEventId: event.id,
                instanceDate: viewDateStr,
                dayInfo
            });
            break;

        // Note: 'all_day' and 'custom' cases can be added here following the same pattern if needed.
    }

    return instances;
}

/**
 * Processes a list of events, generating daily instances for any multi-day events
 * that fall on the specified view date.
 * @param events An array of events, which can be single or multi-day.
 * @param viewDate The date for which to generate event instances.
 * @returns A flattened array of all event instances for the given day.
 */
export function processEventsForDayView(
    events: MultiDayEvent[],
    viewDate: Date
): MultiDayEventInstance[] {
    // Use flatMap to elegantly process all events and flatten the resulting instances into a single array.
    return events.flatMap(event => generateDailyEventInstances(event, viewDate));
}