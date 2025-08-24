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

export function generateDailyEventInstances(
    event: MultiDayEvent,
    viewDate: Date
): MultiDayEventInstance[] {

    if (!event.isMultiDay || !event.dailySchedule) {
        return [{
            ...event,
            isInstance: false,
            originalEventId: event.id,
            instanceDate: '',
            dayInfo: {
                currentDay: 1,
                totalDays: 1,
                isFirstDay: true,
                isLastDay: true,
                continuationType: 'single'
            }
        }];
    }

    const startDate = new Date(event.startTime);
    const endDate = event.endTime ? new Date(event.endTime) : new Date(startDate);

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const viewDateStr = viewDate.toISOString().split('T')[0];
    const eventStartDateStr = startDate.toISOString().split('T')[0];
    const eventEndDateStr = endDate.toISOString().split('T')[0];

    if (viewDateStr < eventStartDateStr || viewDateStr > eventEndDateStr) {
        return [];
    }

    const viewDateOnly = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const daysDiff = Math.floor((viewDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.max(1, daysDiff + 1);


    const isFirstDay = viewDateStr === eventStartDateStr;
    const isLastDay = viewDateStr === eventEndDateStr;
    let continuationType: 'start' | 'middle' | 'end' | 'single' = 'middle';

    if (totalDays === 1) {
        continuationType = 'single';
    } else if (isFirstDay) {
        continuationType = 'start';
    } else if (isLastDay) {
        continuationType = 'end';
    }

    const dayInfo = {
        currentDay,
        totalDays,
        isFirstDay,
        isLastDay,
        continuationType
    };

    const instances: MultiDayEventInstance[] = [];

    // Get date parts from the viewDate to construct local time strings
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const day = String(viewDate.getDate()).padStart(2, '0');

    switch (event.dailySchedule.type) {
        case 'daily_recurring':
            const dailyStart = event.dailySchedule.dailyStart || '09:00';
            const dailyEnd = event.dailySchedule.dailyEnd || '17:00';

            // --- FIX: Construct local ISO strings (without 'Z') ---
            // This ensures the browser interprets the time in the user's local timezone.
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

        case 'all_day':
            // This logic is correct for all-day events as it should span the user's full day.
            const allDayStart = new Date(viewDate);
            allDayStart.setHours(0, 0, 0, 0);
            const allDayEnd = new Date(viewDate);
            allDayEnd.setHours(23, 59, 59, 999);

            instances.push({
                ...event,
                id: `${event.id}-${viewDateStr}`,
                startTime: allDayStart.toISOString(),
                endTime: allDayEnd.toISOString(),
                isInstance: true,
                originalEventId: event.id,
                instanceDate: viewDateStr,
                dayInfo
            });
            break;

        case 'custom':
            const customSchedule = event.dailySchedule.schedule?.find(
                schedule => schedule.date === viewDateStr
            );

            if (customSchedule) {
                // --- FIX: Construct local ISO strings for custom schedules ---
                const customStartTimeStr = `${year}-${month}-${day}T${customSchedule.start}:00`;
                const customEndTimeStr = `${year}-${month}-${day}T${customSchedule.end}:00`;

                instances.push({
                    ...event,
                    id: `${event.id}-${viewDateStr}`,
                    startTime: customStartTimeStr,
                    endTime: customEndTimeStr,
                    isInstance: true,
                    originalEventId: event.id,
                    instanceDate: viewDateStr,
                    dayInfo
                });
            }
            break;
    }

    return instances;
}

export function processEventsForDayView(
    events: MultiDayEvent[],
    viewDate: Date
): MultiDayEventInstance[] {
    const processedEvents: MultiDayEventInstance[] = [];

    events.forEach(event => {
        const instances = generateDailyEventInstances(event, viewDate);
        processedEvents.push(...instances);
    });

    return processedEvents;
}