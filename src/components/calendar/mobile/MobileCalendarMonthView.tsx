'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { EventClickArg } from '@/types/fullcalendar';
import './mobile-calendar.css';
import { Event, EventType, AppProfile, MultiDayEventInstance } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { MaterialIcon } from '@/components/ui/Icon';
import { CareerImpactIndicator } from '@/components/ui/career-impact-tooltip';
import EventPreviewCard from '../EventPreviewCard';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SkeletonLoader, MonthViewSkeleton } from '@/components/ui/SkeletonLoader';
import { isSameDay, getTodayDate } from '@/utils/dateUtils';

export interface MobileCalendarMonthViewProps {
  events: Event[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event | MultiDayEventInstance) => void;
  onEventClick?: (clickInfo: EventClickArg) => void;
  onRefresh?: () => Promise<void>;
  className?: string;
  isIOS?: boolean;
  isAndroid?: boolean;
  isLoading?: boolean;
}

const MobileCalendarMonthView: React.FC<MobileCalendarMonthViewProps> = ({
  events,
  initialDate,
  categories: _categories,
  profile: _profile,
  onEventSelect,
  onEventClick: _onEventClick,
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
  const [_isTransitioning, _setIsTransitioning] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Generate calendar grid for the month
  const calendarGrid = useMemo(() => {
    const year = initialDate.getFullYear();
    const month = initialDate.getMonth();
    
    // Get first day of the month and last day
    const firstDay = new Date(year, month, 1);
    const _lastDay = new Date(year, month + 1, 0);
    
    // Get the first day of the calendar grid (might be from previous month)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks)
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(currentDate);
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
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [initialDate, events, selectedDate]);

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

  // Enhanced gesture handlers
  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: () => {
      // Could navigate to next month if needed
    },
    onSwipeRight: () => {
      // Could navigate to previous month if needed
    },
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
  }, []);

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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [hideTimer]);

  // Format time for mobile display
  const formatEventTime = useCallback((event: Event) => {
    const start = new Date(event.startTime);
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''}${ampm}`;
  }, []);

  const monthName = initialDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Show loading state
  if (isLoading) {
    return (
      <div className={`mobile-calendar-month-view ${className} loading`}>
        <div className="mobile-month-header">
          <SkeletonLoader className="skeleton-loader" width="200px" height="32px" />
        </div>
        <MonthViewSkeleton />
      </div>
    );
  }

  return (
    <div className={`mobile-calendar-month-view ${className}`}>
      {/* Pull to Refresh Indicator */}
      {pullState.isPulling && (
        <div 
          className="pull-refresh-indicator mobile-pull-indicator"
          style={{
            '--indicator-opacity': indicatorOpacity,
            '--indicator-transform': `scale(${indicatorScale}) rotate(${indicatorRotation}deg)`,
          } as React.CSSProperties}
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
      {/* Month Header */}
      <div className="mobile-month-header mobile-pull-transform"
        {...pullToRefreshHandlers}
        style={{ '--pull-transform': pullTransform } as React.CSSProperties}
      >
        <div className="month-title">{monthName}</div>
        {selectedDate && (
          <button
            className="clear-selection"
            onClick={() => setSelectedDate(null)}
          >
            <MaterialIcon name="clear" size={20} />
          </button>
        )}
      </div>

      {/* Calendar Grid */}
      <div 
        className="mobile-calendar-grid mobile-pull-transform"
        ref={scrollContainerRef}
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
        style={{ '--pull-transform': pullTransform } as React.CSSProperties}
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
        <div className="calendar-days">
          {calendarGrid.map((day, index) => (
            <div
              key={index}
              className={`calendar-day ${
                !day.isCurrentMonth ? 'other-month' : ''
              } ${day.isToday ? 'today' : ''} ${
                day.isSelected ? 'selected' : ''
              } ${day.hasEvents ? 'has-events' : ''}`}
              onClick={() => handleDateClick(day.date)}
            >
              <div className="day-number">{day.dayNumber}</div>
              
              {/* Event indicators */}
              {day.hasEvents && (
                <div className="event-indicators">
                  {day.events.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={`${event.id}-${eventIndex}`}
                      className="event-dot mobile-event-dot"
                      style={{
                        '--event-color': event.color || 'var(--accent-primary)',
                      } as React.CSSProperties}
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
                  className="mobile-month-event mobile-event-border"
                  onClick={(e) => handleEventClick(event, e)}
                  onMouseEnter={(e) => handleEventHover(event, e)}
                  onMouseLeave={handleEventLeave}
                  style={{
                    '--event-color': event.color || 'var(--accent-primary)',
                  } as React.CSSProperties}
                >
                  <div className="event-time">
                    {formatEventTime(event)}
                  </div>
                  <div className="event-content">
                    <div className="flex items-center justify-between">
                      <div className="event-title flex-1">{event.title}</div>
                      {/* Career Impact Indicator for mobile month view */}
                      {(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite && (
                        <CareerImpactIndicator 
                          score={(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall}
                          size="sm"
                          showValue={false}
                          className="flex-shrink-0 ml-2"
                        />
                      )}
                    </div>
                    {event.location && (
                      <div className="event-location">
                        <MaterialIcon name="location" size={12} />
                        <span>{event.location}</span>
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

export default MobileCalendarMonthView;