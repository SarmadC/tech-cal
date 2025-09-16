'use client';

import React from 'react';
import Image from 'next/image';
import { Event } from '@/types';
import { MaterialIcon } from '@/components/ui/Icon';

export interface TodayTaskCardProps {
  event: Event;
  onClick?: () => void;
  className?: string;
}

const TodayTaskCard: React.FC<TodayTaskCardProps> = ({
  event,
  onClick,
  className = ''
}) => {
  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Get event tags for display
  const getEventTags = () => {
    return event.tags || [];
  };

  // Get participant avatars using real event data
  const getParticipantAvatars = () => {
    const avatars = [];
    
    // Add organization logo if available
    if (event.organization?.logo) {
      avatars.push(event.organization.logo);
    }
    
    return avatars;
  };
  
  // Get attendee count for display
  const getAttendeeInfo = () => {
    const count = event.attendeeCount || 0;
    return { count, hasAttendees: count > 0 };
  };

  // Get category-based background color from the event type
  const getCategoryColor = () => {
    // If we have a category with a color, use it directly
    if (event.category?.color) {
      return event.category.color;
    }
    
    // Fallback to category name matching if no color is set
    const categoryName = event.category?.name?.toLowerCase();
    switch (categoryName) {
      case 'tech summit':
      case 'summit':
        return 'var(--accent-primary-light)'; // soft blue
      case 'workshop':
        return 'var(--accent-secondary-light)'; // soft lavender
      case 'networking':
        return 'var(--accent-success-light)'; // soft mint
      case 'conference':
        return 'var(--accent-info-light)'; // soft teal
      case 'webinar':
        return 'var(--accent-warning-light)'; // soft peach
      case 'startup':
        return 'var(--accent-error-light)'; // soft coral
      case 'trade show':
        return 'var(--background-tertiary)'; // soft cream
      case 'product launch':
        return 'var(--accent-error-light)'; // soft coral
      case 'training':
        return 'var(--accent-success-light)'; // soft mint
      default:
        return 'var(--background-secondary)'; // light gray fallback
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

  const eventTags = getEventTags();
  const avatars = getParticipantAvatars();
  const { count: attendeeCount, hasAttendees } = getAttendeeInfo();
  const categoryColor = getCategoryColor();
  const pillColor = getPillColor(categoryColor, 0.5);

  return (
    <div 
      className={`today-task-card ${className}`} 
      onClick={() => {
        // Today task card clicked
        onClick?.();
      }}
      role="listitem"
      tabIndex={0}
      aria-label={`Event: ${event.title}${event.location ? ` at ${event.location}` : ''} from ${formatTime(event.startTime)}${event.endTime ? ` to ${formatTime(event.endTime)}` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        backgroundColor: categoryColor,
        color: pillColor
      }}
    >
      <div className="task-card-header">
        <div className="task-title-section">
          <h3 className="task-title" id={`task-title-${event.id}`}>{event.title}</h3>
          <div className="task-participants" role="list" aria-label="Event participants">
            {avatars.map((avatar, _index) => (
              <div key={_index} className="participant-avatar">
                <Image
                  src={avatar}
                  alt={`Organization logo`}
                  width={24}
                  height={24}
                  className="avatar-image"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ))}
            {/* Show attendee count if available */}
            {hasAttendees && (
              <div className="attendee-count" role="listitem" aria-label={`${attendeeCount} attendees`}>
                <MaterialIcon name="people" size={16} />
                <span className="count-text">{attendeeCount}</span>
              </div>
            )}
          </div>
        </div>
        
        {eventTags.length > 0 && (
          <div className="task-tags" aria-label={`Event tags: ${eventTags.map(tag => tag.name).join(', ')}`}>
            {eventTags.slice(0, 2).map((tag, _index) => (
              <span 
                key={tag.id} 
                className="task-tag"
                style={{
                  backgroundColor: getPillColor(categoryColor, 0.6),
                  color: 'white'
                }}
              >
                {tag.name}
              </span>
            ))}
            {eventTags.length > 2 && (
              <span 
                className="task-tag-more"
                style={{
                  backgroundColor: getPillColor(categoryColor, 0.6),
                  color: 'white'
                }}
              >
                +{eventTags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="task-time-section" role="region" aria-labelledby={`task-title-${event.id}`}>
        <div className="task-start-date">
          <MaterialIcon name="event" size={14} />
          <span className="time-value">{new Date(event.startTime).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {event.location && (
        <div className="task-location">
          <MaterialIcon name="location" size={14} />
          <span>{event.location}</span>
        </div>
      )}
    </div>
  );
};

export default TodayTaskCard;