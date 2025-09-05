'use client';

import React from 'react';
import { Event } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';

export interface TimeSlotRowProps {
  hour: number;
  events: Event[];
  onEventClick?: (event: Event) => void;
  onAddEvent?: (hour: number) => void;
  className?: string;
}

const TimeSlotRow: React.FC<TimeSlotRowProps> = ({
  hour,
  events,
  onEventClick,
  onAddEvent,
  className = ''
}) => {
  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 am';
    if (hour < 12) return `${hour} am`;
    if (hour === 12) return '12 pm';
    return `${hour - 12} pm`;
  };

  // Get category-based background color from the event type
  const getCategoryColor = (event: Event) => {
    // If we have a category with a color, use it directly
    if (event.category?.color) {
      return event.category.color;
    }
    
    // Fallback to category name matching if no color is set
    const categoryName = event.category?.name?.toLowerCase();
    switch (categoryName) {
      case 'tech summit':
      case 'summit':
        return '#bfdbfe'; // soft blue
      case 'workshop':
        return '#e9d7ff'; // soft lavender
      case 'networking':
        return '#b8ffcc'; // soft mint
      case 'conference':
        return '#a7f3d0'; // soft teal
      case 'webinar':
        return '#fed8ae'; // soft peach
      case 'startup':
        return '#fecaca'; // soft coral
      case 'trade show':
        return '#faf3dd'; // soft cream
      case 'product launch':
        return '#ffa69e'; // soft coral
      case 'training':
        return '#b8f2e6'; // soft mint
      default:
        return '#f1f5f9'; // light gray fallback
    }
  };

  // Helper function to create vibrant "pop" colors from pastel backgrounds
  const getPillColor = (color: string, factor: number = 0.15) => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken the color for text/border
    const newR = Math.max(0, Math.floor(r * (1 - factor)));
    const newG = Math.max(0, Math.floor(g * (1 - factor)));
    const newB = Math.max(0, Math.floor(b * (1 - factor)));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  };

  return (
    <div className={`time-slot-row ${className}`} role="listitem">
      <div className="time-slot-label" aria-label={`Time slot: ${formatHour(hour)}`}>
        <span className="hour-text">{formatHour(hour)}</span>
      </div>
      
      <div className="time-slot-content">
        {events.length > 0 ? (
          events.map((event, index) => (
            <div 
              key={`${event.id}-${index}`} 
              className="time-slot-event"
              onClick={() => {
                console.log('TimeSlotRow event clicked:', event.title);
                onEventClick?.(event);
              }}
              role="button"
              tabIndex={0}
              aria-label={`Event: ${event.title}${event.location ? ` at ${event.location}` : ''} at ${formatHour(hour)}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEventClick?.(event);
                }
              }}
              style={{
                backgroundColor: getCategoryColor(event),
                borderLeft: `3px solid ${getPillColor(getCategoryColor(event), 0.5)}`
              }}
            >
              <span className="event-title">{event.title}</span>
              {event.location && (
                <span className="event-location">{event.location}</span>
              )}
            </div>
          ))
        ) : (
          <button 
            className="add-event-button"
            onClick={() => onAddEvent?.(hour)}
            aria-label={`Add event at ${formatHour(hour)}`}
          >
            <MaterialIcon name="add" size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TimeSlotRow;