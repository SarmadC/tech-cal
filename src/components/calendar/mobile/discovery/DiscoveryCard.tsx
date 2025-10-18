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
import { Event, CareerImpactScore } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { Card, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ShinyText from '../../shared/ShinyText';
import '../../shared/ShinyText.css';

export interface DiscoveryCardProps {
  event: Event & { careerImpactLite?: CareerImpactScoreLite; careerImpact?: CareerImpactScore };
  onClick?: () => void;
  onView?: () => void;
  onLearnMore?: () => void;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
  size?: 'small' | 'medium' | 'large';
  showCareerImpact?: boolean;
  showLearnMore?: boolean;
  badges?: React.ReactNode;
}

const DiscoveryCard = React.memo<DiscoveryCardProps>(({
  event,
  onClick,
  onView,
  onLearnMore,
  className = '',
  variant = 'default',
  size = 'medium',
  showCareerImpact = true,
  showLearnMore = false,
  badges
}) => {
  const [isHovered, setIsHovered] = useState(false);
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



  // Get category color for logo area only
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

  const categoryColor = getCategoryColor();


  // Size-based styling classes
  const sizeClasses = {
    small: 'bento-card-small',
    medium: 'bento-card-medium',
    large: 'bento-card-large'
  };

  return (
    <Card 
      className={cn(
        "discovery-card event-card cursor-pointer transition-all duration-300 hover:shadow-lg relative",
        "border-border/50 bg-card hover:bg-card/80",
        variant === 'featured' && "md:col-span-2",
        variant === 'compact' && "flex-row items-center gap-4",
        sizeClasses[size],
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
    >
      
      <CardHeader className="pb-0 relative">
         {/* Event Header Content - Now takes full width */}
         <div className="w-full space-y-4">
           {/* Event title, career impact bar, and arrow button on the same line */}
           <div className="flex items-center justify-between gap-3">
             <h3 
               className={cn(
                 "font-semibold leading-tight tracking-tight flex-1 min-w-0 text-foreground-primary",
                 size === 'large' && "text-xl",
                 size === 'medium' && "text-lg",
                 size === 'small' && "text-base"
               )}
             >
               {event.title}
             </h3>
             
             {/* Career Impact - Progress Bar with Percentage and Breakdown Tooltip */}
              {showCareerImpact && ((event.careerImpactLite?.overall ?? 0) > 0 || (event.careerImpact?.overall ?? 0) > 0) && (
               <div className="relative flex items-center gap-2 flex-shrink-0">
                 <div 
                   className={cn(
                     "bg-gray-200 rounded-full overflow-hidden cursor-pointer",
                     size === 'large' ? "h-2 w-16" : "h-1.5 w-12"
                   )}
                   onMouseEnter={() => setIsHovered(true)}
                   onMouseLeave={() => setIsHovered(false)}
                 >
                   <div 
                     className={cn(
                       "h-full transition-all duration-300 rounded-full",
                       (event.careerImpactLite?.overall || event.careerImpact?.overall || 0) >= 80 && "bg-gradient-to-r from-emerald-400 to-emerald-600",
                       (event.careerImpactLite?.overall || event.careerImpact?.overall || 0) >= 60 && (event.careerImpactLite?.overall || event.careerImpact?.overall || 0) < 80 && "bg-gradient-to-r from-blue-400 to-blue-600",
                       (event.careerImpactLite?.overall || event.careerImpact?.overall || 0) >= 40 && (event.careerImpactLite?.overall || event.careerImpact?.overall || 0) < 60 && "bg-gradient-to-r from-amber-400 to-amber-600",
                       (event.careerImpactLite?.overall || event.careerImpact?.overall || 0) < 40 && "bg-gray-400"
                     )}
                     style={{ width: `${Math.min(event.careerImpactLite?.overall || event.careerImpact?.overall || 0, 100)}%` }}
                   />
                 </div>
                 <span className={cn(
                   "font-medium text-foreground-secondary",
                   size === 'large' ? "text-sm" : "text-xs"
                 )}>
                   {Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0)}%
                 </span>

                 {/* Breakdown Tooltip */}
                  {isHovered && (event.careerImpact?.components || Boolean((event.careerImpactLite as { explanation?: unknown })?.explanation)) && (
                   <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                     <div className="text-xs text-white">
                       <div className="font-medium mb-2">Why this event matches:</div>
                       <ul className="space-y-1">
                         {/* Show alignment reasons with their actual contributions */}
                         {(event.careerImpact?.explanation as { alignmentReasons?: Array<{ reason: string; contribution: number }> })?.alignmentReasons?.map((reason, idx: number) => (
                           <li key={idx} className="flex items-center justify-between">
                             <span>{reason.reason}</span>
                             <span className="text-white/70">+{reason.contribution}%</span>
                           </li>
                         )) || ((event.careerImpactLite as { explanation?: { alignmentReasons?: Array<{ reason: string; contribution: number }> } })?.explanation?.alignmentReasons)?.map((reason, idx: number) => (
                           <li key={idx} className="flex items-center justify-between">
                             <span>{reason.reason}</span>
                             <span className="text-white/70">+{reason.contribution}%</span>
                           </li>
                         )) || ((event.careerImpactLite as { explanation?: { reasons?: string[] } })?.explanation?.reasons)?.map((reason: string, idx: number) => {
                           // Fallback: Calculate approximate contribution based on total score and number of reasons
                           const totalScore = Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0);
                           const reasonCount = ((event.careerImpactLite as { explanation?: { reasons?: string[] } })?.explanation?.reasons || []).length;
                           const avgContribution = reasonCount > 0 ? Math.round(totalScore / reasonCount) : 0;
                           return (
                             <li key={idx} className="flex items-center justify-between">
                               <span>{reason}</span>
                               <span className="text-white/70">+{avgContribution}%</span>
                             </li>
                           );
                         }) || (event.careerImpact?.explanation as { reasons?: string[] })?.reasons?.map((reason: string, idx: number) => {
                           // Fallback: Calculate approximate contribution based on total score and number of reasons
                           const totalScore = Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0);
                           const reasonCount = (event.careerImpact?.explanation as { reasons?: string[] })?.reasons?.length || 0;
                           const avgContribution = reasonCount > 0 ? Math.round(totalScore / reasonCount) : 0;
                           return (
                             <li key={idx} className="flex items-center justify-between">
                               <span>{reason}</span>
                               <span className="text-white/70">+{avgContribution}%</span>
                             </li>
                           );
                         })}
                         {/* Show matched skills if available */}
                         {((event.careerImpactLite as { explanation?: { matchedSkills?: string[] } })?.explanation?.matchedSkills)?.map((skill: string, idx: number) => {
                           const totalScore = Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0);
                           const skillCount = ((event.careerImpactLite as { explanation?: { matchedSkills?: string[] } })?.explanation?.matchedSkills || []).length;
                           const avgContribution = skillCount > 0 ? Math.round(totalScore / skillCount) : 0;
                           return (
                             <li key={`skill-${idx}`} className="flex items-center justify-between">
                               <span>Matches skill: {skill}</span>
                               <span className="text-white/70">+{avgContribution}%</span>
                             </li>
                           );
                         }) || (event.careerImpact?.explanation as { matchedSkills?: string[] })?.matchedSkills?.map((skill: string, idx: number) => {
                           const totalScore = Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0);
                           const skillCount = (event.careerImpact?.explanation as { matchedSkills?: string[] })?.matchedSkills?.length || 0;
                           const avgContribution = skillCount > 0 ? Math.round(totalScore / skillCount) : 0;
                           return (
                             <li key={`skill-${idx}`} className="flex items-center justify-between">
                               <span>Matches skill: {skill}</span>
                               <span className="text-white/70">+{avgContribution}%</span>
                             </li>
                           );
                         })}
                         {/* Show speaker highlights if available */}
                         {((event.careerImpactLite as { explanation?: { speakerHighlights?: string[] } })?.explanation?.speakerHighlights)?.map((highlight: string, idx: number) => {
                           const totalScore = Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0);
                           const highlightCount = ((event.careerImpactLite as { explanation?: { speakerHighlights?: string[] } })?.explanation?.speakerHighlights || []).length;
                           const avgContribution = highlightCount > 0 ? Math.round(totalScore / highlightCount) : 0;
                           return (
                             <li key={`speaker-${idx}`} className="flex items-center justify-between">
                               <span>Speaker: {highlight}</span>
                               <span className="text-white/70">+{avgContribution}%</span>
                             </li>
                           );
                         }) || (event.careerImpact?.explanation as { speakerHighlights?: string[] })?.speakerHighlights?.map((highlight: string, idx: number) => {
                           const totalScore = Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0);
                           const highlightCount = (event.careerImpact?.explanation as { speakerHighlights?: string[] })?.speakerHighlights?.length || 0;
                           const avgContribution = highlightCount > 0 ? Math.round(totalScore / highlightCount) : 0;
                           return (
                             <li key={`speaker-${idx}`} className="flex items-center justify-between">
                               <span>Speaker: {highlight}</span>
                               <span className="text-white/70">+{avgContribution}%</span>
                             </li>
                           );
                         })}
                       </ul>
                       <div className="mt-3 pt-2 border-t border-white/20">
                         <div className="flex items-center justify-between">
                           <span className="font-medium">Total Match:</span>
                           <span className="font-medium text-white">
                             {Math.round(event.careerImpactLite?.overall || event.careerImpact?.overall || 0)}%
                           </span>
                         </div>
                       </div>
                     </div>
                     <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
                   </div>
                 )}
               </div>
             )}
             
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

          {/* Event Badges */}
          {badges && (
            <div className="flex flex-wrap gap-1 mt-2">
              {badges}
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

          {/* Logo positioned in bottom-right corner within content area */}
          <div className="flex justify-end mt-2">
            <div className={cn(
              "rounded-lg overflow-hidden flex items-center justify-center",
              size === 'large' && "w-8 h-8",
              size === 'medium' && "w-6 h-6",
              size === 'small' && "w-5 h-5"
            )}>
              {(() => {
                const imageSizes = size === 'large' ? 32 : size === 'medium' ? 24 : 20;
                const logoSizes = size === 'large' ? 20 : size === 'medium' ? 16 : 12;
                
                if (event.eventImageUrl) {
                  return (
                    <Image
                      src={event.eventImageUrl}
                      alt={`${event.title} event image`}
                      width={imageSizes}
                      height={imageSizes}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  );
                } else if (event.organization?.logo) {
                  return (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image
                        src={event.organization.logo}
                        alt={`${event.organization.name} logo`}
                        width={logoSizes}
                        height={logoSizes}
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          // Show fallback color block if logo fails
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.style.backgroundColor = categoryColor;
                          }
                        }}
                      />
                    </div>
                  );
                } else {
                  return (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {/* Category color block fallback */}
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </CardHeader>


      {/* Event Image or Category Color Block - Moved to bottom - Hidden on mobile */}
      <div className="px-6 pb-6 hidden md:block">
        <div className={cn(
          "rounded-lg overflow-hidden flex items-center justify-start",
          size === 'large' && "w-16 h-16",
          size === 'medium' && "w-14 h-14",
          size === 'small' && "w-10 h-10"
        )}>
          {(() => {
            const imageSizes = size === 'large' ? 64 : size === 'medium' ? 56 : 40;
            const logoSizes = size === 'large' ? 40 : size === 'medium' ? 32 : 24;
            
            if (event.eventImageUrl) {
              return (
                <Image
                  src={event.eventImageUrl}
                  alt={`${event.title} event image`}
                  width={imageSizes}
                  height={imageSizes}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              );
            } else if (event.organization?.logo) {
              return (
                <div className="w-full h-full flex items-center justify-start">
                  <Image
                    src={event.organization.logo}
                    alt={`${event.organization.name} logo`}
                    width={logoSizes}
                    height={logoSizes}
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      // Show fallback color block if logo fails
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.style.backgroundColor = categoryColor;
                      }
                    }}
                  />
                </div>
              );
            } else {
              return (
                <div 
                  className="w-full h-full flex items-center justify-start"
                  style={{ backgroundColor: categoryColor }}
                >
                  {/* Category color block fallback */}
                </div>
              );
            }
          })()}
        </div>
      </div>

    </Card>
  );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;
