'use client';

import React, { useMemo } from 'react';
import { Event, EventType, AppProfile } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';
import TodayTaskCard from './components/TodayTaskCard';

export interface MobileTodayViewProps {
  events: Event[];
  currentDate: Date;
  categories: EventType[];
  profile: AppProfile | null;
  onEventSelect?: (event: Event) => void;
  className?: string;
}

const MobileTodayView: React.FC<MobileTodayViewProps> = ({
  events,
  currentDate,
  categories: _categories,
  profile: _profile,
  onEventSelect,
  className = ''
}) => {
  // Filter events for today - not used in current implementation
  const _todayEvents = useMemo(() => {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return events
      .filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart >= today && eventStart < tomorrow;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [events, currentDate]);

  // Get current local time - not used in current implementation
  const _getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format the main date display using actual current date
  const formatMainDate = () => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = now.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    const year = now.getFullYear();
    
    return { day: `${day}.${monthStr}`, year: year.toString() };
  };

  const formatWeekday = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const formatMonthName = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  };

  // Format time for reminders - not used in current implementation
  const _formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const { day, year: _year } = formatMainDate();

  return (
    <div className={`mobile-today-view ${className}`} role="main" aria-label="Today's calendar view">
      {/* No header needed - handled by parent MobileTopNavigation */}

      {/* Compact Header */}
      <div className="compact-header">
        <div className="app-title">Kure-Cal</div>
        <div className="date-info">
          {formatWeekday()}, {day} {formatMonthName()}
        </div>
      </div>

      {/* Event Feed */}
      <div className="event-feed" role="region" aria-label="Tech events feed">

        {/* All Events Feed - Show all events regardless of date */}
        {events
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .map((event, index) => (
            <TodayTaskCard
              key={`${event.id}-${index}`}
              event={event}
              onClick={() => onEventSelect?.(event)}
            />
          ))}
        
        {/* Show empty state if no events */}
        {events.length === 0 && (
          <div className="no-events-feed">
            <MaterialIcon name="event" size={48} />
            <div className="no-events-text">No tech events available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileTodayView;