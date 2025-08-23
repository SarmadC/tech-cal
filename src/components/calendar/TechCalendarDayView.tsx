'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Users, Globe, Monitor, MapPin, Clock } from 'lucide-react';
import { Event, EventType, AppProfile, MultiDayEvent } from '@/types';
import EventDetailPanel from './EventDetailPanel';
import EventPreviewCard from './EventPreviewCard';
import '@/app/styles/tech-day-view.css';
import { processEventsForDayView, MultiDayEventInstance } from '@/utils/multiDayEventUtils';
import { formatTime, isEventLive } from '@/utils/dateUtils';

// 2. UPDATE PROPS: Use the new types for component props.
export interface TechCalendarDayViewProps {
    events: Event[] | MultiDayEvent[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
}

const EVENT_CATEGORIES = [
    { id: 'conferences', name: 'Conferences', icon: Users, color: 'bg-blue-500' },
    { id: 'workshops', name: 'Workshops', icon: Monitor, color: 'bg-green-500' },
    { id: 'webinars', name: 'Webinars', icon: Globe, color: 'bg-purple-500' },
    { id: 'networking', name: 'Networking', icon: MapPin, color: 'bg-orange-500' },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const time24 = `${hour.toString().padStart(2, '0')}:00`;
    const time12 = formatTime(`2000-01-01T${time24}:00`, { hour: 'numeric', minute: '2-digit' });
    return { hour, time24, time12 };
});

// 3. UPDATE SIGNATURES: Helper functions now use the base `Event` type.
const getVisualEventInfo = (event: Event, currentDate: Date) => {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 3600 * 1000);

    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(currentDate);
    todayEnd.setHours(23, 59, 59, 999);

    const isContinuingFromPreviousDay = start < todayStart;
    const isContinuingToNextDay = end > todayEnd;

    const visualStartHour = isContinuingFromPreviousDay ? 0 : start.getHours();
    const visualEndHour = isContinuingToNextDay ? 24 : end.getHours() + (end.getMinutes() > 0 ? 1 : 0);

    const spanHours = Math.max(1, visualEndHour - visualStartHour);

    const _totalDurationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    // Check if this is a multi-day event instance or a regular multi-day event
    const isMultiDayInstance = 'isInstance' in event && 'dayInfo' in event;
    let isActuallyMultiDay = false;
    let dayNumber = 1;

    if (isMultiDayInstance) {
        // For multi-day event instances, use the dayInfo
        const instance = event as MultiDayEventInstance;
        isActuallyMultiDay = instance.dayInfo ? instance.dayInfo.totalDays > 1 : false;
        dayNumber = instance.dayInfo ? instance.dayInfo.currentDay : 1;

    } else {
        // For regular events, check if they span multiple calendar days
        const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        isActuallyMultiDay = startDate.getTime() !== endDate.getTime();
        dayNumber = Math.floor((todayStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    return { spanHours, isContinuingFromPreviousDay, isContinuingToNextDay, dayNumber, isActuallyMultiDay };
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
    const timeText = isContinuingFromPreviousDay ? `Continues from yesterday` : formatTime(startTime);
    const live = isEventLive(startTime, endTime);
    const isSpanning = spanHours > 1;

    const continuationClasses = [
        isContinuingFromPreviousDay ? 'continuation-top' : '',
        isContinuingToNextDay ? 'continuation-bottom' : '',
    ].join(' ');

    const cardStyle = isSpanning ? { height: `calc(${spanHours * 100}% - 0.5rem)`, position: 'absolute' as const, top: '0.5rem', left: '0.5rem', right: '0.5rem', zIndex: 10 } : {};

    return (
        <div onClick={onClick} onMouseEnter={(e) => onHover(event, e)} onMouseLeave={onLeave} style={cardStyle} className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${continuationClasses} ${live ? 'bg-gray-800 text-white border-l-4 border-green-400' : 'bg-white hover:bg-gray-50 border border-gray-200'} ${isEventTracked(event) ? 'ring-2 ring-blue-400' : ''} event-card`}>
            <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold text-sm leading-tight ${live ? 'text-white' : 'text-gray-900'}`}>{event.title}</h4>
            </div>
            <div className={`flex items-center gap-2 mb-2 text-xs ${live ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{timeText}</span></div>
                {isActuallyMultiDay && <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${live ? 'bg-gray-700 text-gray-300' : 'bg-blue-100 text-blue-700'}`}>Day {dayNumber}</span>}
            </div>
            <div className={`text-xs ${live ? 'text-gray-400' : 'text-gray-500'} mb-2`}>{event.organizer}</div>
            <div className="flex items-center gap-1 mt-auto">
                <div className={`w-2 h-2 rounded-full ${categoryColor}`} />
            </div>
        </div>
    );
};
// 4. Import and use the `isEventTracked` type guard
import { isEventTracked } from '@/types';


