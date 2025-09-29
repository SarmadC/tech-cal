'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Event, EventType, AppProfile } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';
import MobileEventPreview from './MobileEventPreview';
import { useSwipeGestures } from '@/hooks/useSwipeGestures';

export interface MobileEnhancedWeekViewProps {
  events: Event[];
  currentDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event) => void;
  onDateChange?: (date: Date) => void;
  className?: string;
}

const MobileEnhancedWeekView: React.FC<MobileEnhancedWeekViewProps> = ({
  events,
  currentDate,
  categories,
  profile: _profile,
  onEventSelect,
  onDateChange,
  className = ''
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Sync selectedDate with currentDate when navigating weeks
  useEffect(() => {
    setSelectedDate(currentDate);
  }, [currentDate]);

  // Generate array of days to display (current week starting Sunday)
  const displayDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek); // Go to Sunday

    // Generate 7 days starting from Sunday
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentDate]);

  // Navigation handlers
  const handlePreviousWeek = useCallback(() => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    onDateChange?.(prevWeek);
  }, [currentDate, onDateChange]);

  const handleNextWeek = useCallback(() => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    onDateChange?.(nextWeek);
  }, [currentDate, onDateChange]);

  // Date selection handler
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    onDateChange?.(date);
  }, [onDateChange]);

  // Event preview handlers
  const handleEventTap = useCallback((event: Event) => {
    setPreviewEvent(event);
    setIsPreviewVisible(true);
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setPreviewEvent(null);
  }, []);

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

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return events
      .filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === selectedDate.toDateString();
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, selectedDate]);

  // Get current month/year display
  const monthYear = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  }, [currentDate]);

  return (
    <div className={`mobile-enhanced-week-view ${className}`} role="main" aria-label="Weekly calendar view">

      {/* Week Navigation Header */}
      <div className="week-navigation" role="navigation" aria-label="Week navigation">
        <button
          className="nav-arrow"
          onClick={handlePreviousWeek}
          aria-label="Previous week"
        >
          <MaterialIcon name="chevron_left" size={24} />
        </button>

        <div className="current-period">
          {monthYear}
        </div>

        <button
          className="nav-arrow"
          onClick={handleNextWeek}
          aria-label="Next week"
        >
          <MaterialIcon name="chevron_right" size={24} />
        </button>
      </div>

      {/* Week Date Grid */}
      <div
        className="week-date-grid"
        role="grid"
        aria-label="Week calendar"
        {...swipeHandlers}
      >
        <div className="weekday-headers">
          {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((dayName) => (
            <div key={dayName} className="weekday-header">
              {dayName}
            </div>
          ))}
        </div>

        <div className="week-dates">
          {displayDays.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const dayEvents = events.filter(event => {
              const eventDate = new Date(event.startTime);
              return eventDate.toDateString() === day.toDateString();
            });

            return (
              <button
                key={day.toISOString()}
                className={`date-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                onClick={() => handleDateSelect(day)}
                aria-label={`${day.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}`}
              >
                <span className="date-number">
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="event-indicator">
                    {dayEvents.slice(0, 1).map((event) => (
                      <div
                        key={event.id}
                        className="event-title-preview"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 1 && (
                      <div className="more-events">
                        +{dayEvents.length - 1} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      <div className="selected-date-events">
        {selectedDateEvents.length > 0 ? (
          <div className="events-list">
            {selectedDateEvents.map((event) => (
              <div
                key={event.id}
                className="enhanced-event-card"
                onClick={() => handleEventTap(event)}
              >
                <div className="event-time">
                  {new Date(event.startTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
                <div className="event-content">
                  <div className="event-title">
                    {event.title}
                  </div>
                  {event.location && (
                    <div className="event-location">
                      <MaterialIcon name="location" size={16} />
                      {event.location}
                    </div>
                  )}
                  {event.organizer && (
                    <div className="event-organizer">
                      <MaterialIcon name="building" size={16} />
                      {event.organizer}
                    </div>
                  )}
                </div>
                <div className="event-logo">
                  {event.organization?.logo ? (
                    <Image
                      src={event.organization.logo}
                      alt={`${event.organizer || event.title} logo`}
                      width={48}
                      height={48}
                      unoptimized
                    />
                  ) : (
                    <div className="event-logo-placeholder">
                      <MaterialIcon name="event" size={24} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-events-state">
            <MaterialIcon name="event_available" size={48} />
            <div className="no-events-text">No events on this date</div>
            <div className="no-events-subtext">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Event Preview */}
      {previewEvent && (
        <MobileEventPreview
          event={previewEvent}
          isVisible={isPreviewVisible}
          onClose={handleClosePreview}
          onTrackEvent={() => {}}
          categories={categories}
        />
      )}
    </div>
  );
};

export default MobileEnhancedWeekView;