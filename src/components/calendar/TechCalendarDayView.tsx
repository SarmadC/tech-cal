'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Monitor, Building, Star, Calendar } from 'lucide-react';
import type { AppEvent } from '@/types';

// ==========================================================================
// 1. Child Component: The Event Card
// ==========================================================================
interface EventCardProps {
    event: AppEvent;
    style: React.CSSProperties;
    onSelect: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, style, onSelect }) => {
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return (
        <div
            className="absolute left-2 right-2 rounded-lg border cursor-pointer 
                 bg-opacity-80 backdrop-blur-sm transition-all hover:z-10 hover:shadow-lg
                 hover:scale-[1.02] group"
            style={style}
            onClick={onSelect}
        >
            <div className="p-2 h-full flex flex-col text-gray-800">
                <div className="flex items-start justify-between mb-1">
                    <span className="font-semibold text-sm truncate">
                        {event.title}
                    </span>
                    {event.isTracked && (
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-500 flex-shrink-0" />
                    )}
                </div>
                <span className="text-xs text-gray-500 truncate">
                    {event.organizer}
                </span>
                <div className="mt-auto flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatTime(event.startTime)}</span>
                    {event.location === 'virtual' && <Monitor className="w-3 h-3" />}
                    {event.location === 'in-person' && <Building className="w-3 h-3" />}
                </div>
            </div>
        </div>
    );
};

// ==========================================================================
// 2. Child Component: The Details Sidebar
// ==========================================================================
interface DetailsSidebarProps {
    selectedEvent: AppEvent | null;
}

const DetailsSidebar: React.FC<DetailsSidebarProps> = ({ selectedEvent }) => {
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    if (!selectedEvent) {
        return (
            <div className="w-96 border-l border-gray-200 bg-white flex-col hidden lg:flex"> {/* Hide on smaller screens */}
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Event Details</h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Select an event to view details</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-96 border-l border-gray-200 bg-white flex-col hidden lg:flex"> {/* Hide on smaller screens */}
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Event Details</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                    <div>
                        <h4 className="text-xl font-semibold mb-2 text-gray-900">
                            {selectedEvent.title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                {formatTime(selectedEvent.startTime)} - {selectedEvent.endTime ? formatTime(selectedEvent.endTime) : 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Organizer</label>
                            <p className="text-sm mt-1">{selectedEvent.organizer}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Location</label>
                            <p className="text-sm mt-1 flex items-center gap-2 capitalize">
                                {selectedEvent.location}
                            </p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Category</label>
                            <p className="text-sm mt-1 capitalize" style={{ color: selectedEvent.color }}>{selectedEvent.category?.name}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <button className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 text-white hover:bg-gray-700">
                            Track Event
                        </button>
                        <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-semibold rounded-lg">
                            View Website
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================================================
// 3. Main Parent Component (Simplified)
// ==========================================================================
interface TechCalendarDayViewProps {
    events: AppEvent[];
    date: Date;
    startHour?: number;
    endHour?: number;
    onPrevDay: () => void;
    onNextDay: () => void;
}

export const TechCalendarDayView: React.FC<TechCalendarDayViewProps> = ({
    events,
    date,
    startHour = 8,
    endHour = 20,
}) => {
    const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
    // The timeInterval can be a static value or passed as a prop if needed elsewhere
    const timeInterval = 30;

    const eventTracks = useMemo(() => {
        const tracksMap = new Map();
        events.forEach(event => {
            if (event.category && !tracksMap.has(event.category.id)) {
                tracksMap.set(event.category.id, {
                    id: event.category.id, name: event.category.name, color: event.category.color,
                });
            }
        });
        return Array.from(tracksMap.values());
    }, [events]);

    const timeSlots = useMemo(() => {
        const slots: Date[] = [];
        const iterator = new Date(date);
        iterator.setHours(startHour, 0, 0, 0);
        const endDateTime = new Date(date);
        endDateTime.setHours(endHour, 0, 0, 0);
        while (iterator < endDateTime) {
            slots.push(new Date(iterator));
            iterator.setMinutes(iterator.getMinutes() + timeInterval);
        }
        return slots;
    }, [timeInterval, startHour, endHour, date]);

    const eventsByTrack = useMemo(() => {
        const grouped: { [key: string]: AppEvent[] } = {};
        eventTracks.forEach(track => {
            grouped[track.id] = events.filter(event => event.category?.id === track.id);
        });
        return grouped;
    }, [events, eventTracks]);

    const getEventStyle = (event: AppEvent) => {
        const start = new Date(event.startTime);
        const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
        const eventStartHour = start.getHours() + start.getMinutes() / 60;
        const eventEndHour = end.getHours() + end.getMinutes() / 60;
        const rowHeight = 60; // Based on 30min intervals
        const top = (eventStartHour - startHour) * rowHeight;
        const height = (eventEndHour - eventStartHour) * rowHeight;
        return {
            top: `${top}px`, height: `${height}px`,
            backgroundColor: (event.color || '#cccccc') + '25',
            borderColor: event.color || '#cccccc',
            borderLeftWidth: '3px',
        };
    };

    return (
        <div className="flex h-full text-gray-800 font-sans">
            <div className="flex-1 flex flex-col">
                {/* The Header section has been completely removed from this component */}

                {/* Calendar Grid */}
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-20 border-r border-gray-200 bg-white/50 text-right">
                        {/* Time labels */}
                        {timeSlots.map((slot, index) => (
                            <div key={index} className="h-[60px] border-b border-gray-200/70 pr-2 pt-0.5">
                                {slot.getMinutes() === 0 && (
                                    <span className="text-xs text-gray-400">
                                        {slot.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 flex overflow-x-auto">
                        {/* Event Tracks and Events */}
                        {eventTracks.map(track => (
                            <div key={track.id} className="flex-1 min-w-[220px] border-r border-gray-200 relative">
                                <div className="sticky top-0 bg-white border-b border-gray-200 h-12 px-3 flex items-center z-10">
                                    <span className="font-semibold" style={{ color: track.color }}>
                                        {track.name}
                                    </span>
                                </div>
                                <div className="relative">
                                    {timeSlots.map((slot, index) => (
                                        <div key={index} className="h-[60px] border-b border-gray-200/70" />
                                    ))}
                                    {eventsByTrack[track.id]?.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            style={getEventStyle(event)}
                                            onSelect={() => setSelectedEvent(event)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <DetailsSidebar selectedEvent={selectedEvent} />
        </div>
    );
};