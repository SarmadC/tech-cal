'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Users, Globe, Monitor, MapPin, Clock } from 'lucide-react';
import { AppEvent, AppEventType, AppProfile } from '@/types';
import CalendarSidebar from './CalendarSidebar';
import EventDetailPanel from './EventDetailPanel';
import EventPreviewCard from './EventPreviewCard';

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
    onHover: (event: AppEvent, mouseEvent: React.MouseEvent) => void;
    onLeave: () => void;
    categoryColor: string;
    spanHours?: number;
    slotHeight?: number;
}

const EventCard: React.FC<EventCardProps> = ({
    event,
    onClick,
    onHover,
    onLeave,
    categoryColor,
    spanHours = 1,
    slotHeight: _slotHeight = 80
}) => {
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : null;
    const duration = endTime ?
        `${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` :
        startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const isVirtual = event.location?.toLowerCase().includes('virtual') || event.livestreamUrl;
    const isLive = new Date() >= startTime && (endTime ? new Date() <= endTime : false);

    // Calculate the height more precisely for spanning events
    const calculateSpanningHeight = () => {
        if (spanHours <= 1) return 'auto';

        // Debug: Let's use a much larger calculation to see if the issue is the height calculation
        // Each time slot is 80px minimum height + borders and gaps
        // For a 3-hour event, we want it to span approximately 240px+ to reach from 6 AM to 9 AM
        const totalHeight = spanHours * 100; // Simplified: 100px per hour to test

        return `${totalHeight}px`;
    };

    const cardHeight = calculateSpanningHeight();
    const isSpanning = spanHours > 1;

    const cardStyle = isSpanning ? {
        height: cardHeight,
        minHeight: cardHeight,
        position: 'absolute' as const,
        top: '8px', // Account for container padding
        left: '8px', // Account for container padding  
        right: '8px', // Account for container padding
        zIndex: 10,
    } : {};

    return (
        <div
            onClick={onClick}
            onMouseEnter={(e) => onHover(event, e)}
            onMouseLeave={onLeave}
            style={cardStyle}
            className={`
                relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg
                ${isSpanning ? 'flex flex-col justify-between spanning' : ''}
                ${isLive ? 'bg-gray-800 text-white border-l-4 border-green-400' : 'bg-white hover:bg-gray-50 border border-gray-200'}
                ${event.isTracked ? 'ring-2 ring-blue-400' : ''}
                event-card
            `}
        >
    {/* Event Header */ }
    <div className="flex items-start justify-between mb-2">
        <h4 className={`font-semibold text-sm leading-tight ${isLive ? 'text-white' : 'text-gray-900'}`}>
            {event.title}
        </h4>
        {isVirtual && (
            <Globe className={`w-4 h-4 ${isLive ? 'text-blue-300' : 'text-blue-500'} flex-shrink-0 ml-2`} />
        )}
    </div>

    {/* Time and Duration */ }
    <div className={`flex items-center gap-1 mb-2 text-xs ${isLive ? 'text-gray-300' : 'text-gray-600'}`}>
        <Clock className="w-3 h-3" />
        <span>{duration}</span>
        {spanHours > 1 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${isLive ? 'bg-gray-700 text-gray-300' : 'bg-blue-100 text-blue-700'}`}>
                {spanHours}h
            </span>
        )}
    </div>

    {/* Organizer */ }
    <div className={`text-xs ${isLive ? 'text-gray-400' : 'text-gray-500'} mb-2 ${isSpanning ? 'flex-shrink-0' : ''}`}>
        {event.organizer}
    </div>

    {/* Tags/Categories */ }
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

    {/* Tracking indicator */ }
    {
        event.isTracked && (
            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
        )
    }
        </div >
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

    // Hover preview state
    const [previewEvent, setPreviewEvent] = useState<AppEvent | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);

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

    // Calculate how many time slots an event should span
    const getEventSpanHours = (event: AppEvent) => {
        if (!event.endTime) return 1;

        const startTime = new Date(event.startTime);
        const endTime = new Date(event.endTime);

        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        const endMinutes = endTime.getMinutes();

        // Calculate how many hour slots this event spans
        let span = endHour - startHour;

        // If the event ends with minutes (not exactly on the hour), it takes up that hour slot too
        if (endMinutes > 0) {
            span += 1;
        }

        return Math.max(1, span);
    };

    // Check if any events start in this slot across all categories
    const hasEventsStartingInSlot = (hour: number) => {
        return EVENT_CATEGORIES.some(category =>
            getEventsStartingInSlot(hour, category.id).length > 0
        );
    };

    // Get all hours that should be displayed (either have events or are in business hours)
    const getDisplayedTimeSlots = () => {
        const displayedSlots = [];
        for (const slot of TIME_SLOTS) {
            const hasEvents = hasEventsStartingInSlot(slot.hour);
            // Show slots with events or during typical hours (6 AM - 11 PM for tech events)
            if (hasEvents || (slot.hour >= 6 && slot.hour <= 23)) {
                displayedSlots.push(slot);
            }
        }
        return displayedSlots;
    };

    const displayedSlots = getDisplayedTimeSlots();

    const handleEventClick = (event: AppEvent) => {
        setSelectedEvent(event);
        setIsPreviewVisible(false); // Close preview when opening detail panel
        onEventSelect?.(event);
    };

    // Hover preview handlers
    const handleEventHover = (event: AppEvent, mouseEvent: React.MouseEvent) => {
        const rect = mouseEvent.currentTarget.getBoundingClientRect();
        setPreviewEvent(event);
        setPreviewPosition({
            x: rect.right + 10, // Position to the right of the event card
            y: rect.top
        });
        setIsPreviewVisible(true);
    };

    const handleEventLeave = () => {
        setIsPreviewVisible(false);
        setTimeout(() => {
            if (!isPreviewVisible) {
                setPreviewEvent(null);
            }
        }, 100); // Small delay to prevent flicker
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
                        <div className="min-w-[800px] calendar-grid-container">
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
                                {displayedSlots.map(slot => {
                                    return (
                                        <div key={slot.hour} className="grid grid-cols-5 gap-0 min-h-[80px] time-slot-row">
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
                                                    <div key={category.id} className="p-2 border-l border-gray-200 bg-white relative">
                                                        <div className="space-y-2">
                                                            {slotEvents.map(event => {
                                                                const spanHours = getEventSpanHours(event);
                                                                return (
                                                                    <EventCard
                                                                        key={event.id}
                                                                        event={event}
                                                                        onClick={() => handleEventClick(event)}
                                                                        onHover={handleEventHover}
                                                                        onLeave={handleEventLeave}
                                                                        categoryColor={category.color}
                                                                        spanHours={spanHours}
                                                                        slotHeight={80}
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
                        <EventDetailPanel
                            event={selectedEvent}
                            onClose={() => setSelectedEvent(null)}
                            categories={categories}
                        />
                    )}
                </div>
            </div>

            {/* Event Preview Card for Hover */}
            {previewEvent && (
                <EventPreviewCard
                    event={previewEvent}
                    isVisible={isPreviewVisible}
                    position={previewPosition}
                    onClose={() => setIsPreviewVisible(false)}
                    onTrackingChange={(_isTracked) => {
                        // Update the event in the events array if needed
                        // This could trigger a re-render to show updated tracking status
                    }}
                />
            )}
        </div>
    );
}