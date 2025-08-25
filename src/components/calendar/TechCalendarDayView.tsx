// src/components/calendar/TechCalendarDayView.tsx

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Users, Globe, Monitor, MapPin, Clock, HelpCircle } from 'lucide-react';
import { Event, EventType, AppProfile, MultiDayEvent, isEventTracked } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import '@/app/styles/tech-day-view.css';
import { processEventsForDayView, MultiDayEventInstance } from '@/utils/multiDayEventUtils';
import { formatTime, isEventLive } from '@/utils/dateUtils';

const getIconForCategory = (categoryName: string) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('conference')) return Users;
    if (name.includes('workshop') || name.includes('training')) return Monitor;
    if (name.includes('webinar')) return Globe;
    if (name.includes('networking') || name.includes('meetup')) return MapPin;
    return HelpCircle;
};

export interface TechCalendarDayViewProps {
    events: Event[] | MultiDayEvent[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const time24 = `${hour.toString().padStart(2, '0')}:00`;
    const time12 = formatTime(`2000-01-01T${time24}:00`);
    return { hour, time24, time12 };
});

const getVisualEventInfo = (event: Event | MultiDayEventInstance, _currentDate: Date) => {
    const isInstance = 'isInstance' in event && event.isInstance;
    const dayInfo = isInstance ? (event as MultiDayEventInstance).dayInfo : undefined;

    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 3600 * 1000);

    // These flags are now only for visual styling (e.g., dashed borders)
    const isContinuingFromPreviousDay = dayInfo ? !dayInfo.isFirstDay : false;
    const isContinuingToNextDay = dayInfo ? !dayInfo.isLastDay : false;

    // The visual start and end hours are ALWAYS derived from the instance's own times.
    const visualStartHour = start.getHours() + start.getMinutes() / 60;
    
    // Handle edge case where an event ends exactly at midnight (00:00 of the next day)
    let visualEndHour = end.getHours() + end.getMinutes() / 60;
    if (visualEndHour === 0 && start.getDate() !== end.getDate()) {
        visualEndHour = 24;
    }

    const spanHours = Math.max(1, visualEndHour - visualStartHour);


    return {
        spanHours,
        isContinuingFromPreviousDay,
        isContinuingToNextDay,
        dayNumber: dayInfo?.currentDay || 1,
        isActuallyMultiDay: dayInfo ? dayInfo.totalDays > 1 : false,
    };
};

interface EventCardProps {
    event: Event;
    onClick: () => void;
    onHover: (event: Event, mouseEvent: React.MouseEvent) => void;
    onLeave: () => void;
    categoryColor: string;
    visualInfo: ReturnType<typeof getVisualEventInfo>;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick, onHover, onLeave, categoryColor, visualInfo }) => {
    const { spanHours, isContinuingFromPreviousDay, isContinuingToNextDay, dayNumber, isActuallyMultiDay } = visualInfo;
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : null;
    const timeText = isContinuingFromPreviousDay ? 'Continues' : formatTime(startTime, event.timezone);
    const live = isEventLive(startTime, endTime);
    const isSpanning = spanHours > 1;

    const cardClasses = ['event-card', live ? 'live' : '', isEventTracked(event) ? 'tracked' : '', isSpanning ? 'spanning' : '', isContinuingFromPreviousDay ? 'continuation-top' : '', isContinuingToNextDay ? 'continuation-bottom' : ''].filter(Boolean).join(' ');

    const cardStyle = {
        background: categoryColor,
        color: 'white',
        ...(isSpanning && {
            height: `${spanHours * 80 + 20}px`,
            position: 'absolute' as const,
            top: '4px',
            left: '4px',
            right: '4px',
            zIndex: 5,
            maxHeight: 'none'
        })
    };

    return (
        <div onClick={onClick} onMouseEnter={(e) => onHover(event, e)} onMouseLeave={onLeave} style={cardStyle} className={cardClasses}>
            <div className="event-title">{event.title}</div>
            <div className="event-time"><Clock className="w-3 h-3" /><span>{timeText}</span>{isActuallyMultiDay && (<span className="event-tag duration">Day {dayNumber}</span>)}</div>
            {(isSpanning || !live) && (<div className="event-organizer">{event.organizer}</div>)}
        </div>
    );
};

