'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { EventClickArg } from '@fullcalendar/core';
import { Event, EventType, AppProfile, MultiDayEventInstance } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';
import EventPreviewCard from '../EventPreviewCard';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SkeletonLoader, MonthViewSkeleton } from '@/components/ui/SkeletonLoader';
import { isSameDay, getTodayDate } from '@/utils/dateUtils';

export interface MobileEnhancedMonthViewProps {
  events: Event[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event | MultiDayEventInstance) => void;
  onEventClick?: (clickInfo: EventClickArg) => void;
  onDateChange?: (date: Date) => void;
  onRefresh?: () => Promise<void>;
  className?: string;
  isIOS?: boolean;
  isAndroid?: boolean;
  isLoading?: boolean;
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: Event[];
  hasEvents: boolean;
  isWeekend: boolean;
}

const MobileEnhancedMonthView: React.FC<MobileEnhancedMonthViewProps> = ({
  events,
  initialDate,
  categories,
  profile: _profile,
  onEventSelect,
  onEventClick: _onEventClick,
  onDateChange,
  onRefresh,
  className = '',
  isIOS: _isIOS = false,
  isAndroid: _isAndroid = false,
  isLoading = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(initialDate);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthContainerRef = useRef<HTMLDivElement>(null);

  // Generate calendar grid for the month with enhanced data
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    
    // Get the first day of the calendar grid (might be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks) for a complete grid
    const days: CalendarDay[] = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(currentDate);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = isSameDay(date, getTodayDate());
      const isSelected = selectedDate ? date.toDateString() === selectedDate.toDateString() : false;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
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
        isWeekend,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, events, selectedDate]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    
    return events
      .filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart.toDateString() === selectedDate.toDateString();
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, selectedDate]);

  // Month navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setIsTransitioning(true);
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
    onDateChange?.(prevMonth);
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentMonth, onDateChange]);

  const handleNextMonth = useCallback(() => {
    setIsTransitioning(true);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
    onDateChange?.(nextMonth);
    
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentMonth, onDateChange]);

  const handleGoToToday = useCallback(() => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    onDateChange?.(today);
  }, [onDateChange]);

  // Enhanced gesture handlers
  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: handleNextMonth,
    onSwipeRight: handlePreviousMonth,
    threshold: 60,
    preventScroll: false,
    enableMomentum: true,
  });

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
    // Default refresh behavior
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, [onRefresh]);

  const {
    pullToRefreshHandlers,
    pullState,
    pullProgress: _pullProgress,
    indicatorOpacity,
    indicatorScale,
    indicatorRotation,
    pullTransform,
  } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    resistance: 2.5,
    enabled: true,
  });

  // Event handlers
  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  const handleEventClick = useCallback((event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewVisible(false);
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleEventHover = useCallback((event: Event, mouseEvent: React.MouseEvent) => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      setHideTimer(null);
    }

    const rect = mouseEvent.currentTarget.getBoundingClientRect();
    setPreviewEvent(event);
    setPreviewPosition({ x: rect.right + 10, y: rect.top });
    setIsPreviewVisible(true);
  }, [hideTimer]);

  const handleEventLeave = useCallback(() => {
    const timer = setTimeout(() => {
      setIsPreviewVisible(false);
      setPreviewEvent(null);
    }, 300);
    setHideTimer(timer);
  }, []);

  // Format time for mobile display
  const formatEventTime = useCallback((event: Event) => {
    const start = new Date(event.startTime);
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''}${ampm}`;
  }, []);

  // Get event color based on category
  const getEventColor = useCallback((event: Event) => {
    const category = categories.find(cat => cat.id === event.eventTypeId);
    return category?.color || event.color || '#3b82f6';
  }, [categories]);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Show loading state
  if (isLoading) {
    return (
      <div className={`mobile-enhanced-month-view ${className} loading`}>
        <div className="mobile-month-header">
          <SkeletonLoader className="skeleton-loader" width="200px" height="32px" />
        </div>
        <MonthViewSkeleton />
      </div>
    );
  }

  return (
    <div className={`mobile-enhanced-month-view ${className}`}>
      {/* Pull to Refresh Indicator */}
      {pullState.isPulling && (
        <div 
          className="pull-refresh-indicator"
          style={{
            opacity: indicatorOpacity,
            transform: `scale(${indicatorScale}) rotate(${indicatorRotation}deg)`,
          }}
        >
          <MaterialIcon name="refresh" size={24} />
        </div>
      )}
      
      {/* Loading Indicator */}
      {pullState.isRefreshing && (
        <div className="refresh-loading-indicator">
          <MaterialIcon name="refresh" size={20} className="spinning" />
          <span>Refreshing...</span>
        </div>
      )}

      {/* Month Header with Navigation */}
      <div className="mobile-month-header"
        {...pullToRefreshHandlers}
        style={{ transform: pullTransform }}
      >
        <div className="month-navigation">
          <button
            className="nav-button"
            onClick={handlePreviousMonth}
            disabled={isTransitioning}
            aria-label="Previous month"
          >
            <MaterialIcon name="arrow_back" size={24} />
          </button>
          
          <div className="month-title-container">
            <div className="month-title">{monthName}</div>
            <button
              className="today-button"
              onClick={handleGoToToday}
              aria-label="Go to today"
            >
              <MaterialIcon name="calendar" size={16} />
              <span>Today</span>
            </button>
          </div>
          
          <button
            className="nav-button"
            onClick={handleNextMonth}
            disabled={isTransitioning}
            aria-label="Next month"
          >
            <MaterialIcon name="chevron_right" size={24} />
          </button>
        </div>
        
        {selectedDate && (
          <button
            className="clear-selection"
            onClick={() => setSelectedDate(null)}
            aria-label="Clear selection"
          >
            <MaterialIcon name="clear" size={20} />
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div 
        className="mobile-calendar-grid"
        ref={scrollContainerRef}
        {...swipeHandlers}
        style={{ transform: pullTransform }}
      >
        {/* Week day headers */}
        <div className="weekday-headers">
          {weekDays.map(day => (
            <div key={day} className="weekday-header">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div 
          className={`calendar-days ${isTransitioning ? 'transitioning' : ''}`}
          ref={monthContainerRef}
        >
          {calendarGrid.map((day, index) => (
            <div
              key={index}
              className={`calendar-day ${
                !day.isCurrentMonth ? 'other-month' : ''
              } ${day.isToday ? 'today' : ''} ${
                day.isSelected ? 'selected' : ''
              } ${day.hasEvents ? 'has-events' : ''} ${
                day.isWeekend ? 'weekend' : ''
              }`}
              onClick={() => handleDateClick(day.date)}
              role="button"
              tabIndex={0}
              aria-label={`${day.date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}${day.hasEvents ? `, ${day.events.length} events` : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDateClick(day.date);
                }
              }}
            >
              <div className="day-number">{day.dayNumber}</div>
              
              {/* Event indicators */}
              {day.hasEvents && (
                <div className="event-indicators">
                  {day.events.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={`${event.id}-${eventIndex}`}
                      className="event-dot"
                      style={{
                        backgroundColor: getEventColor(event),
                      }}
                      title={event.title}
                    />
                  ))}
                  {day.events.length > 3 && (
                    <div className="more-events">+{day.events.length - 3}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="selected-date-events">
          <div className="events-header">
            <div className="selected-date">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="events-count">
              {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}
            </div>
          </div>

          <div className="events-list">
            {selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="mobile-month-event"
                  onClick={(e) => handleEventClick(event, e)}
                  onMouseEnter={(e) => handleEventHover(event, e)}
                  onMouseLeave={handleEventLeave}
                  style={{
                    borderLeftColor: getEventColor(event),
                  }}
                >
                  <div className="event-time">
                    {formatEventTime(event)}
                  </div>
                  <div className="event-content">
                    <div className="event-title">{event.title}</div>
                    {event.location && (
                      <div className="event-location">
                        <MaterialIcon name="location" size={12} />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.organizer && (
                      <div className="event-organizer">
                        <MaterialIcon name="person" size={12} />
                        <span>{event.organizer}</span>
                      </div>
                    )}
                  </div>
                  <div className="event-chevron">
                    <MaterialIcon name="chevron_right" size={16} />
                  </div>
                </div>
              ))
            ) : (
              <div className="no-events-selected">
                <MaterialIcon name="event_available" size={24} />
                <span>No events on this day</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Preview */}
      {previewEvent && (
        <EventPreviewCard
          event={previewEvent}
          isVisible={isPreviewVisible}
          position={previewPosition}
          onClose={() => setIsPreviewVisible(false)}
        />
      )}
    </div>
  );
};

export default MobileEnhancedMonthView;