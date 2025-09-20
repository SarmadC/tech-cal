'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Event, EventType, AppProfile, MultiDayEventInstance } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { MaterialIcon } from '@/components/ui/Icon';
import { CareerImpactIndicator } from '@/components/ui/career-impact-tooltip';
import EventPreviewCard from '../EventPreviewCard';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SkeletonLoader, DayViewSkeleton } from '@/components/ui/SkeletonLoader';
import { isSameDay, getTodayDate } from '@/utils/dateUtils';

export interface MobileCalendarDayViewProps {
  events: Event[];
  initialDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event | MultiDayEventInstance) => void;
  onRefresh?: () => Promise<void>;
  className?: string;
  isIOS?: boolean;
  isAndroid?: boolean;
  isLoading?: boolean;
}

const MobileCalendarDayView: React.FC<MobileCalendarDayViewProps> = ({
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
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [_isTransitioning, _setIsTransitioning] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter events for the current day
  const dayEvents = useMemo(() => {
    const dayStart = new Date(initialDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(initialDate);
    dayEnd.setHours(23, 59, 59, 999);

    return events
      .filter(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;
        return eventStart <= dayEnd && eventEnd >= dayStart;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, initialDate]);

  // Generate timeline slots with events
  const timelineSlots = useMemo(() => {
    const slots = [];
    const START_HOUR = 6;
    const END_HOUR = 23;
    
    // Create hourly slots
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      const slotTime = new Date(initialDate);
      slotTime.setHours(hour, 0, 0, 0);
      
      const nextSlotTime = new Date(initialDate);
      nextSlotTime.setHours(hour + 1, 0, 0, 0);
      
      // Find events that fall within this hour slot
      const slotEvents = dayEvents.filter(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;
        
        // Event starts in this slot or overlaps with this slot
        return (eventStart >= slotTime && eventStart < nextSlotTime) ||
               (eventStart < slotTime && eventEnd > slotTime);
      });
      
      slots.push({
        hour,
        time: slotTime,
        displayTime: hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`,
        events: slotEvents,
        hasEvents: slotEvents.length > 0,
      });
    }
    
    return slots;
  }, [dayEvents, initialDate]);

  // Enhanced swipe gestures
  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: () => {
      // Could navigate to next day if needed
    },
    onSwipeRight: () => {
      // Could navigate to previous day if needed
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
  const handleEventClick = useCallback((event: Event) => {
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

  // Format event duration
  const getEventDuration = useCallback((event: Event) => {
    if (!event.endTime) return null;
    
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }, []);

  // Format event time range
  const formatEventTime = useCallback((event: Event) => {
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

  // Show loading state
  if (isLoading) {
    return (
      <div className={`mobile-calendar-day-view ${className} loading`}>
        <div className="mobile-day-header">
          <SkeletonLoader className="skeleton-loader" width="200px" height="32px" />
          <SkeletonLoader className="skeleton-loader" width="80px" height="20px" />
        </div>
        <DayViewSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className={`mobile-calendar-day-view ${className}`}>
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
      {/* Day Header */}
      <div className="mobile-day-header mobile-pull-transform"
        {...pullToRefreshHandlers}
        style={{ '--pull-transform': pullTransform } as React.CSSProperties}
      >
        <div className="day-title">
          <div className="day-name">
            {initialDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className="day-date">
            {initialDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric',
              year: 'numeric' 
            })}
          </div>
        </div>
        <div className="day-stats">
          <div className="event-count">
            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div 
        className="mobile-timeline-container mobile-pull-transform"
        ref={scrollContainerRef}
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
        style={{ '--pull-transform': pullTransform } as React.CSSProperties}
      >
        {dayEvents.length > 0 ? (
          <div className="timeline">
            {timelineSlots.map((slot) => (
              <div key={slot.hour} className={`timeline-slot ${slot.hasEvents ? 'has-events' : ''}`}>
                <div className="timeline-time">
                  <div className="time-indicator">
                    <div className="time-dot" />
                    <div className="time-text">{slot.displayTime}</div>
                  </div>
                  <div className="time-line" />
                </div>
                
                <div className="timeline-content">
                  {slot.events.map((event, index) => {
                    const duration = getEventDuration(event);
                    
                    return (
                      <div
                        key={`${event.id}-${index}`}
                        className="mobile-timeline-event mobile-event-border"
                        onClick={() => handleEventClick(event)}
                        onMouseEnter={(e) => handleEventHover(event, e)}
                        onMouseLeave={handleEventLeave}
                        style={{
                          '--event-color': event.color || 'var(--accent-primary)',
                        } as React.CSSProperties}
                      >
                        <div className="event-header">
                          <div className="flex items-center justify-between">
                            <div className="event-title flex-1">{event.title}</div>
                            {/* Career Impact Indicator for mobile day timeline */}
                            {(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite && (
                              <CareerImpactIndicator 
                                score={(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall}
                                size="sm"
                                showValue={false}
                                className="flex-shrink-0 ml-2"
                              />
                            )}
                          </div>
                          <div className="event-time-info">
                            <div className="event-time">{formatEventTime(event)}</div>
                            {duration && <div className="event-duration">({duration})</div>}
                          </div>
                        </div>
                        
                        {event.description && (
                          <div className="event-description">
                            {event.description.length > 80 
                              ? `${event.description.substring(0, 80)}...` 
                              : event.description}
                          </div>
                        )}
                        
                        <div className="event-details">
                          {event.location && (
                            <div className="event-location">
                              <MaterialIcon name="location" size={14} />
                              <span>{event.location}</span>
                            </div>
                          )}
                          
                          {event.category && (
                            <div className="event-category">
                              <MaterialIcon name="label" size={14} />
                              <span>{event.category.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-events">
            <MaterialIcon name="event_available" size={64} />
            <div className="no-events-text">No events today</div>
            <div className="no-events-subtext">
              {isSameDay(initialDate, getTodayDate())
                ? "Enjoy your free day!" 
                : "Nothing scheduled for this day"}
            </div>
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

export default MobileCalendarDayView;