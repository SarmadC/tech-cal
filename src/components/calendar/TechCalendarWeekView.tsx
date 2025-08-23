'use client';

import React, { useState, useMemo } from 'react';
import { Users, Globe, Monitor, MapPin, Clock } from 'lucide-react';
import { Event, EventType, AppProfile, MultiDayEvent, isEventTracked } from '@/types';
// EventDetailPanel is handled by parent CalendarClientView
import EventPreviewCard from './EventPreviewCard';
import { formatTime, isEventLive } from '@/utils/dateUtils';

export interface TechCalendarWeekViewProps {
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

const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6; // Start from 6 AM
    const time24 = `${hour.toString().padStart(2, '0')}:00`;
    const time12 = formatTime(`2000-01-01T${time24}:00`, { hour: 'numeric', minute: '2-digit' });
    return { hour, time24, time12 };
});

// Get the week days starting from Monday
const getWeekDays = (startDate: Date): Date[] => {
    const weekStart = new Date(startDate);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    
    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
    });
};

// Format day header (e.g., "17 Mon", "18 Tue")
const formatDayHeader = (date: Date): { dayNumber: string; dayName: string } => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
        dayNumber: date.getDate().toString(),
        dayName: dayNames[date.getDay()]
    };
};

// Check if event falls on specific day
const isEventOnDay = (event: Event, day: Date): boolean => {
    const eventStart = new Date(event.startTime);
    const eventDateStr = eventStart.toDateString();
    const dayDateStr = day.toDateString();
    return eventDateStr === dayDateStr;
};

// This function is kept for potential future use but currently unused
// const getEventsForDayAndTime = (events: Event[], day: Date, timeSlot: { hour: number }): Event[] => {
//     return events.filter(event => {
//         if (!isEventOnDay(event, day)) return false;
//         
//         const eventStart = new Date(event.startTime);
//         const eventHour = eventStart.getHours();
//         
//         return eventHour === timeSlot.hour;
//     });
// };

// Reuse the EventCard component from day view
interface WeekEventCardProps {
    event: Event;
    onClick: () => void;
    onHover: (event: Event, mouseEvent: React.MouseEvent) => void;
    onLeave: () => void;
    categoryColor: string;
}