export function TechCalendarDayView({ events, initialDate, categories, onEventSelect }: TechCalendarDayViewProps) {
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => { if (hideTimer) clearTimeout(hideTimer); };
    }, [hideTimer]);

    const dayEvents = useMemo(() => processEventsForDayView(events as MultiDayEvent[], initialDate), [events, initialDate]);

    const categorizedEvents = useMemo(() => {
        const categorized: Record<string, Event[]> = {};
        categories.forEach(category => { categorized[category.id] = []; });
        dayEvents.forEach((event) => {
            if (event.eventTypeId && categorized[event.eventTypeId]) {
                categorized[event.eventTypeId].push(event);
            }
        });
        return categorized;
    }, [dayEvents, categories]);

    const getEventsStartingInSlot = (hour: number, categoryId: string) => categorizedEvents[categoryId]?.filter((event) => new Date(event.startTime).getHours() === hour) || [];

    const displayedSlots = useMemo(() => {
        const slots = new Set<number>();
        dayEvents.forEach((event) => {
            const startHour = new Date(event.startTime).getHours();
            const endHour = event.endTime ? new Date(event.endTime).getHours() : startHour;
            for (let i = startHour; i <= endHour; i++) slots.add(i);
        });
        for (let i = 8; i <= 18; i++) slots.add(i);
        return TIME_SLOTS.filter((slot) => slots.has(slot.hour)).sort((a, b) => a.hour - b.hour);
    }, [dayEvents]);

    const handleEventClick = (event: Event) => {
        setIsPreviewVisible(false);
        onEventSelect?.(event);
    };

    const handleEventHover = (event: Event, mouseEvent: React.MouseEvent) => {
        if (hideTimer) clearTimeout(hideTimer);
        setHideTimer(null);
        const rect = mouseEvent.currentTarget.getBoundingClientRect();
        setPreviewEvent(event);
        setPreviewPosition({ x: rect.right + 10, y: rect.top });
        setIsPreviewVisible(true);
    };

    const handleEventLeave = () => {
        const timer = setTimeout(() => setIsPreviewVisible(false), 300);
        setHideTimer(timer);
    };

    const handlePreviewHover = () => {
        if (hideTimer) clearTimeout(hideTimer);
        setHideTimer(null);
    };

    const handlePreviewLeave = () => setIsPreviewVisible(false);

    const gridColsStyle = { gridTemplateColumns: `100px repeat(${categories.length}, 1fr)` };

    return (
        <div className="flex h-full tech-day-view">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="min-w-[800px]">
                    {/* --- FIX: Removed hardcoded background classes --- */}
                    <div className="grid gap-0 border-b border-border-default sticky top-0 z-20" style={gridColsStyle}>
                        <div className="p-4 text-center font-medium text-foreground-tertiary category-header">Time</div>
                        {categories.map(category => {
                            const categoryEvents = categorizedEvents[category.id] || [];
                            const Icon = getIconForCategory(category.name);
                            return (
                                <div key={category.id} className="p-4 text-center border-l border-border-default category-header">
                                    <div className="flex items-center justify-center space-x-2">
                                        <Icon className="w-4 h-4 text-foreground-secondary" />
                                        <span className="font-medium text-foreground-primary">{category.name}</span>
                                    </div>
                                    <div className="text-sm text-foreground-tertiary mt-1">
                                        {categoryEvents.length} event{categoryEvents.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="relative">
                        {displayedSlots.map(slot => (
                            <div key={slot.hour} className="grid gap-0 min-h-[80px] border-b border-border-default" style={gridColsStyle}>
                                <div className="p-4 flex items-center justify-center border-r border-border-default">
                                    <div className="text-center">
                                        <div className="font-medium text-foreground-secondary">{slot.time12.split(' ')[0]}</div>
                                        <div className="text-xs text-foreground-tertiary">{slot.time12.split(' ')[1]}</div>
                                    </div>
                                </div>
                                {categories.map(category => {
                                    const slotEvents = getEventsStartingInSlot(slot.hour, category.id);
                                    return (
                                        // --- FIX: Removed hardcoded 'bg-white' class ---
                                        <div key={category.id} className="border-l border-border-default relative">
                                            {slotEvents.map(event => {
                                                const visualInfo = getVisualEventInfo(event, initialDate);
                                                return (
                                                    <EventCard
                                                        key={event.id}
                                                        event={event}
                                                        onClick={() => handleEventClick(event)}
                                                        onHover={handleEventHover}
                                                        onLeave={handleEventLeave}
                                                        categoryColor={category.color}
                                                        visualInfo={visualInfo}
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
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