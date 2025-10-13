// src/components/calendar/TechCalendarWeekView.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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

    // Process events using the proper multi-day processing function
    const processedEvents = useMemo(() => {
        if (!events || events.length === 0) return [];
        
        console.log('Week view processing events:', {
            originalEvents: events.length,
            events: events.map(e => ({
                title: e.title,
                startTime: e.startTime,
                endTime: e.endTime,
                isMultiDay: e.isMultiDay,
                dailySchedule: e.dailySchedule
            }))
        });
        
        const processed = processEventsForWeekView(events);
        
        console.log('Week view processed events:', {
            processedCount: processed.length,
            processedEvents: processed.map(e => ({
                title: e.title,
                startTime: e.startTime,
                endTime: e.endTime,
                isInstance: 'isInstance' in e ? e.isInstance : false
            }))
        });
        
        return processed;
    }, [events]);

    // Group processed events by day for the grid
    const eventsByDay = useMemo(() => {
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
                        // Multi-day instance matched for this day
                    }
                    return matches;
                }

                // For regular events, check if they occur on this day
                const eventStart = new Date((event as Event | MultiDayEventInstance).startTime);
                return eventStart.toDateString() === day.toDateString();
            });



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

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (hideTimer) {
                clearTimeout(hideTimer);
            }
        };
    }, [hideTimer]);

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