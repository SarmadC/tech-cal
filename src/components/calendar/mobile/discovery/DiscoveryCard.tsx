'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock
} from '@phosphor-icons/react';
// Use consolidated Event type - recommendation functionality handled through EventWithCareerImpact
import { Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { Card, CardHeader } from '@/components/ui/card';
import { CareerImpactIndicator } from '@/components/ui/career-impact-tooltip';
import { cn } from '@/lib/utils';
import ShinyText from '../../shared/ShinyText';
import '../../shared/ShinyText.css';

export interface DiscoveryCardProps {
  event: Event & { careerImpactLite?: CareerImpactScoreLite };
  onClick?: () => void;
  onView?: () => void;
  onLearnMore?: () => void;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
  showCareerImpact?: boolean;
  showLearnMore?: boolean;
}

const DiscoveryCard = React.memo<DiscoveryCardProps>(({
  event,
  onClick,
  onView,
  onLearnMore,
  className = '',
  variant = 'default',
  showCareerImpact = true,
  showLearnMore = true
}) => {
  const hasTrackedView = React.useRef(false);
  const [isHovered, setIsHovered] = useState(false);

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
        "event-card cursor-pointer transition-all duration-300 hover:shadow-lg relative",
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
      
      <CardHeader className="pb-0 relative">
         {/* Event Header Content - Now takes full width */}
         <div className="w-full space-y-4">
           {/* Event title and arrow button on the same line */}
           <div className="flex items-center justify-between">
             <h3 
               className="font-semibold text-lg leading-tight tracking-tight flex-1 min-w-0"
               style={{ color: titleColor }}
             >
               {event.title}
             </h3>
             {showLearnMore && (
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   onLearnMore?.();
                 }}
                 onMouseEnter={() => setIsHovered(true)}
                 onMouseLeave={() => setIsHovered(false)}
                 className="learn-more-button z-10 flex-shrink-0"
                 title="Learn More"
                 type="button"
               >
                 <div className="button-content">
                   <svg 
                     xmlns="http://www.w3.org/2000/svg" 
                     width="18" 
                     height="18" 
                     fill="currentColor" 
                     viewBox="0 0 256 256"
                     className={`arrow-icon ${isHovered ? 'arrow-hovered' : ''}`}
                   >
                     <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16H192A8,8,0,0,1,200,64Z"/>
                   </svg>
                   <ShinyText 
                     text="Learn More" 
                     disabled={!isHovered} 
                     speed={3} 
                     className={`learn-more-shiny ${isHovered ? 'text-visible' : ''}`}
                   />
                 </div>
               </button>
             )}
           </div>
          
          {/* Career Impact Indicator - separate line */}
          {showCareerImpact && event.careerImpactLite && event.careerImpactLite.overall > 0 && (
            <div className="flex items-center">
              <CareerImpactIndicator 
                score={event.careerImpactLite.overall}
                size="sm"
                showValue={true}
              />
            </div>
          )}

          {/* Date and time on one line */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{formatEventDate(event.startTime)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{formatTime(event.startTime)}</span>
            </div>
          </div>

          {/* Location on separate line */}
          {event.location && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} />
              <span className="max-w-64">
                {event.location.length > 28
                  ? `${event.location.substring(0, 28)}...` 
                  : event.location
                }
              </span>
            </div>
          )}

          {event.attendeeCount && event.attendeeCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users size={14} />
              <span>{event.attendeeCount} attending</span>
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

    </Card>
  );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;
