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

    // Calculate day difference using calendar dates, not timestamps
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

    switch (event.dailySchedule.type) {
        case 'daily_recurring':
            const dailyStart = event.dailySchedule.dailyStart || '09:00';
            const dailyEnd = event.dailySchedule.dailyEnd || '17:00';

            const instanceStart = new Date(viewDate);
            const [startHour, startMin] = dailyStart.split(':').map(Number);
            instanceStart.setHours(startHour, startMin, 0, 0);

            const instanceEnd = new Date(viewDate);
            const [endHour, endMin] = dailyEnd.split(':').map(Number);
            instanceEnd.setHours(endHour, endMin, 0, 0);

            instances.push({
                ...event,
                id: `${event.id}-${viewDateStr}`,
                startTime: instanceStart.toISOString(),
                endTime: instanceEnd.toISOString(),
                isInstance: true,
                originalEventId: event.id,
                instanceDate: viewDateStr,
                dayInfo
            });
            break;

        case 'all_day':
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
                const customStart = new Date(viewDate);
                const [customStartHour, customStartMin] = customSchedule.start.split(':').map(Number);
                customStart.setHours(customStartHour, customStartMin, 0, 0);

                const customEnd = new Date(viewDate);
                const [customEndHour, customEndMin] = customSchedule.end.split(':').map(Number);
                customEnd.setHours(customEndHour, customEndMin, 0, 0);

                instances.push({
                    ...event,
                    id: `${event.id}-${viewDateStr}`,
                    startTime: customStart.toISOString(),
                    endTime: customEnd.toISOString(),
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

// FIX: Replace `EnhancedAppEvent[]` with the new canonical type `MultiDayEvent[]`
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