'use client';

import React from 'react';
import Image from 'next/image';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  TrendUp
} from '@phosphor-icons/react';
import { DiscoveryEvent } from '@/services/discoveryService';

export interface DiscoveryCardProps {
  event: DiscoveryEvent;
  onClick?: () => void;
  onTrack?: () => void;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
}

const DiscoveryCard = React.memo<DiscoveryCardProps>(({
  event,
  onClick,
  onTrack,
  className = '',
  variant = 'default'
}) => {
  // Format date for display
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Get duration in human readable format
  const getEventDuration = () => {
    if (!event.endTime) return null;
    
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (diffHours >= 24) return `${Math.ceil(diffHours / 24)} day${diffHours >= 48 ? 's' : ''}`;
    if (diffHours >= 1) return `${Math.ceil(diffHours)}h`;
    return `${Math.ceil(diffHours * 60)}min`;
  };


  // Get category color - matching the pattern from other event cards
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

  // Create contrasting text colors from pastel backgrounds (matching EventCard)
  const getPillColor = (color: string, factor: number = 0.5) => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Create a darker version for text
    const newR = Math.max(0, Math.floor(r * factor));
    const newG = Math.max(0, Math.floor(g * factor));
    const newB = Math.max(0, Math.floor(b * factor));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  };

  const categoryColor = getCategoryColor();
  const titleColor = getPillColor(categoryColor, 0.5);
  const duration = getEventDuration();


  return (
    <div 
      className={`discovery-card ${variant} ${className}`}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      aria-label={`${event.title} - ${formatEventDate(event.startTime)} at ${formatTime(event.startTime)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{
        '--category-bg': categoryColor,
        '--category-title-color': titleColor,
        backgroundColor: categoryColor,
      } as React.CSSProperties}
    >
      {/* Event Image or Category Color Block */}
      <div className="discovery-card-visual">
        {event.eventImageUrl ? (
          <Image
            src={event.eventImageUrl}
            alt={`${event.title} event image`}
            width={variant === 'featured' ? 120 : 80}
            height={variant === 'featured' ? 80 : 60}
            className="event-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="category-color-block" style={{ backgroundColor: categoryColor }}>
            {/* No text needed - color indicates category */}
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="discovery-card-content">
        <div className="event-header">
          <h3 className="event-title">{event.title}</h3>
          {event.discoveryReason && (
            <p className="discovery-reason">{event.discoveryReason}</p>
          )}
        </div>

        <div className="event-meta">
          <div className="meta-item">
            <Calendar size={14} />
            <span>{formatEventDate(event.startTime)}</span>
          </div>
          
          <div className="meta-item">
            <Clock size={14} />
            <span>{formatTime(event.startTime)}</span>
          </div>

          {duration && (
            <div className="meta-item">
              <span className="duration-badge">{duration}</span>
            </div>
          )}
        </div>

        {/* Additional Info Row */}
        <div className="event-details">
          {event.location && (
            <div className="detail-item">
              <MapPin size={12} />
              <span className="location-text">
                {event.location.length > 20 
                  ? `${event.location.substring(0, 20)}...` 
                  : event.location
                }
              </span>
              {/* Location relevance indicator */}
              {event.discoveryMetrics?.locationRelevanceScore !== undefined && (
                <span className={`location-indicator ${
                  event.discoveryMetrics.locationRelevanceScore >= 1.0 ? 'local' :
                  event.discoveryMetrics.locationRelevanceScore >= 0.7 ? 'regional' :
                  event.discoveryMetrics.locationRelevanceScore >= 0.5 ? 'distant' : 'remote'
                }`}>
                  <MapPin size={10} weight={
                    event.discoveryMetrics.locationRelevanceScore >= 1.0 ? 'fill' : 'regular'
                  } />
                </span>
              )}
            </div>
          )}

          {event.attendeeCount && (
            <div className="detail-item">
              <Users size={12} />
              <span>{event.attendeeCount} attending</span>
            </div>
          )}

          {event.category && (
            <div className="detail-item">
              <span 
                className="category-tag"
                style={{ 
                  backgroundColor: `${categoryColor}15`,
                  color: categoryColor 
                }}
              >
                {event.category.name}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="card-actions">
          <button 
            className="track-button"
            onClick={(e) => {
              e.stopPropagation();
              onTrack?.();
            }}
            aria-label={`Track ${event.title} event`}
          >
            Track Event
          </button>
          
          {variant === 'featured' && (
            <button 
              className="learn-more-button"
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
            >
              Learn More
            </button>
          )}
        </div>
      </div>

      {/* Trending Indicator */}
      {event.isTrending && (
        <div className="trending-indicator">
          <TrendUp size={12} />
        </div>
      )}
    </div>
  );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;