export function TechCalendarDayView({
    events,
    initialDate,
    onEventSelect,
    categories,
}: TechCalendarDayViewProps) {
    // 5. UPDATE STATE: Use the new `Event` type.
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (hideTimer) {
                clearTimeout(hideTimer);
            }
        };
    }, [hideTimer]);

    const dayEvents = useMemo(() => {
        // The type cast here is now to `MultiDayEvent[]`
        const multiDayEvents = events as MultiDayEvent[];

        try {
            const processedEvents = processEventsForDayView(multiDayEvents, initialDate);
            return processedEvents;
        } catch (error) {
            console.error('Error in processEventsForDayView:', error);

            const targetDate = new Date(initialDate);
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth();
            const targetDay = targetDate.getDate();

            return events.filter((event: Event) => {
                const eventDate = new Date(event.startTime);
                return eventDate.getFullYear() === targetYear &&
                    eventDate.getMonth() === targetMonth &&
                    eventDate.getDate() === targetDay;
            });
        }
    }, [events, initialDate]);

    // 6. UPDATE TYPE ANNOTATIONS: Use the `Event` type throughout.
    const categorizedEvents = useMemo(() => {
        const categorized: Record<string, Event[]> = {};
        EVENT_CATEGORIES.forEach(category => { categorized[category.id] = []; });
        dayEvents.forEach((event: Event) => {
            const title = event.title.toLowerCase();
            const description = (event.description || '').toLowerCase();
            if (title.includes('conference') || title.includes('summit')) categorized.conferences.push(event);
            else if (title.includes('workshop') || title.includes('training') || description.includes('hands-on')) categorized.workshops.push(event);
            else if (title.includes('webinar') || title.includes('online') || event.livestreamUrl) categorized.webinars.push(event);
            else if (title.includes('networking') || title.includes('meetup') || title.includes('social')) categorized.networking.push(event);
            else categorized.webinars.push(event);
        });
        return categorized;
    }, [dayEvents]);

    const getEventsStartingInSlot = (hour: number, categoryId: string) => {
        return categorizedEvents[categoryId]?.filter((event: Event) => new Date(event.startTime).getHours() === hour) || [];
    };

    const displayedSlots = useMemo(() => {
        const slots = new Set<number>();
        dayEvents.forEach((event: Event) => {
            const startHour = new Date(event.startTime).getHours();
            const endHour = event.endTime ? new Date(event.endTime).getHours() : startHour;
            for (let i = startHour; i <= endHour; i++) slots.add(i);
        });
        for (let i = 8; i <= 18; i++) slots.add(i);
        return TIME_SLOTS.filter((slot: { hour: number }) => slots.has(slot.hour)).sort((a, b) => a.hour - b.hour);
    }, [dayEvents]);

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setIsPreviewVisible(false);
        onEventSelect?.(event);
    };

    const handleEventHover = (event: Event, mouseEvent: React.MouseEvent) => {
        // Clear any existing hide timer
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
        // Don't hide immediately, set a timer to allow user to move to preview card
        const timer = setTimeout(() => {
            setIsPreviewVisible(false);
            setPreviewEvent(null);
        }, 300); // 300ms delay
        setHideTimer(timer);
    };

    const handlePreviewHover = () => {
        // Clear hide timer when hovering over preview card
        if (hideTimer) {
            clearTimeout(hideTimer);
            setHideTimer(null);
        }
    };

    const handlePreviewLeave = () => {
        // Hide preview when leaving the preview card
        setIsPreviewVisible(false);
        setPreviewEvent(null);
    };

    return (
        <div className="flex h-full bg-gray-50">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="min-w-[800px]">
                    <div className="grid grid-cols-[100px_repeat(4,1fr)] gap-0 bg-white border-b border-gray-200 sticky top-0 z-20">
                        <div className="p-4 text-center font-medium text-gray-500 bg-gray-50 category-header">Time</div>
                        {EVENT_CATEGORIES.map(category => {
                            const categoryEvents = categorizedEvents[category.id] || [];
                            const Icon = category.icon;
                            return (
                                <div key={category.id} className="p-4 text-center border-l border-gray-200 category-header bg-white">
                                    <div className="flex items-center justify-center space-x-2">
                                        <Icon className="w-4 h-4 text-gray-600" />
                                        <span className="font-medium text-gray-900">{category.name}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {categoryEvents.length} event{categoryEvents.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="relative">
                        {displayedSlots.map(slot => (
                            <div key={slot.hour} className="grid grid-cols-[100px_repeat(4,1fr)] gap-0 min-h-[100px] border-b border-gray-200">
                                <div className="p-4 bg-gray-50 flex items-center justify-center border-r border-gray-200">
                                    <div className="text-center">
                                        <div className="font-medium text-gray-900">{slot.time12.split(' ')[0]}</div>
                                        <div className="text-xs text-gray-500">{slot.time12.split(' ')[1]}</div>
                                    </div>
                                </div>
                                {EVENT_CATEGORIES.map(category => (
                                    <div key={category.id} className="border-l border-gray-200 bg-white relative">
                                        <div className="absolute inset-0 p-2 space-y-2">
                                            {getEventsStartingInSlot(slot.hour, category.id).map(event => {
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
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {selectedEvent && (
                <div className="w-96 border-l border-border-default bg-background-elevated shrink-0">
                    <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} categories={categories} />
                </div>
            )}
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