'use client';

import React, { useState, useMemo } from 'react';
import { Users, Globe, Monitor, MapPin, Clock } from 'lucide-react';
import { AppEvent, AppEventType, AppProfile } from '@/types';
import EventDetailPanel from './EventDetailPanel';
import EventPreviewCard from './EventPreviewCard';
import '@/app/styles/tech-day-view.css';

export interface TechCalendarDayViewProps {
    events: AppEvent[];
    initialDate: Date;
    categories: AppEventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: AppEvent) => void;
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
    const time12 = new Date(`2000-01-01 ${time24}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { hour, time24, time12 };
});

// This helper function must be defined outside the component, or wrapped in useCallback
const getVisualEventInfo = (event: AppEvent, currentDate: Date) => {
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

    const totalDurationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const dayNumber = Math.floor((todayStart.getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return { spanHours, isContinuingFromPreviousDay, isContinuingToNextDay, totalDurationHours, dayNumber };
};

interface EventCardProps {
    event: AppEvent;
    onClick: () => void;
    onHover: (event: AppEvent, mouseEvent: React.MouseEvent) => void;
    onLeave: () => void;
    categoryColor: string;
    visualInfo: ReturnType<typeof getVisualEventInfo>;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick, onHover, onLeave, categoryColor, visualInfo }) => {
    const { spanHours, isContinuingFromPreviousDay, isContinuingToNextDay, totalDurationHours, dayNumber } = visualInfo;

    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : null;

    const timeText = isContinuingFromPreviousDay
        ? `Continues from yesterday`
        : startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const isLive = new Date() >= startTime && (endTime ? new Date() <= endTime : false);
    const isSpanning = spanHours > 1;

    const continuationClasses = [
        isContinuingFromPreviousDay ? 'continuation-top' : '',
        isContinuingToNextDay ? 'continuation-bottom' : '',
    ].join(' ');

    const cardStyle = isSpanning ? { height: `calc(${spanHours * 100}% - 0.5rem)`, position: 'absolute' as const, top: '0.5rem', left: '0.5rem', right: '0.5rem', zIndex: 10 } : {};

    return (
        <div onClick={onClick} onMouseEnter={(e) => onHover(event, e)} onMouseLeave={onLeave} style={cardStyle} className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${continuationClasses} ${isLive ? 'bg-gray-800 text-white border-l-4 border-green-400' : 'bg-white hover:bg-gray-50 border border-gray-200'} ${event.isTracked ? 'ring-2 ring-blue-400' : ''} event-card`}>
            <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold text-sm leading-tight ${isLive ? 'text-white' : 'text-gray-900'}`}>{event.title}</h4>
            </div>
            <div className={`flex items-center gap-2 mb-2 text-xs ${isLive ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{timeText}</span></div>
                {totalDurationHours >= 24 && <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isLive ? 'bg-gray-700 text-gray-300' : 'bg-blue-100 text-blue-700'}`}>Day {dayNumber}</span>}
            </div>
            {/* You had a comment here, I've re-added some of the other info for a complete card */}
            <div className={`text-xs ${isLive ? 'text-gray-400' : 'text-gray-500'} mb-2`}>{event.organizer}</div>
            <div className="flex items-center gap-1 mt-auto">
                <div className={`w-2 h-2 rounded-full ${categoryColor}`} />
            </div>
        </div>
    );
};

export function TechCalendarDayView({
    events,
    initialDate,
    onEventSelect,
    categories,
}: TechCalendarDayViewProps) {
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
    const [previewEvent, setPreviewEvent] = useState<AppEvent | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

    const dayEvents = useMemo(() => {
        const targetDate = new Date(initialDate);
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();
        const targetDay = targetDate.getDate();
        return events.filter((event: AppEvent) => {
            const eventDate = new Date(event.startTime);
            return eventDate.getFullYear() === targetYear && eventDate.getMonth() === targetMonth && eventDate.getDate() === targetDay;
        });
    }, [events, initialDate]);

    const categorizedEvents = useMemo(() => {
        const categorized: Record<string, AppEvent[]> = {};
        EVENT_CATEGORIES.forEach(category => { categorized[category.id] = []; });
        dayEvents.forEach((event: AppEvent) => {
            const title = event.title.toLowerCase();
            const description = event.description.toLowerCase();
            if (title.includes('conference') || title.includes('summit')) categorized.conferences.push(event);
            else if (title.includes('workshop') || title.includes('training') || description.includes('hands-on')) categorized.workshops.push(event);
            else if (title.includes('webinar') || title.includes('online') || event.livestreamUrl) categorized.webinars.push(event);
            else if (title.includes('networking') || title.includes('meetup') || title.includes('social')) categorized.networking.push(event);
            else categorized.webinars.push(event);
        });
        return categorized;
    }, [dayEvents]);

    const getEventsStartingInSlot = (hour: number, categoryId: string) => {
        return categorizedEvents[categoryId]?.filter((event: AppEvent) => new Date(event.startTime).getHours() === hour) || [];
    };

    // --- FIX #1: RESTORE THE `displayedSlots` CALCULATION ---
    const displayedSlots = useMemo(() => {
        const slots = new Set<number>();
        dayEvents.forEach((event: AppEvent) => {
            const startHour = new Date(event.startTime).getHours();
            const endHour = event.endTime ? new Date(event.endTime).getHours() : startHour;
            for (let i = startHour; i <= endHour; i++) slots.add(i);
        });
        for (let i = 8; i <= 18; i++) slots.add(i);
        return TIME_SLOTS.filter((slot: { hour: number }) => slots.has(slot.hour)).sort((a, b) => a.hour - b.hour);
    }, [dayEvents]);

    const handleEventClick = (event: AppEvent) => {
        setSelectedEvent(event);
        setIsPreviewVisible(false);
        onEventSelect?.(event);
    };

    const handleEventHover = (event: AppEvent, mouseEvent: React.MouseEvent) => {
        const rect = mouseEvent.currentTarget.getBoundingClientRect();
        setPreviewEvent(event);
        setPreviewPosition({ x: rect.right + 10, y: rect.top });
        setIsPreviewVisible(true);
    };

    const handleEventLeave = () => {
        setIsPreviewVisible(false);
    };

    return (
        <div className="flex h-full bg-gray-50">
            <div className="flex-1 overflow-auto">
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
                                                // --- FIX #2: CALL THE HELPER FUNCTION HERE ---
                                                const visualInfo = getVisualEventInfo(event, initialDate);
                                                return (
                                                    <EventCard
                                                        key={event.id}
                                                        event={event}
                                                        onClick={() => handleEventClick(event)}
                                                        onHover={handleEventHover}
                                                        onLeave={handleEventLeave}
                                                        categoryColor={category.color}
                                                        visualInfo={visualInfo} // Pass the calculated info
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
                <EventPreviewCard event={previewEvent} isVisible={isPreviewVisible} position={previewPosition} onClose={handleEventLeave} />
            )}
        </div>
    );
}