'use client';

import React, { useMemo } from 'react';
import './mobile-calendar.css';
import { Event, EventType } from '@/types';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { isSameDay, getTodayDate } from '@/utils/dateUtils';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export interface MobileCollapsibleCalendarProps {
    events: Event[];
    currentDate: Date;
    categories: EventType[];
    selectedDate?: Date | null;
    isCalendarCollapsed?: boolean;
    onDateClick?: (date: Date) => void;
    onDateChange?: (date: Date) => void;
    className?: string;
}

const MobileCollapsibleCalendar: React.FC<MobileCollapsibleCalendarProps> = ({
    events,
    currentDate,
    categories,
    selectedDate = null,
    isCalendarCollapsed = false,
    onDateClick,
    onDateChange,
    className = ''
}) => {

    // Generate calendar grid for the month
    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Get first day of the month and last day
        const firstDay = new Date(year, month, 1);
        const _lastDay = new Date(year, month + 1, 0);

        // Get the first day of the calendar grid (might be from previous month)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate 42 days (6 weeks)
        const days = [];
        const currentDateObj = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            const date = new Date(currentDateObj);
            const isCurrentMonth = date.getMonth() === month;
            const isToday = isSameDay(date, getTodayDate());
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

            // Get events for this day
            const dayEvents = events.filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart.toDateString() === date.toDateString();
            });

            days.push({
                date: date,
                dayNumber: date.getDate(),
                isCurrentMonth,
                isToday,
                isSelected,
                events: dayEvents,
                hasEvents: dayEvents.length > 0,
            });

            currentDateObj.setDate(currentDateObj.getDate() + 1);
        }

        return days;
    }, [currentDate, events, selectedDate]);

    // Navigation handlers
    const handlePreviousMonth = () => {
        const prevMonth = new Date(currentDate);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        onDateChange?.(prevMonth);
    };

    const handleNextMonth = () => {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        onDateChange?.(nextMonth);
    };

    // Enhanced gesture handlers
    const { swipeHandlers } = useSwipeGestures({
        onSwipeLeft: () => {
            handleNextMonth();
        },
        onSwipeRight: () => {
            handlePreviousMonth();
        },
        threshold: 60,
        preventScroll: false,
        enableMomentum: true,
    });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Format month and year for display
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const year = currentDate.getFullYear();

    return (
        <div className={`mobile-collapsible-calendar ${className}`}>
            {/* Calendar Grid - Collapsible */}
            <div
                className={`mobile-calendar-grid-collapsible ${isCalendarCollapsed ? 'collapsed' : ''}`}
                onTouchStart={swipeHandlers.onTouchStart}
                onTouchMove={swipeHandlers.onTouchMove}
                onTouchEnd={swipeHandlers.onTouchEnd}
            >
                {/* Month Navigation */}
                <div className="month-navigation-modern">
                    <button
                        className="nav-button-modern"
                        onClick={handlePreviousMonth}
                        aria-label="Previous month"
                    >
                        <CaretLeft size={16} />
                    </button>
                    
                    <div className="month-title-modern">
                        <span className="month-name">{monthName} {year}</span>
                    </div>
                    
                    <button
                        className="nav-button-modern"
                        onClick={handleNextMonth}
                        aria-label="Next month"
                    >
                        <CaretRight size={16} />
                    </button>
                </div>

                {/* Week day headers */}
                <div className="weekday-headers-modern">
                    {weekDays.map(day => (
                        <div key={day} className="weekday-header-modern">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar days */}
                <div className="calendar-days-modern">
                    {calendarGrid.map((day, index) => (
                        <div
                            key={index}
                            className={`calendar-day-modern ${!day.isCurrentMonth ? 'other-month' : ''
                                } ${day.isToday ? 'today' : ''} ${day.isSelected ? 'selected' : ''
                                } ${day.hasEvents ? 'has-events' : ''}`}
                            onClick={() => onDateClick?.(day.date)}
                        >
                            <div className="day-number-modern">{day.dayNumber}</div>

                            {/* Event indicator - Multiple color-coded dots */}
                            {day.hasEvents && (
                                <div className="event-indicator-multiple">
                                    {day.events.slice(0, 3).map((event, eventIndex) => {
                                        // Get category color for this event
                                        const category = categories.find(cat => cat.id === event.eventTypeId);
                                        const eventColor = category?.color || '#f59e0b';
                                        
                                        return (
                                            <div
                                                key={`${event.id}-${eventIndex}`}
                                                className="event-dot-multiple"
                                                style={{
                                                    '--event-color': eventColor,
                                                } as React.CSSProperties}
                                                title={`${event.title}${category ? ` - ${category.name}` : ''}`}
                                            />
                                        );
                                    })}
                                    {day.events.length > 3 && (
                                        <div 
                                            className="event-count-badge" 
                                            title={`${day.events.length} total events`}
                                        >
                                            +{day.events.length - 3}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MobileCollapsibleCalendar;

