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
import { RecommendationEvent } from '@/types/unifiedEventTypes';
import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface DiscoveryCardProps {
  event: RecommendationEvent;
  onClick?: () => void;
  onView?: () => void;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
}

const DiscoveryCard = React.memo<DiscoveryCardProps>(({
  event,
  onClick,
  onView,
  className = '',
  variant = 'default'
}) => {
  const hasTrackedView = React.useRef(false);

  // Track view only once when component mounts
  React.useEffect(() => {
    if (!hasTrackedView.current && onView) {
      onView();
      hasTrackedView.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount
  // Format date for display - show actual date instead of countdown
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    // Always show actual date, but keep special cases for very near dates
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    
    // For all other dates, show the actual date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
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


  return (
    <Card 
      className={cn(
        "event-card cursor-pointer transition-all duration-300 hover:shadow-lg",
        "border-border/50 bg-card hover:bg-card/80",
        variant === 'featured' && "md:col-span-2",
        variant === 'compact' && "flex-row items-center gap-4",
        className
      )}
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
      } as React.CSSProperties}
    >
      <CardHeader className="pb-0">
        {/* Event Header Content - Now takes full width */}
        <div className="w-full space-y-4">
          <h3 
            className="font-semibold text-lg leading-tight tracking-tight"
            style={{ color: titleColor }}
          >
            {event.title}
          </h3>
          
          {event.discoveryReason && (
            <p className="text-sm text-gray-700 font-medium">
              {event.discoveryReason}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatEventDate(event.startTime)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{formatTime(event.startTime)}</span>
            </div>
          </div>

          {/* Location section - moved from CardContent */}
          {event.location && (
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span className="max-w-64">
                  {event.location.length > 28
                    ? `${event.location.substring(0, 28)}...` 
                    : event.location
                  }
                </span>
              </div>

              {event.attendeeCount && (
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{event.attendeeCount} attending</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>


      {/* Event Image or Category Color Block - Moved to bottom */}
      <div className="px-6 pb-6">
        <div className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-start">
          {event.eventImageUrl ? (
            <Image
              src={event.eventImageUrl}
              alt={`${event.title} event image`}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : event.organization?.logo ? (
            <div className="w-full h-full flex items-center justify-start">
              <Image
                src={event.organization.logo}
                alt={`${event.organization.name} logo`}
                width={32}
                height={32}
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  // Show fallback color block if logo fails
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.style.backgroundColor = categoryColor;
                  }
                }}
                onLoad={(e) => {
                  e.currentTarget.style.display = 'block';
                }}
              />
            </div>
          ) : (
            <div 
              className="w-full h-full flex items-center justify-start"
              style={{ backgroundColor: categoryColor }}
            >
              {/* Category color block fallback */}
            </div>
          )}
        </div>
      </div>

      {/* Trending Indicator */}
      {event.isTrending && (
        <div className="trending-indicator absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
          <TrendUp size={12} />
        </div>
      )}

    </Card>
  );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;
