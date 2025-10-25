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
  showCareerImpact = true,
  showLearnMore = false,
  badges
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasTrackedView = React.useRef(false);
  const displayScore = React.useMemo(() => {
    const fullScore = event.careerImpact?.overall;
    if (typeof fullScore === 'number' && Number.isFinite(fullScore)) {
      return Math.max(0, Math.min(fullScore, 100));
    }

    const liteScore = event.careerImpactLite?.overall;
    if (typeof liteScore === 'number' && Number.isFinite(liteScore)) {
      const normalized = liteScore <= 1 ? liteScore * 100 : liteScore;
      return Math.max(0, Math.min(normalized, 100));
    }

    return 0;
  }, [event]);

  type AlignmentReasonEntry = { label: string; contribution: number };

  const explanationReasons = React.useMemo(() => {
    const entries: AlignmentReasonEntry[] = [];

    const explanation = (event.careerImpact?.explanation as
      | {
          alignmentReasons?: Array<{ reason: string; contribution: number }>;
          reasons?: string[];
          matchedSkills?: string[];
        }
      | undefined) ??
      ((event.careerImpactLite as {
        explanation?: {
          alignmentReasons?: Array<{ reason: string; contribution: number }>;
          reasons?: string[];
          matchedSkills?: string[];
        };
      })?.explanation);

    const pushEntry = (label: string, contribution: number) => {
      if (!label) return;
      entries.push({ label, contribution: Math.round(contribution) });
    };

    if (explanation?.alignmentReasons?.length) {
      explanation.alignmentReasons.forEach(({ reason, contribution }) => {
        pushEntry(reason, contribution);
      });
    }

    if (!explanation?.alignmentReasons?.length && explanation?.reasons?.length) {
      const avgContribution = explanation.reasons.length > 0
        ? Math.max(1, Math.round(displayScore / explanation.reasons.length))
        : 0;
      explanation.reasons.forEach((reason) => pushEntry(reason, avgContribution));
    }

    if (explanation?.matchedSkills?.length) {
      const avgContribution = explanation.matchedSkills.length > 0
        ? Math.max(1, Math.round(displayScore / explanation.matchedSkills.length))
        : 0;
      explanation.matchedSkills.forEach((skill) =>
        pushEntry(`Matches skill: ${skill}`, avgContribution)
      );
    }

    return entries.sort((a, b) => b.contribution - a.contribution);
  }, [event, displayScore]);

  const condensedReasons = React.useMemo(() => {
    const MAX_ITEMS = 3;
    if (explanationReasons.length <= MAX_ITEMS) {
      return { list: explanationReasons, remainder: null as AlignmentReasonEntry | null };
    }

    const list = explanationReasons.slice(0, MAX_ITEMS);
    const remainderItems = explanationReasons.slice(MAX_ITEMS);
    const remainderContribution = remainderItems.reduce((sum, item) => sum + item.contribution, 0);
    const remainder: AlignmentReasonEntry = {
      label: `${remainderItems.length} more factor${remainderItems.length === 1 ? '' : 's'}`,
      contribution: Math.max(1, Math.round(remainderContribution))
    };

    return { list, remainder };
  }, [explanationReasons]);

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


  return (
    <div
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      aria-label={`${event.title} - ${formatEventDate(event.startTime)} at ${formatTime(event.startTime)}`}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="w-full"
    >
      <div className={cn(
        "discovery-card-glass event-card-enhanced-depth cursor-pointer transition-all duration-300 hover:shadow-lg relative bento-card-medium",
        variant === 'featured' && "md:col-span-2",
        variant === 'compact' && "flex-row items-center gap-4",
        className
      )} style={{ minHeight: 'fit-content' }}>
        <div className="flex flex-col w-full h-full p-0">
      
      <div className="pb-0 relative flex flex-col space-y-1.5 p-6">
         {/* Event Header Content - Redesigned for better layout */}
         <div className="w-full space-y-4">
           {/* Event title and logo on same line */}
           <div className="w-full flex items-start justify-between gap-3">
             <h3
               className="font-semibold leading-tight tracking-tight text-foreground-primary text-xl flex-1"
               title={event.title}
             >
               {event.title}
             </h3>
             
             {/* Logo positioned in top-right corner - Mobile only */}
             <div className="flex-shrink-0 md:hidden">
               <div className="rounded-lg overflow-visible flex items-center justify-center w-8 h-8">
                 {(() => {
                   const imageSizes = 32;
                   const logoSizes = 20;
                   
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
           
           {/* Career Impact and Learn More button on second line */}
           <div className="flex items-center justify-between gap-3">
             {/* Career Impact - Progress Bar with Percentage and Breakdown Tooltip */}
             {showCareerImpact && displayScore > 0 && (
               <div className="relative flex items-center gap-2 flex-shrink-0">
                 <div 
                   className="bg-gray-200 rounded-full overflow-hidden cursor-pointer h-2 w-16"
                   onMouseEnter={() => setIsHovered(true)}
                   onMouseLeave={() => setIsHovered(false)}
                 >
                   <div 
                     className={cn(
                       "h-full transition-all duration-300 rounded-full",
                       displayScore >= 80 && "bg-gradient-to-r from-emerald-400 to-emerald-600",
                       displayScore >= 60 && displayScore < 80 && "bg-gradient-to-r from-blue-400 to-blue-600",
                       displayScore >= 40 && displayScore < 60 && "bg-gradient-to-r from-amber-400 to-amber-600",
                       displayScore < 40 && "bg-gray-400"
                     )}
                     style={{ width: `${displayScore}%` }}
                   />
                 </div>
                 <span className="font-medium text-foreground-secondary text-sm">
                   {Math.round(displayScore)}%
                 </span>

                 {/* Breakdown Tooltip */}
                 {isHovered && (event.careerImpact?.components || Boolean((event.careerImpactLite as { explanation?: unknown })?.explanation)) && (
                   <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg z-[9999] max-h-72 overflow-y-auto">
                     <div className="text-xs text-white">
                       <div className="font-medium mb-2">Why this event matches:</div>
                       <ul className="space-y-1">
                         {condensedReasons.list.map((reason, idx) => (
                           <li key={`reason-${idx}`} className="flex items-center justify-between">
                             <span>{reason.label}</span>
                             <span className="text-white/70">+{reason.contribution}%</span>
                           </li>
                         ))}
                         {condensedReasons.remainder && condensedReasons.remainder.contribution > 0 && (
                           <li className="flex items-center justify-between text-white/80">
                             <span>{condensedReasons.remainder.label}</span>
                             <span className="text-white/60">+{condensedReasons.remainder.contribution}%</span>
                           </li>
                         )}
                         {condensedReasons.list.length === 0 && (
                           <li>No detailed breakdown available</li>
                         )}
                       </ul>
                     </div>
                     <div className="mt-3 pt-2 border-t border-white/20">
                       <div className="flex items-center justify-between">
                         <span className="font-medium">Total Match:</span>
                         <span className="font-medium text-white">
                           {Math.round(displayScore)}%
                         </span>
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

        </div>
      </div>


      {/* Event Image or Category Color Block - Moved to bottom - Hidden on mobile */}
      <div className="px-6 pb-6 hidden md:block">
        <div className="rounded-lg overflow-visible flex items-center justify-start w-16 h-16">
          {(() => {
            const imageSizes = 64;
            const logoSizes = 40;
            
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

        </div>
      </div>
    </div>
  );
});

DiscoveryCard.displayName = 'DiscoveryCard';

export default DiscoveryCard;
