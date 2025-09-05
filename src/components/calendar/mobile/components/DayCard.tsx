'use client';

import React, { useMemo } from 'react';
import { Event } from '@/types';
import TimeSlotRow from './TimeSlotRow';

export interface DayCardProps {
  date: Date;
  events: Event[];
  colorTheme: 'purple' | 'coral' | 'teal' | 'green' | 'yellow' | 'blue' | 'orange';
  onEventClick?: (event: Event) => void;
  onAddEvent?: (date: Date, hour: number) => void;
  className?: string;
}

const DayCard: React.FC<DayCardProps> = ({
  date,
  events,
  colorTheme,
  onEventClick,
  onAddEvent,
  className = ''
}) => {
  // Format date for display
  const formatDate = () => {
    const day = date.getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    return { day, monthName, weekday };
  };

  // Group events by hour
  const eventsByHour = useMemo(() => {
    const grouped: Record<number, Event[]> = {};
    
    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      grouped[hour] = [];
    }
    
    // Filter and group events for this day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    events.forEach(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;
      
      // Check if event falls on this day
      if (eventStart <= dayEnd && eventEnd >= dayStart) {
        const hour = eventStart.getHours();
        grouped[hour].push(event);
      }
    });
    
    return grouped;
  }, [events, date]);

  // Get the hours that have events or should be displayed (focus on business hours)
  const getDisplayHours = () => {
    const hoursWithEvents = Object.keys(eventsByHour)
      .map(Number)
      .filter(hour => eventsByHour[hour].length > 0);
    
    if (hoursWithEvents.length === 0) {
      // Show fewer default hours if no events to avoid overwhelming empty slots
      return [9, 12, 15, 18];
    }
    
    // Show hours with events plus some surrounding hours
    const minHour = Math.max(6, Math.min(...hoursWithEvents) - 1);
    const maxHour = Math.min(22, Math.max(...hoursWithEvents) + 1);
    
    const displayHours = [];
    for (let hour = minHour; hour <= maxHour; hour++) {
      displayHours.push(hour);
    }
    
    return displayHours;
  };

  // Check if this day has any events
  const hasEvents = Object.values(eventsByHour).some(hourEvents => hourEvents.length > 0);

  const { day, monthName, weekday } = formatDate();
  const displayHours = getDisplayHours();

  return (
    <div className={`day-card day-card-${colorTheme} ${className}`} role="gridcell" aria-label={`${weekday}, ${monthName} ${day}`}>
      <div className="day-card-header" role="heading" aria-level={3}>
        <div className="day-info">
          <div className="weekday">{weekday}</div>
          <div className="date-display">
            <span className="day-number">{day}</span>
            <span className="month-name">{monthName}</span>
          </div>
        </div>
      </div>
      
      <div className="day-card-content" role="list" aria-label={`Time slots for ${weekday}`}>
        {!hasEvents && (
          <div className="no-events-message">
            <span className="no-events-text">No events today</span>
            <span className="no-events-subtext">Tap + to schedule</span>
          </div>
        )}
        {displayHours.map(hour => (
          <TimeSlotRow
            key={hour}
            hour={hour}
            events={eventsByHour[hour]}
            onEventClick={onEventClick}
            onAddEvent={(hour) => onAddEvent?.(date, hour)}
          />
        ))}
      </div>
    </div>
  );
};

export default DayCard;