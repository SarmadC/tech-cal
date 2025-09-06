'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';
import EventPreviewCard from '../EventPreviewCard';
import { getWeekDays } from '@/utils/eventViewUtils';
import { processEventsForWeekView } from '@/utils/multiDayEventUtils';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { EventCardSkeleton, WeekHeaderSkeleton } from '@/components/ui/SkeletonLoader';

export interface MobileCalendarWeekViewProps {
  events: (Event | MultiDayEvent)[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: MultiDayEventInstance | Event) => void;
  onRefresh?: () => Promise<void>;
  className?: string;
  isIOS?: boolean;
  isAndroid?: boolean;
  isLoading?: boolean;
}

const MobileCalendarWeekView: React.FC<MobileCalendarWeekViewProps> = ({
  events,
  initialDate,
  categories: _categories,
  profile: _profile,
  onEventSelect,
  onRefresh,
  className = '',
  isIOS: _isIOS = false,
  isAndroid: _isAndroid = false,
  isLoading = false,
}) => {
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get week days
  const weekDays = useMemo(() => {
    return getWeekDays(initialDate);
  }, [initialDate]);

  // Time configuration for mobile
  const START_HOUR = 6;
  const END_HOUR = 23;

  // Generate simplified time slots for mobile
  const _timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      const time24 = `${hour.toString().padStart(2, '0')}:00`;
      const time12 = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
      slots.push({
        hour,
        time24,
        time12: time12.replace(':00', ''),
      });
    }
    return slots;
  }, []);

  // Process events for the week
  const processedEvents = useMemo(() => {
    const processed = processEventsForWeekView(events);
    
    // Filter for current week
    const weekStart = new Date(weekDays[0]);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekDays[6]);
    weekEnd.setHours(23, 59, 59, 999);

    return processed.filter(event => {
      const eventStart = new Date(event.startTime);
      return eventStart >= weekStart && eventStart <= weekEnd;
    });
  }, [events, weekDays]);

  // Group events by day for mobile view
  const eventsByDay = useMemo(() => {
    const grouped = new Map<number, (Event | MultiDayEventInstance)[]>();

    weekDays.forEach((day, dayIndex) => {
      const dayEvents = processedEvents.filter(event => {
        if ('isInstance' in event && event.isInstance) {
          const instance = event as MultiDayEventInstance;
          const [year, month, dayNum] = instance.instanceDate.split('-').map(Number);
          const instanceDate = new Date(year, month - 1, dayNum);
          return instanceDate.toDateString() === day.toDateString();
        }

        const eventStart = new Date(event.startTime);
        return eventStart.toDateString() === day.toDateString();
      });

      // Sort events by start time
      dayEvents.sort((a, b) => {
        const startA = new Date(a.startTime).getTime();
        const startB = new Date(b.startTime).getTime();
        return startA - startB;
      });

      grouped.set(dayIndex, dayEvents);
    });

    return grouped;
  }, [processedEvents, weekDays]);

  // Enhanced swipe gestures with smooth animations
  const handleDayChange = useCallback((direction: 'left' | 'right') => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    if (direction === 'left' && currentDayIndex < 6) {
      setCurrentDayIndex(prev => prev + 1);
    } else if (direction === 'right' && currentDayIndex > 0) {
      setCurrentDayIndex(prev => prev - 1);
    }
    
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentDayIndex, isTransitioning]);

  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: () => handleDayChange('left'),
    onSwipeRight: () => handleDayChange('right'),
    threshold: 60,
    preventScroll: false,
    enableMomentum: true,
  });

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
    // Default refresh behavior - could reload events
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
  const handleEventClick = useCallback((event: Event | MultiDayEventInstance) => {
    setIsPreviewVisible(false);
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleEventHover = useCallback((event: Event | MultiDayEventInstance, mouseEvent: React.MouseEvent) => {
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

  // Format event time for mobile display
  const formatEventTime = useCallback((event: Event | MultiDayEventInstance) => {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : null;
    
    const formatTime = (date: Date) => {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}${minutes > 0 ? ':' + minutes.toString().padStart(2, '0') : ''}${ampm}`;
    };
    
    if (end && end.getTime() !== start.getTime()) {
      return `${formatTime(start)} - ${formatTime(end)}`;
    }
    
    return formatTime(start);
  }, []);

  const currentDay = weekDays[currentDayIndex];
  const currentDayEvents = eventsByDay.get(currentDayIndex) || [];

  // Show loading state
  if (isLoading) {
    return (
      <div className={`mobile-calendar-week-view ${className} loading`}>
        <WeekHeaderSkeleton />
        <div className="mobile-day-content">
          <EventCardSkeleton count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className={`mobile-calendar-week-view ${className}`}>
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

      {/* Week Navigation Header */}
      <div className="mobile-week-header"
        {...pullToRefreshHandlers}
        style={{ transform: pullTransform }}
      >
        <div className="week-nav-container">
          <button
            onClick={() => setCurrentDayIndex(Math.max(0, currentDayIndex - 1))}
            disabled={currentDayIndex === 0}
            className="nav-button"
          >
            <MaterialIcon name="arrow_back" size={20} />
          </button>
          
          <div className="current-day-info">
            <div className="day-name">{currentDay.toLocaleDateString('en-US', { weekday: 'long' })}</div>
            <div className="day-date">{currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
          </div>
          
          <button
            onClick={() => setCurrentDayIndex(Math.min(6, currentDayIndex + 1))}
            disabled={currentDayIndex === 6}
            className="nav-button"
          >
            <MaterialIcon name="arrow-forward" size={20} />
          </button>
        </div>
        
        {/* Week dots indicator */}
        <div className="week-dots">
          {weekDays.map((_, index) => (
            <button
              key={index}
              className={`dot ${index === currentDayIndex ? 'active' : ''}`}
              onClick={() => setCurrentDayIndex(index)}
            />
          ))}
        </div>
      </div>

      {/* Day Content */}
      <div 
        className={`mobile-day-content ${isTransitioning ? 'transitioning' : ''}`}
        ref={scrollContainerRef}
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
        style={{
          transform: pullTransform,
          transition: isTransitioning ? 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
        }}
      >
        {currentDayEvents.length > 0 ? (
          <div className="events-timeline">
            {currentDayEvents.map((event, index) => (
              <div 
                key={`${event.id}-${index}`}
                className="mobile-event-card"
                onClick={() => handleEventClick(event)}
                onMouseEnter={(e) => handleEventHover(event, e)}
                onMouseLeave={handleEventLeave}
                style={{
                  borderLeftColor: event.color || '#3b82f6',
                }}
              >
                <div className="event-time">
                  {formatEventTime(event)}
                </div>
                <div className="event-content">
                  <div className="event-title">{event.title}</div>
                  {event.description && (
                    <div className="event-description">
                      {event.description.length > 60 
                        ? `${event.description.substring(0, 60)}...` 
                        : event.description}
                    </div>
                  )}
                  {event.location && (
                    <div className="event-location">
                      <MaterialIcon name="location" size={14} />
                      {event.location}
                    </div>
                  )}
                </div>
                <div className="event-chevron">
                  <MaterialIcon name="chevron_right" size={16} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-events">
            <MaterialIcon name="event_available" size={48} />
            <div className="no-events-text">No events scheduled</div>
            <div className="no-events-subtext">Enjoy your free time!</div>
          </div>
        )}
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

export default MobileCalendarWeekView;