const WeekEventCard: React.FC<WeekEventCardProps> = ({ event, onClick, onHover, onLeave, categoryColor }) => {
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : null;
    const timeText = formatTime(startTime);
    const live = isEventLive(startTime, endTime);

    return (
        <div 
            onClick={onClick} 
            onMouseEnter={(e) => onHover(event, e)} 
            onMouseLeave={onLeave}
            className={`p-2 mb-1 rounded cursor-pointer transition-all duration-200 text-xs ${
                live 
                    ? 'bg-gray-800 text-white border-l-2 border-green-400' 
                    : 'bg-white hover:bg-gray-50 border border-gray-200'
            } ${isEventTracked(event) ? 'ring-1 ring-blue-400' : ''}`}
        >
            <div className={`font-medium truncate ${live ? 'text-white' : 'text-gray-900'}`}>
                {event.title}
            </div>
            <div className={`flex items-center gap-1 mt-1 ${live ? 'text-gray-300' : 'text-gray-600'}`}>
                <Clock className="w-3 h-3" />
                <span>{timeText}</span>
            </div>
            <div className={`truncate ${live ? 'text-gray-400' : 'text-gray-500'}`}>
                {event.organizer}
            </div>
            <div className="flex items-center gap-1 mt-1">
                <div className={`w-2 h-2 rounded-full ${categoryColor}`} />
            </div>
        </div>
    );
};

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

    // Get week days
    const weekDays = useMemo(() => {
        return getWeekDays(initialDate);
    }, [initialDate]);
    
    // Event categorization is now done inline where needed
    // const categorizedEvents = useMemo(() => {
    //     const categorized: Record<string, Event[]> = {};
    //     EVENT_CATEGORIES.forEach(category => { 
    //         categorized[category.id] = []; 
    //     });
    //     
    //     processedEvents.forEach((event: Event) => {
    //         const title = event.title.toLowerCase();
    //         const description = (event.description || '').toLowerCase();
    //         if (title.includes('conference') || title.includes('summit')) {
    //             categorized.conferences.push(event);
    //         } else if (title.includes('workshop') || title.includes('training') || description.includes('hands-on')) {
    //             categorized.workshops.push(event);
    //         } else if (title.includes('webinar') || title.includes('online') || event.livestreamUrl) {
    //             categorized.webinars.push(event);
    //         } else if (title.includes('networking') || title.includes('meetup') || title.includes('social')) {
    //             categorized.networking.push(event);
    //         } else {
    //             categorized.webinars.push(event);
    //         }
    //     });
    //     return categorized;
    // }, [processedEvents]);

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

    const getCategoryColor = (categoryId: string) => {
        return EVENT_CATEGORIES.find(cat => cat.id === categoryId)?.color || 'bg-gray-500';
    };

    return (
        <div className="flex h-full bg-gray-50">
            <div className="flex-1 overflow-auto">
                <div className="min-w-[1200px]">
                    {/* Header with days */}
                    <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 bg-white border-b border-gray-200 sticky top-0 z-20">
                        <div className="p-4 text-center font-medium text-gray-500 bg-gray-50">Time</div>
                        {weekDays.map((day, index) => {
                            const { dayNumber, dayName } = formatDayHeader(day);
                            const today = new Date();
                            const isToday = day.toDateString() === today.toDateString();
                            
                            return (
                                <div key={index} className={`p-4 text-center border-l border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
                                    <div className={`font-medium ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                                        {dayName}
                                    </div>
                                    <div className={`text-sm ${isToday ? 'text-blue-700' : 'text-gray-500'} mt-1`}>
                                        {dayNumber}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Time slots and events */}
                    <div className="relative">
                        {TIME_SLOTS.map((timeSlot) => (
                            <div key={timeSlot.hour} className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 min-h-[80px] border-b border-gray-200">
                                {/* Time label */}
                                <div className="p-4 bg-gray-50 flex items-center justify-center border-r border-gray-200">
                                    <div className="text-center">
                                        <div className="font-medium text-gray-900 text-sm">{timeSlot.time12.split(' ')[0]}</div>
                                        <div className="text-xs text-gray-500">{timeSlot.time12.split(' ')[1]}</div>
                                    </div>
                                </div>
                                
                                {/* Day columns for this time slot */}
                                {weekDays.map((day, dayIndex) => {
                                    const dayEvents = processedEvents.filter(event => 
                                        isEventOnDay(event, day) && 
                                        new Date(event.startTime).getHours() === timeSlot.hour
                                    );
                                    
                                    return (
                                        <div key={`${timeSlot.hour}-${dayIndex}`} className="border-l border-gray-200 bg-white relative p-1">
                                            {dayEvents.map((event) => {
                                                // Determine category for color
                                                const title = event.title.toLowerCase();
                                                const description = (event.description || '').toLowerCase();
                                                let categoryId = 'webinars'; // default
                                                
                                                if (title.includes('conference') || title.includes('summit')) {
                                                    categoryId = 'conferences';
                                                } else if (title.includes('workshop') || title.includes('training') || description.includes('hands-on')) {
                                                    categoryId = 'workshops';
                                                } else if (title.includes('webinar') || title.includes('online') || event.livestreamUrl) {
                                                    categoryId = 'webinars';
                                                } else if (title.includes('networking') || title.includes('meetup') || title.includes('social')) {
                                                    categoryId = 'networking';
                                                }
                                                
                                                return (
                                                    <WeekEventCard
                                                        key={event.id}
                                                        event={event}
                                                        onClick={() => handleEventClick(event)}
                                                        onHover={handleEventHover}
                                                        onLeave={handleEventLeave}
                                                        categoryColor={getCategoryColor(categoryId)}
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
            
            {/* Event Detail Sidebar is handled by parent CalendarClientView */}
            
            {/* Event Preview Card - reuse existing component */}
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