'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { EventClickArg } from '@/types/fullcalendar';
import { FullCalendar } from '@/types/fullcalendar';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventPreviewCard from './EventPreviewCard';
import { MonthEventCard } from './MonthEventCard';
import '@/app/styles/event-card.css';
import '@/app/styles/monthly-view.css';

export interface TechCalendarMonthViewProps {
    events: (Event | MultiDayEvent)[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event | MultiDayEventInstance) => void;
    onEventClick?: (clickInfo: EventClickArg) => void;
    calendarRef?: React.RefObject<FullCalendar | null>;
    className?: string;
}

const TechCalendarMonthView: React.FC<TechCalendarMonthViewProps> = ({
    events,
    initialDate,
    categories: _categories,
    profile: _profile,
    onEventSelect,
    onEventClick: _onEventClick,
    calendarRef,
    className = '',
}) => {
    const internalCalendarRef = React.useRef<FullCalendar | null>(null);
    const _activeCalendarRef = calendarRef || internalCalendarRef;
    const [_isMobile, setIsMobile] = useState(false);
    const { hidePreview, previewState, showPreview, cancelHide } = useEventPreview();

    // Event click handler
    const handleEventClick = useCallback((event: Event | MultiDayEventInstance) => {
        onEventSelect?.(event);
    }, [onEventSelect]);

    // Event hover handler
    const handleEventHover = useCallback((event: Event | MultiDayEventInstance, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.top
        };
        showPreview(event as Event, position);
    }, [showPreview]);

    // Memoize the card style to prevent new object creation on every render
    const cardStyle = useMemo(() => ({
        height: 'auto',
        minHeight: '24px',
        fontSize: '0.75rem'
    }), []);

    // Custom month grid component for individual day instances
    const CustomMonthGrid: React.FC = () => {
        const monthStart = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
        const _monthEnd = new Date(initialDate.getFullYear(), initialDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
        
        const days = [];
        const currentDate = new Date(startDate);
        
        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            days.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Group events by date
        const eventsByDate = useMemo(() => {
            const grouped = new Map<string, (Event | MultiDayEventInstance)[]>();
            
            processedEvents.forEach(event => {
                let eventDate: Date;
                
                if ('isInstance' in event && event.isInstance) {
                    // For multi-day instances, use the instance date
                    const [year, month, day] = event.instanceDate.split('-').map(Number);
                    eventDate = new Date(year, month - 1, day);
                } else {
                    // For regular events, use the start time
                    eventDate = new Date(event.startTime);
                }
                
                const dateKey = eventDate.toISOString().split('T')[0];
                if (!grouped.has(dateKey)) {
                    grouped.set(dateKey, []);
                }
                grouped.get(dateKey)!.push(event);
            });
            
            return grouped;
        }, [events]);
        
        return (
            <div className="custom-month-grid">
                {/* Header */}
                <div className="month-grid-header">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <div 
                            key={day} 
                            className={`month-grid-day-header ${index === 0 || index === 6 ? 'weekend' : ''}`}
                        >
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Days grid */}
                <div className="month-grid-days">
                    {days.map((day, index) => {
                        const dateKey = day.toISOString().split('T')[0];
                        const dayEvents = eventsByDate.get(dateKey) || [];
                        const isCurrentMonth = day.getMonth() === initialDate.getMonth();
                        const isToday = day.toDateString() === new Date().toDateString();
                        
                        return (
                            <div 
                                key={index} 
                                className={`month-grid-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}`}
                            >
                                <div className="month-grid-day-number">
                                    {day.getDate()}
                                </div>
                                
                                {/* Events for this day */}
                                <div className="month-grid-day-events">
                                    {dayEvents.map((event, eventIndex) => (
                                        <div key={`${event.id}-${eventIndex}`} className="month-grid-event">
                                            <MonthEventCard
                                                event={event}
                                                onClick={() => handleEventClick(event)}
                                                onHover={(e) => handleEventHover(event, e)}
                                                onLeave={hidePreview}
                                                style={cardStyle}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Process events for multi-day support - create individual day instances
    const processedEvents = useMemo(() => {
        const processed: (Event | MultiDayEventInstance)[] = [];
        
        events.forEach(event => {
            // Check if this is a multi-day event (spans more than 1 day)
            const startDate = new Date(event.startTime);
            const endDate = event.endTime ? new Date(event.endTime) : new Date(event.startTime);
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 0) {
                // Create individual day instances for multi-day events
                for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset++) {
                    const dayDate = new Date(startDate);
                    dayDate.setDate(startDate.getDate() + dayOffset);
                    
                    const year = dayDate.getFullYear();
                    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
                    const day = String(dayDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    
                    // Create day instance
                    const dayInstance: MultiDayEventInstance = {
                        ...event,
                        id: `${event.id}-day-${dayOffset + 1}`,
                        startTime: `${dateStr}T00:00:00`,
                        endTime: `${dateStr}T23:59:59`,
                        isInstance: true,
                        originalEventId: event.id,
                        instanceDate: dateStr,
                        dayInfo: {
                            currentDay: dayOffset + 1,
                            totalDays: daysDiff + 1,
                            isFirstDay: dayOffset === 0,
                            isLastDay: dayOffset === daysDiff,
                            continuationType: dayOffset === 0 ? 'start' : 
                                            dayOffset === daysDiff ? 'end' : 'middle'
                        }
                    };
                    
                    processed.push(dayInstance);
                }
            } else {
                // Single-day event - add as is
                processed.push(event);
            }
        });
        
        return processed;
    }, [events]);

    // Mobile detection
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className={`tech-calendar-month-view ${className}`}>
            <CustomMonthGrid />

            {/* Event Preview Card */}
            {previewState.event && (
                <EventPreviewCard
                    event={previewState.event}
                    isVisible={previewState.isVisible}
                    position={previewState.position}
                    onClose={hidePreview}
                    onHover={cancelHide}
                    onLeave={hidePreview}
                />
            )}
        </div>
    );
};

export default TechCalendarMonthView;
