'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Event, EventType, AppProfile } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { MaterialIcon } from '@/components/ui/Icon';
// Career impact components removed - using inline implementation
import MobileEventPreview from './MobileEventPreview';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

export interface MobileMultiDayCalendarViewProps {
  events: Event[];
  currentDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event) => void;
  onDateChange?: (date: Date) => void;
  className?: string;
}

const MobileMultiDayCalendarView: React.FC<MobileMultiDayCalendarViewProps> = ({
  events,
  currentDate,
  categories: _categories,
  profile: _profile,
  onEventSelect: _onEventSelect,
  onDateChange,
  className = ''
}) => {
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Generate array of days to display (current week)
  const displayDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const currentDay = startOfWeek.getDay(); // 0 = Sunday
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Adjust to make Monday the first day
    startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);

    // Generate 7 days starting from Monday
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentDate]);

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

  // Format month names for navigation
  const getMonthNames = () => {
    const current = currentDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    const prev = new Date(currentDate);
    prev.setMonth(prev.getMonth() - 1);
    const prevName = prev.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + 1);
    const nextName = next.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    return { prev: prevName, current, next: nextName };
  };

  const monthNames = getMonthNames();

  // Event preview handlers
  const handleEventTap = (event: Event) => {
    setPreviewEvent(event);
    setIsPreviewVisible(true);
  };

  const handleClosePreview = () => {
    setIsPreviewVisible(false);
    setPreviewEvent(null);
  };

  const handleTrackEvent = (_event: Event) => {
    // Event tracking is handled by the MobileEventPreview component
    // Event tracked successfully
  };

  // Swipe navigation handlers
  const handleSwipeLeft = useCallback(() => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    onDateChange?.(nextWeek);
  }, [currentDate, onDateChange]);

  const handleSwipeRight = useCallback(() => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    onDateChange?.(prevWeek);
  }, [currentDate, onDateChange]);

  // Configure swipe gestures
  const { swipeHandlers } = useSwipeGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50,
    preventScroll: false,
  });

  return (
    <div className={`mobile-multi-day-calendar ${className}`} role="main" aria-label="Weekly calendar view">
      {/* Week Navigation */}
      <div className="week-navigation" role="navigation" aria-label="Week navigation">
        <button className="nav-arrow" onClick={handlePreviousMonth} aria-label="Previous week">
          <MaterialIcon name="arrow_back" size={20} />
        </button>
        
        <div className="current-week">
          {monthNames.current} {currentDate.getFullYear()}
        </div>
        
        <button className="nav-arrow" onClick={handleNextMonth} aria-label="Next week">
          <MaterialIcon name="chevron_right" size={20} />
        </button>
      </div>

      {/* Week Date Picker */}
      <div 
        className="week-date-picker" 
        role="grid" 
        aria-label="Week navigation"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <div className="weekday-headers">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLetter, index) => (
            <div key={index} className="weekday-header">{dayLetter}</div>
          ))}
        </div>
        <div className="week-dates">
          {displayDays.map((day, _index) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === currentDate.toDateString();
            const dayEvents = events.filter(event => {
              const eventDate = new Date(event.startTime);
              return eventDate.toDateString() === day.toDateString();
            });
            
            return (
              <button
                key={day.toISOString()}
                className={`date-button ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                onClick={() => onDateChange?.(day)}
                aria-label={`${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
              >
                <span className="date-number">{day.getDate()}</span>
                {dayEvents.length > 0 && (
                  <div className="event-indicators">
                    {dayEvents.slice(0, 3).map((event, _eventIndex) => (
                      <div
                        key={event.id}
                        className="event-dot mobile-event-dot"
                        style={{ '--event-color': event.category?.color || 'var(--accent-primary)' } as React.CSSProperties}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="event-count">+{dayEvents.length - 3}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events - Simplified */}
      <div className="selected-day-events">
        <div className="day-events-list">
          {events
            .filter(event => {
              const eventDate = new Date(event.startTime);
              return eventDate.toDateString() === currentDate.toDateString();
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((event, index) => (
              <div
                key={`${event.id}-${index}`}
                className="day-event-item mobile-task-card mobile-event-border"
                onClick={() => handleEventTap(event)}
                style={{
                  '--category-color': event.category?.color || 'var(--background-secondary)',
                  '--event-color': event.category?.color ? event.category.color.replace(/[^,)]*/, m => Math.max(0, parseInt(m) - 40).toString()) : 'var(--accent-primary)'
                } as React.CSSProperties}
              >
                <div className="event-time">
                  {new Date(event.startTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
                <div className="event-details">
                  <div className="flex items-center justify-between">
                    <div className="event-title flex-1">{event.title}</div>
                    {/* Career Impact Indicator for mobile */}
                    {(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite && (
                      <div className="flex-shrink-0 ml-2">
                        <div className={`
                          w-2 h-2 rounded-full
                          ${(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 80 ? 'bg-green-400' :
                            (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 50 ? 'bg-blue-400' :
                            (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 20 ? 'bg-yellow-400' : 'bg-gray-400'}
                        `} />
                      </div>
                    )}
                  </div>
                  {event.location && (
                    <div className="event-location">{event.location}</div>
                  )}
                </div>
              </div>
            ))}
          
          {events.filter(event => {
            const eventDate = new Date(event.startTime);
            return eventDate.toDateString() === currentDate.toDateString();
          }).length === 0 && (
            <div className="no-events-today">
              <MaterialIcon name="event" size={32} />
              <span className="no-events-text">No events on this date</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Event Preview */}
      {previewEvent && (
        <MobileEventPreview
          event={previewEvent}
          isVisible={isPreviewVisible}
          onClose={handleClosePreview}
          onTrackEvent={handleTrackEvent}
          categories={_categories}
        />
      )}
    </div>
  );
};

export default MobileMultiDayCalendarView;