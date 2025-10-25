'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { EventClickArg } from '@/types/fullcalendar';
import './mobile-calendar.css';
import { Event, EventType, AppProfile, MultiDayEventInstance } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { MaterialIcon } from '@/components/ui/Icon';
// Career impact components removed - using inline implementation
import EventPreviewCard from '../EventPreviewCard';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollCollapse } from '@/hooks/useScrollCollapse';
import { SkeletonLoader, MonthViewSkeleton } from '@/components/ui/SkeletonLoader';
import { isSameDay, getTodayDate } from '@/utils/dateUtils';
import DiscoveryCard from './discovery/DiscoveryCard';

export interface MobileCalendarMonthViewProps {
  events: Event[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event | MultiDayEventInstance) => void;
  onEventClick?: (clickInfo: EventClickArg) => void;
  onDateChange?: (date: Date) => void;
  onToggleCalendarCollapse?: () => void;
  onRefresh?: () => Promise<void>;
  isCalendarCollapsed?: boolean;
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
  onDateChange,
  onToggleCalendarCollapse: _onToggleCalendarCollapse,
  onRefresh,
  isCalendarCollapsed: propIsCalendarCollapsed = false,
  className = '',
  isIOS: _isIOS = false,
  isAndroid: _isAndroid = false,
  isLoading = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [previewEvent, _setPreviewEvent] = useState<Event | null>(null);
  const [previewPosition, _setPreviewPosition] = useState({ x: 0, y: 0 });
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [hideTimer, _setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const isCalendarCollapsed = propIsCalendarCollapsed;
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const { isCollapsed: _isCollapsed, toggleCollapse: _toggleCollapse } = useScrollCollapse(scrollContainerRef, calendarGridRef);

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

  // Get all events for the current month
  const monthEvents = useMemo(() => {
    const year = initialDate.getFullYear();
    const month = initialDate.getMonth();
    
    return events
      .filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart.getFullYear() === year && eventStart.getMonth() === month;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, initialDate]);

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
    pullToRefreshHandlers: _pullToRefreshHandlers,
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

  const _handleEventHover = useCallback((_event: Event, _mouseEvent: React.MouseEvent) => {
    // if (hideTimer) {
    //   clearTimeout(hideTimer);
    //   setHideTimer(null);
    // }

    // const rect = mouseEvent.currentTarget.getBoundingClientRect();
    // setPreviewEvent(event);
    // setPreviewPosition({ x: rect.right + 10, y: rect.top });
    // setIsPreviewVisible(true);
  }, []);

  const _handleEventLeave = useCallback(() => {
    // const timer = setTimeout(() => {
    //   setIsPreviewVisible(false);
    //   setPreviewEvent(null);
    // }, 300);
    // setHideTimer(timer);
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

  const _monthName = initialDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

      {/* Main Content Container */}
      <div className="mobile-calendar-content-container">
        {/* Calendar Grid - Collapsible */}
        <div 
          className={`mobile-calendar-grid-collapsible ${isCalendarCollapsed ? 'collapsed' : ''}`}
          ref={scrollContainerRef}
          onTouchStart={swipeHandlers.onTouchStart}
          onTouchMove={swipeHandlers.onTouchMove}
          onTouchEnd={swipeHandlers.onTouchEnd}
          style={{ '--pull-transform': pullTransform } as React.CSSProperties}
        >
          {/* Week day headers */}
          <div className="weekday-headers-modern">
            {weekDays.map(day => (
              <div key={day} className="weekday-header-modern">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="calendar-days-modern" ref={calendarGridRef}>
            {calendarGrid.map((day, index) => (
              <div
                key={index}
                className={`calendar-day-modern ${
                  !day.isCurrentMonth ? 'other-month' : ''
                } ${day.isToday ? 'today' : ''} ${
                  day.isSelected ? 'selected' : ''
                } ${day.hasEvents ? 'has-events' : ''}`}
                onClick={() => handleDateClick(day.date)}
              >
                <div className="day-number-modern">{day.dayNumber}</div>
                
                  {/* Event indicator */}
                  {day.hasEvents && (
                    <div className="event-indicator-single">
                      <div 
                        className="event-dot-single"
                        title={`${day.events.length} event${day.events.length > 1 ? 's' : ''}`}
                      />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>

        {/* Month Events Discovery - Always visible with different heights */}
        <div className={`month-events-discovery ${isCalendarCollapsed ? 'collapsed' : ''}`}>
          <div className="events-header">
            <div className="events-count">
              {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'}
            </div>
          </div>

          <div className="events-list">
            {monthEvents.length > 0 ? (
              monthEvents.map((event, index) => (
                <DiscoveryCard
                  key={`${event.id}-${index}`}
                  event={event as Event & { careerImpactLite?: CareerImpactScoreLite }}
                  onClick={() => {
                    const syntheticEvent = {
                      preventDefault: () => {},
                      stopPropagation: () => {},
                      currentTarget: null,
                      target: null
                    } as unknown as React.MouseEvent<HTMLDivElement>;
                    handleEventClick(event, syntheticEvent);
                  }}
                  showCareerImpact={true}
                  variant="compact"
                  className="mb-3"
                />
              ))
            ) : (
              <div className="no-events-selected">
                <MaterialIcon name="event_available" size={24} />
                <span>No events this month</span>
              </div>
            )}
          </div>
        </div>
      </div>

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