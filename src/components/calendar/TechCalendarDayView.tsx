// src/components/calendar/TechCalendarDayView.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Clock, Monitor, Building, Star, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AppEvent } from '@/types';

export interface TechCalendarDayViewProps {
    events: AppEvent[];
    initialDate: Date;
    onDateChange?: (date: Date) => void;
    onEventSelect?: (event: AppEvent) => void;
    className?: string;
}

interface EventCardProps {
    event: AppEvent;
    style: React.CSSProperties;
    onSelect: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, style, onSelect }) => {
    const formatTime = (dateString: string): string => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const isLive = (): boolean => {
        const now = new Date();
        const start = new Date(event.startTime);
        const end = event.endTime ? new Date(event.endTime) : null;
        return start <= now && (!end || now <= end);
    };

    const getEventStyle = () => {
        const baseStyle = {
            backgroundColor: event.color || '#3b82f6',
            borderColor: event.color || '#3b82f6',
            ...style
        };

        if (isLive()) {
            return {
                ...baseStyle,
                boxShadow: `0 0 20px ${event.color || '#3b82f6'}40`,
                animation: 'pulse 2s infinite'
            };
        }

        return baseStyle;
    };

    return (
        <div
            className="absolute left-2 right-2 rounded-lg border border-l-4 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer"
            style={getEventStyle()}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                            {event.title}
                        </span>
                        {isLive() && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                                LIVE
                            </Badge>
                        )}
                        {event.isTracked && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(event.startTime)}</span>
                        </div>

                        {event.organizer && (
                            <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                <span className="truncate">{event.organizer}</span>
                            </div>
                        )}

                        {event.location?.toLowerCase().includes('virtual') && (
                            <div className="flex items-center gap-1">
                                <Monitor className="h-3 w-3" />
                                <span>Virtual</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export function TechCalendarDayView({
    events,
    initialDate,
    onDateChange,
    onEventSelect,
    className = ''
}: TechCalendarDayViewProps) {
    const [currentDate, setCurrentDate] = useState<Date>(initialDate);


    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (direction === 'prev') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setDate(newDate.getDate() + 1);
        }
        setCurrentDate(newDate);
        onDateChange?.(newDate);
    }, [currentDate, onDateChange]);

    const handleToday = useCallback(() => {
        const today = new Date();
        setCurrentDate(today);
        onDateChange?.(today);
    }, [onDateChange]);

    // Filter and sort events for the current day
    const dayEvents = useMemo(() => {
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        return events
            .filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart >= dayStart && eventStart <= dayEnd;
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, currentDate]);

    // Generate time slots and position events
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let hour = 0; hour < 24; hour++) {
            slots.push({
                hour,
                label: hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`,
                events: dayEvents.filter(event => {
                    const eventHour = new Date(event.startTime).getHours();
                    return eventHour === hour;
                })
            });
        }
        return slots;
    }, [dayEvents]);

    const formatDateDisplay = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className={`flex flex-col h-full bg-white ${className}`}>
            {/* Day View Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigate('prev')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToday}
                    >
                        Today
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleNavigate('next')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <h2 className="text-lg font-semibold text-gray-900">
                    {formatDateDisplay(currentDate)}
                </h2>

                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        {dayEvents.length} events
                    </span>
                </div>
            </div>

            {/* Time Grid */}
            <div className="flex-1 overflow-auto">
                <div className="relative">
                    {timeSlots.map(slot => (
                        <div
                            key={slot.hour}
                            className="relative border-b border-gray-100"
                            style={{ height: '60px' }}
                        >
                            {/* Time Label */}
                            <div className="absolute left-0 top-0 w-16 p-2 text-xs text-gray-500 font-medium">
                                {slot.label}
                            </div>

                            {/* Events for this hour */}
                            <div className="ml-16 relative h-full">
                                {slot.events.map((event, index) => {
                                    const eventStart = new Date(event.startTime);
                                    const minutes = eventStart.getMinutes();
                                    const topOffset = (minutes / 60) * 60; // Position based on minutes

                                    return (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            style={{
                                                top: `${topOffset}px`,
                                                height: '50px',
                                                zIndex: 10 + index
                                            }}
                                            onSelect={() => onEventSelect?.(event)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {dayEvents.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No events today</p>
                        <p className="text-sm">Enjoy your free day!</p>
                    </div>
                </div>
            )}
        </div>
    );
}