'use client';

import React, { useState, useMemo } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import { WeekHeader } from './shared/WeekHeader';
import { TimeSlotGrid } from './shared/TimeSlotGrid';
import '@/app/styles/TechWeekView.css';
import { 
    getEventsForWeekDay,
    getWeekDays,
    generateWeekTimeSlots 
} from '@/utils/eventViewUtils';

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
    // Remove selectedEvent state - let parent handle it
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
    
    // Convert events to base Event type and filter for current week
    const processedEvents = useMemo(() => {
        return (events as Event[]).filter(event => event && event.startTime);
    }, [events]);

    // Get week days and time slots
    const weekDays = useMemo(() => {
        return getWeekDays(initialDate);
    }, [initialDate]);
    
    const START_HOUR = 6;
    const END_HOUR = 23;
    
    const timeSlots = useMemo(() => {
        return generateWeekTimeSlots(START_HOUR, END_HOUR);
    }, []);
    
    // Group events by day for positioning
    const eventsByDay = useMemo(() => {
        const grouped = new Map<number, Event[]>();
        weekDays.forEach((day, dayIndex) => {
            const dayEvents = getEventsForWeekDay(processedEvents, day, START_HOUR, END_HOUR);
            grouped.set(dayIndex, dayEvents);
        });
        return grouped;
    }, [processedEvents, weekDays]);

    const handleEventClick = (event: Event) => {
        setIsPreviewVisible(false);
        onEventSelect?.(event);
    };

    const handleEventHover = (event: Event, mouseEvent: React.MouseEvent) => {
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
            
            {/* Time slots with events */}
            <div className="flex-1 overflow-auto">
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