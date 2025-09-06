'use client';

import React, { useMemo, useState } from 'react';
import { Event, EventType, AppProfile } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';
import TodayTaskCard from './components/TodayTaskCard';
import MobileEventPreview from './MobileEventPreview';

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
  onEventSelect: _onEventSelect,
  className = ''
}) => {
  // Debug logging
  console.log('MobileTodayView - Events received:', events.length);
  console.log('MobileTodayView - Events:', events);
  
  // Debug upcoming events filtering
  const now = new Date();
  const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
  console.log('MobileTodayView - Current time:', now);
  console.log('MobileTodayView - Upcoming events count:', upcomingEvents.length);
  console.log('MobileTodayView - Event dates:', events.map(e => ({ title: e.title, startTime: e.startTime, isUpcoming: new Date(e.startTime) > now })));
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
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

  // Event preview handlers
  const handleEventTap = (event: Event) => {
    setPreviewEvent(event);
    setIsPreviewVisible(true);
  };

  const handleClosePreview = () => {
    setIsPreviewVisible(false);
    setPreviewEvent(null);
  };

  const handleTrackEvent = (event: Event) => {
    // Event tracking is handled by the MobileEventPreview component
    // This callback can be used for additional tracking logic if needed
    console.log('Event tracked:', event.title);
  };

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

        {/* Events Feed - Show all events for testing */}
        {events
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .map((event, index) => (
            <TodayTaskCard
              key={`${event.id}-${index}`}
              event={event}
              onClick={() => handleEventTap(event)}
            />
          ))}
        
        {/* Show empty state if no events */}
        {events.length === 0 && (
          <div className="no-events-feed">
            <MaterialIcon name="event" size={48} />
            <div className="no-events-text">No events available</div>
          </div>
        )}
      </div>

      {/* Mobile Event Preview */}
      {previewEvent && (
        <MobileEventPreview
          event={previewEvent}
          isVisible={isPreviewVisible}
          onClose={handleClosePreview}
          onTrackEvent={handleTrackEvent}
        />
      )}
    </div>
  );
};

export default MobileTodayView;