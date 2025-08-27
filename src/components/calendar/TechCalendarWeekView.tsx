// src/components/calendar/TechCalendarWeekView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import { WeekHeader } from './shared/WeekHeader';
import { TimeSlotGrid } from './shared/TimeSlotGrid';
import '@/app/styles/tech-week-view.css';
import {
    getWeekDays,
    generateWeekTimeSlots
} from '@/utils/eventViewUtils';
import { processEventsForDayView } from '@/utils/multiDayEventUtils';

export interface TechCalendarWeekViewProps {
    events: Event[] | MultiDayEvent[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
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
        
        const allProcessedEvents: (Event | MultiDayEventInstance)[] = [];

        // Debug: Check what types of events we have
        const multiDayEvents = (events as MultiDayEvent[]).filter(event => event.isMultiDay && event.dailySchedule);
        console.log('[TechCalendarWeekView] Multi-day events found:', multiDayEvents.length);
        multiDayEvents.forEach(event => {
            console.log('[TechCalendarWeekView] Multi-day event:', {
                id: event.id,
                title: event.title,
                startTime: event.startTime,
                endTime: event.endTime,
                isMultiDay: event.isMultiDay,
                dailySchedule: event.dailySchedule
            });
        });

        // For each day in the week, process multi-day events
        weekDays.forEach(day => {
            console.log('[TechCalendarWeekView] Processing day:', day.toDateString());
            // Process events for this specific day (handles multi-day event instances)
            const dayInstances = processEventsForDayView(events as MultiDayEvent[], day);
            console.log('[TechCalendarWeekView] Generated instances for', day.toDateString(), ':', dayInstances.length);

            // Add all instances to our collection
            allProcessedEvents.push(...dayInstances);
        });

        // Also add single-day events that aren't multi-day
        const singleDayEvents = (events as MultiDayEvent[]).filter(event => {
            // Skip if it's a multi-day event (will be handled by processEventsForDayView)
            if (event.isMultiDay && event.dailySchedule) {
                return false;
            }

            // Include single-day events that fall within this week
            const eventStart = new Date(event.startTime);
            const weekStart = new Date(weekDays[0]);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekDays[6]);
            weekEnd.setHours(23, 59, 59, 999);

            return eventStart >= weekStart && eventStart <= weekEnd;
        });

        console.log('[TechCalendarWeekView] Single-day events in week range:', singleDayEvents.length);
        allProcessedEvents.push(...singleDayEvents);

        console.log('[TechCalendarWeekView] Total processed events:', allProcessedEvents.length);
        return allProcessedEvents;
    }, [events, weekDays]);

    // Group processed events by day for the grid
    const eventsByDay = useMemo(() => {
        console.log('[TechCalendarWeekView] Grouping processed events by day:', processedEvents.length, 'events');
        const grouped = new Map<number, (Event | MultiDayEventInstance)[]>();

        weekDays.forEach((day, dayIndex) => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            console.log(`[TechCalendarWeekView] Processing day ${dayIndex} (${day.toDateString()})`);

            // Filter events that occur on this specific day
            const dayEvents = processedEvents.filter(event => {
                const eventStart = new Date(event.startTime);
                const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;

                // For multi-day instances, check the instance date
                if ('isInstance' in event && event.isInstance) {
                    const instance = event as MultiDayEventInstance;
                    const instanceDate = new Date(instance.instanceDate);
                    const matches = instanceDate.toDateString() === day.toDateString();
                    console.log(`[TechCalendarWeekView] Multi-day instance ${instance.id} (${instance.title}) on ${instance.instanceDate} matches ${day.toDateString()}: ${matches}`);
                    return matches;
                }

                // For regular events, check if they overlap with this day
                const overlaps = eventStart <= dayEnd && eventEnd >= dayStart;
                console.log(`[TechCalendarWeekView] Regular event ${event.id} (${event.title}) overlaps ${day.toDateString()}: ${overlaps}`);
                return overlaps;
            });

            console.log(`[TechCalendarWeekView] Day ${dayIndex} has ${dayEvents.length} events`);
            grouped.set(dayIndex, dayEvents);
        });

        console.log('[TechCalendarWeekView] Final eventsByDay map:', Array.from(grouped.entries()).map(([day, events]) => `Day ${day}: ${events.length} events`));
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
        <div className="tech-calendar-week-view week-view">
            {/* Header with days */}
            <WeekHeader weekDays={weekDays} />

            {/* Time slots grid with events */}
            <div className="flex-1 overflow-auto">
                <TimeSlotGrid
                    timeSlots={timeSlots}
                    weekDays={weekDays}
                    eventsByDay={eventsByDay as Map<number, Event[]>}
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