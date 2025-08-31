// src/components/calendar/TechCalendarWeekView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import { WeekHeader } from './shared/WeekHeader';
import { TimeSlotGrid } from './shared/TimeSlotGrid';
import '@/app/styles/tech-week-view.css';
import '@/app/styles/event-card.css';
import {
    getWeekDays,
    generateWeekTimeSlots
} from '@/utils/eventViewUtils';
import { processEventsForWeekView } from '@/utils/multiDayEventUtils';

export interface TechCalendarWeekViewProps {
    events: (Event | MultiDayEvent)[];
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
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);

    // Get week days
    const weekDays = useMemo(() => {
        return getWeekDays(initialDate);
    }, [initialDate]);

    // Define consistent start and end hours
    const START_HOUR = 6;
    const END_HOUR = 23;

    // Generate time slots
    const timeSlots = useMemo(() => {
        return generateWeekTimeSlots(START_HOUR, END_HOUR);
    }, []);

    // Process events and generate proper instances for multi-day events
    const processedEvents = useMemo(() => {
        console.log('[TechCalendarWeekView] Processing events:', events.length, 'events total');

        // Use the new processing function that handles custom schedules
        // @ts-expect-error - Type compatibility issue with union types
        const processed = processEventsForWeekView(events);
        
        // Filter events to only show those within the current week
        const weekStart = new Date(weekDays[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekDays[6]);
        weekEnd.setHours(23, 59, 59, 999);

        const weekEvents = processed.filter(event => {
            const eventStart = new Date((event as Event | MultiDayEventInstance).startTime);
            return eventStart >= weekStart && eventStart <= weekEnd;
        });

        console.log('[TechCalendarWeekView] Final processed events:', weekEvents.length);
        return weekEvents;
    }, [events, weekDays]);

    // Group processed events by day for the grid
    const eventsByDay = useMemo(() => {
        console.log('[TechCalendarWeekView] Grouping processed events by day:', processedEvents.length, 'events');
        const grouped = new Map<number, (Event | MultiDayEventInstance)[]>();

        weekDays.forEach((day, dayIndex) => {
            const dayEvents = processedEvents.filter(event => {
                // For multi-day instances, match by instanceDate
                if ('isInstance' in event && event.isInstance) {
                    const instance = event as MultiDayEventInstance;
                    // Parse the instanceDate correctly (it's in YYYY-MM-DD format)
                    const [year, month, dayNum] = instance.instanceDate.split('-').map(Number);
                    const instanceDate = new Date(year, month - 1, dayNum);
                    const matches = instanceDate.toDateString() === day.toDateString();

                    if (matches) {
                        console.log(`[TechCalendarWeekView] Multi-day instance matched for day ${dayIndex}:`, {
                            instanceDate: instance.instanceDate,
                            dayString: day.toDateString(),
                            title: instance.title
                        });
                    }
                    return matches;
                }

                // For regular events, check if they occur on this day
                const eventStart = new Date((event as Event | MultiDayEventInstance).startTime);
                return eventStart.toDateString() === day.toDateString();
            });



            // @ts-expect-error - Type compatibility issue with union types
            grouped.set(dayIndex, dayEvents);
        });



        return grouped;
    }, [processedEvents, weekDays]);

    // Event handlers
    const handleEventClick = (event: Event | MultiDayEventInstance) => {
        setIsPreviewVisible(false);
        onEventSelect?.(event);
    };

    const handleEventHover = (event: Event | MultiDayEventInstance, mouseEvent: React.MouseEvent) => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            setHideTimer(null);
        }

        const rect = mouseEvent.currentTarget.getBoundingClientRect();
        setPreviewEvent(event);
        setPreviewPosition({ x: rect.right + 10, y: rect.top });
        setIsPreviewVisible(true);
    };

    const handleEventLeave = () => {
        const timer = setTimeout(() => {
            setIsPreviewVisible(false);
            setPreviewEvent(null);
        }, 300);
        setHideTimer(timer);
    };

    const handlePreviewHover = () => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            setHideTimer(null);
        }
    };

    const handlePreviewLeave = () => {
        setIsPreviewVisible(false);
        setPreviewEvent(null);
    };

    return (
        <div className="tech-calendar-week-view flex-shrink-0 w-full">
            {/* Header with days */}
            <WeekHeader weekDays={weekDays} />

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

            {/* Event Preview Card */}
            {previewEvent && (
                <EventPreviewCard
                    event={previewEvent}
                    isVisible={isPreviewVisible}
                    position={previewPosition}
                    onClose={handlePreviewLeave}
                    onHover={handlePreviewHover}
                    onLeave={handlePreviewLeave}
                />
            )}
        </div>
    );
}