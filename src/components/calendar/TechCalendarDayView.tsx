'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, Globe, Monitor, MapPin, Clock } from 'lucide-react';
import { AppEvent, AppEventType, AppProfile } from '@/types';
import CalendarSidebar from './CalendarSidebar';

export interface TechCalendarDayViewProps {
    events: AppEvent[];
    initialDate: Date;
    onEventSelect?: (event: AppEvent) => void;
    categories?: AppEventType[];
    profile?: AppProfile | null;
}

// Event categories for column organization
const EVENT_CATEGORIES = [
    { id: 'conferences', name: 'Conferences', icon: Users, color: 'bg-blue-500' },
    { id: 'workshops', name: 'Workshops', icon: Monitor, color: 'bg-green-500' },
    { id: 'webinars', name: 'Webinars', icon: Globe, color: 'bg-purple-500' },
    { id: 'networking', name: 'Networking', icon: MapPin, color: 'bg-orange-500' },
];

// Time slots for the day (24-hour format)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    const time24 = `${hour.toString().padStart(2, '0')}:00`;
    const time12 = new Date(`2000-01-01 ${time24}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    return { hour, time24, time12 };
});

interface EventCardProps {
    event: AppEvent;
    onClick: () => void;
    categoryColor: string;
    spanHours?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClick, categoryColor, spanHours = 1 }) => {
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : null;
    const duration = endTime ?
        `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` :
        startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const isVirtual = event.location?.toLowerCase().includes('virtual') || event.livestreamUrl;
    const isLive = new Date() >= startTime && (endTime ? new Date() <= endTime : false);

    // Calculate the height based on span hours (each hour slot is ~80px + borders)
    const cardHeight = spanHours > 1 ? `${spanHours * 80 + (spanHours - 1) * 1}px` : 'auto';

    return (
        <div
            onClick={onClick}
            style={spanHours > 1 ? { height: cardHeight, minHeight: cardHeight } : {}}
            className={`
                relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg
                ${spanHours > 1 ? 'flex flex-col justify-between' : ''}
                ${isLive ? 'bg-gray-800 text-white border-l-4 border-green-400' : 'bg-white hover:bg-gray-50 border border-gray-200'}
                ${event.isTracked ? 'ring-2 ring-blue-400' : ''}
            `}
        >
            {/* Event Header */}
            <div className="flex items-start justify-between mb-2">
                <h4 className={`font-semibold text-sm leading-tight ${isLive ? 'text-white' : 'text-gray-900'}`}>
                    {event.title}
                </h4>
                {isVirtual && (
                    <Globe className={`w-4 h-4 ${isLive ? 'text-blue-300' : 'text-blue-500'} flex-shrink-0 ml-2`} />
                )}
            </div>

            {/* Time and Duration */}
            <div className={`flex items-center gap-1 mb-2 text-xs ${isLive ? 'text-gray-300' : 'text-gray-600'}`}>
                <Clock className="w-3 h-3" />
                <span>{duration}</span>
                {spanHours > 1 && (
                    <span className={`ml-1 px-1 py-0.5 rounded text-xs font-medium ${isLive ? 'bg-gray-700 text-gray-300' : 'bg-blue-100 text-blue-700'}`}>
                        {spanHours}h
                    </span>
                )}
            </div>

            {/* Organizer */}
            <div className={`text-xs ${isLive ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                {event.organizer}
            </div>

            {/* Tags/Categories */}
            <div className="flex items-center gap-1 mt-auto">
                <div className={`w-2 h-2 rounded-full ${categoryColor}`} />
                {event.eventTypeId && (
                    <span className={`text-xs px-2 py-1 rounded-full ${isLive ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        Tech
                    </span>
                )}
                {isLive && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500 text-white font-medium">
                        LIVE
                    </span>
                )}
            </div>

            {/* Tracking indicator */}
            {event.isTracked && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
            )}
        </div>
    );
};

export function TechCalendarDayView({
    events,
    initialDate,
    onEventSelect,
    categories = [],
    profile
}: TechCalendarDayViewProps) {
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

    // Filter events for the current date
    const dayEvents = useMemo(() => {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        return events.filter(event => {
            const eventStart = new Date(event.startTime);
            return eventStart >= dayStart && eventStart <= dayEnd;
        });
    }, [events, currentDate]);

    // Categorize events by type/category for column organization
    const categorizedEvents = useMemo(() => {
        const categorized: Record<string, AppEvent[]> = {};

        EVENT_CATEGORIES.forEach(category => {
            categorized[category.id] = [];
        });

        dayEvents.forEach(event => {
            // Simple categorization logic - you can enhance this based on your event types
            const title = event.title.toLowerCase();
            const description = event.description.toLowerCase();

            if (title.includes('conference') || title.includes('summit')) {
                categorized.conferences.push(event);
            } else if (title.includes('workshop') || title.includes('training') || description.includes('hands-on')) {
                categorized.workshops.push(event);
            } else if (title.includes('webinar') || title.includes('online') || event.livestreamUrl) {
                categorized.webinars.push(event);
            } else if (title.includes('networking') || title.includes('meetup') || title.includes('social')) {
                categorized.networking.push(event);
            } else {
                // Default to webinars for uncategorized events
                categorized.webinars.push(event);
            }
        });

        return categorized;
    }, [dayEvents]);

    // Get events that START in a specific time slot and category
    const getEventsStartingInSlot = (hour: number, categoryId: string) => {
        return categorizedEvents[categoryId]?.filter(event => {
            const eventStartHour = new Date(event.startTime).getHours();
            return eventStartHour === hour;
        }) || [];
    };

    // Calculate how many hours an event spans
    const getEventSpanHours = (event: AppEvent) => {
        if (!event.endTime) return 1;
        const startHour = new Date(event.startTime).getHours();
        const endHour = new Date(event.endTime).getHours();
        const startMinutes = new Date(event.startTime).getMinutes();
        const endMinutes = new Date(event.endTime).getMinutes();

        // Calculate total span including partial hours
        let span = endHour - startHour;
        if (endMinutes > 0) span += 1; // Add partial hour if event doesn't end exactly on the hour
        return Math.max(1, span);
    };

    // Check if any events start in this slot across all categories
    const hasEventsStartingInSlot = (hour: number) => {
        return EVENT_CATEGORIES.some(category =>
            getEventsStartingInSlot(hour, category.id).length > 0
        );
    };

    const handleEventClick = (event: AppEvent) => {
        setSelectedEvent(event);
        onEventSelect?.(event);
    };

    const navigateDate = (direction: 'prev' | 'next' | 'today') => {
        const newDate = new Date(currentDate);

        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 1);
        } else if (direction === 'next') {
            newDate.setDate(newDate.getDate() + 1);
        } else {
            // today
            return setCurrentDate(new Date());
        }

        setCurrentDate(newDate);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="h-screen flex bg-background-main">
            {/* Sidebar */}
            <div className="w-80 border-r border-border-default bg-background-elevated">
                <CalendarSidebar
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    categories={categories}
                    user={{
                        name: profile?.fullName || 'User',
                        role: 'Member'
                    }}
                    events={events}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-gray-50">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => navigateDate('prev')}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <h2 className="text-xl font-semibold text-gray-700 min-w-[200px] text-center">
                                    {formatDate(currentDate)}
                                </h2>
                                <button
                                    onClick={() => navigateDate('next')}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => navigateDate('today')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Calendar Grid */}
                    <div className="flex-1 overflow-auto">
                        <div className="min-w-[800px]">
                            {/* Column Headers */}
                            <div className="grid grid-cols-5 gap-0 bg-white border-b border-gray-200 sticky top-0 z-10">
                                <div className="p-4 text-center font-medium text-gray-500 bg-gray-50">
                                    Time
                                </div>
                                {EVENT_CATEGORIES.map(category => {
                                    const categoryEvents = categorizedEvents[category.id] || [];
                                    const Icon = category.icon;
                                    return (
                                        <div key={category.id} className="p-4 text-center border-l border-gray-200">
                                            <div className="flex items-center justify-center space-x-2">
                                                <Icon className="w-4 h-4 text-gray-600" />
                                                <span className="font-medium text-gray-900">{category.name}</span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {categoryEvents.length} {categoryEvents.length === 1 ? 'event' : 'events'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Time Slots */}
                            <div className="divide-y divide-gray-200">
                                {TIME_SLOTS.map(slot => {
                                    const hasEvents = hasEventsStartingInSlot(slot.hour);

                                    // Only show time slots that have events starting or are during typical event hours (8 AM - 11 PM)
                                    if (!hasEvents && (slot.hour < 8 || slot.hour > 23)) {
                                        return null;
                                    }

                                    return (
                                        <div key={slot.hour} className="grid grid-cols-5 gap-0 min-h-[80px]">
                                            {/* Time Label */}
                                            <div className="p-4 bg-gray-50 flex items-center justify-center border-r border-gray-200">
                                                <div className="text-center">
                                                    <div className="font-medium text-gray-900">{slot.time12}</div>
                                                    <div className="text-xs text-gray-500">:00</div>
                                                </div>
                                            </div>

                                            {/* Event Columns */}
                                            {EVENT_CATEGORIES.map(category => {
                                                const slotEvents = getEventsStartingInSlot(slot.hour, category.id);
                                                return (
                                                    <div key={category.id} className="p-2 border-l border-gray-200 bg-white">
                                                        <div className="space-y-2">
                                                            {slotEvents.map(event => {
                                                                const spanHours = getEventSpanHours(event);
                                                                return (
                                                                    <EventCard
                                                                        key={event.id}
                                                                        event={event}
                                                                        onClick={() => handleEventClick(event)}
                                                                        categoryColor={category.color}
                                                                        spanHours={spanHours}
                                                                    />
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Event Details Sidebar */}
                    {selectedEvent && (
                        <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto">
                            <div className="space-y-6">
                                {/* Header */}
                                <div>
                                    <div className="flex items-start justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
                                        <button
                                            onClick={() => setSelectedEvent(null)}
                                            className="p-1 hover:bg-gray-100 rounded"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h2>
                                    <p className="text-gray-600">{selectedEvent.organizer}</p>
                                </div>

                                {/* Event Info */}
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Schedule</h4>
                                        <div className="flex items-center space-x-2 text-gray-600">
                                            <Calendar className="w-4 h-4" />
                                            <span>{formatDate(new Date(selectedEvent.startTime))}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-gray-600 mt-1">
                                            <Clock className="w-4 h-4" />
                                            <span>
                                                {new Date(selectedEvent.startTime).toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                                {selectedEvent.endTime && ` - ${new Date(selectedEvent.endTime).toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                                        <div className="flex items-center space-x-2 text-gray-600">
                                            <MapPin className="w-4 h-4" />
                                            <span>{selectedEvent.location || 'TBA'}</span>
                                        </div>
                                        {selectedEvent.livestreamUrl && (
                                            <div className="flex items-center space-x-2 text-blue-600 mt-1">
                                                <Globe className="w-4 h-4" />
                                                <a
                                                    href={selectedEvent.livestreamUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    Join Virtual Event
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {selectedEvent.description}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-4 border-t border-gray-200">
                                        <button
                                            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${selectedEvent.isTracked
                                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            {selectedEvent.isTracked ? 'Untrack Event' : 'Track Event'}
                                        </button>
                                        <button className="w-full py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                            Add to Calendar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}