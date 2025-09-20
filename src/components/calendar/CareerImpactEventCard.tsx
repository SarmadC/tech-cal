import React, { useState } from 'react';
import { Event, AppProfile, AgendaItem } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { CareerImpactScore } from '@/types';
import { EventCard } from './shared/EventCard';
import { CareerImpactBadge } from '@/components/ui/career-impact-badge';
import { CareerImpactIndicator } from '@/components/ui/career-impact-tooltip';
import { CareerImpactTooltip } from '@/components/ui/career-impact-tooltip';

interface CareerImpactEventCardProps {
  event: Event & { 
    careerImpact?: CareerImpactScore; 
    careerImpactLite?: CareerImpactScoreLite;
  };
  onClick?: (event: Event) => void;
  onHover?: (event: Event, e: React.MouseEvent) => void;
  onLeave?: () => void;
  viewType?: 'day' | 'week' | 'month';
  visualInfo?: Record<string, unknown>;
  isOverlapping?: boolean;
  agenda?: AgendaItem[];
  style?: React.CSSProperties;
  className?: string;
  showCareerImpact?: boolean;
  careerImpactVariant?: 'badge' | 'indicator' | 'detailed';
}

/**
 * Enhanced Event Card with Career Impact display
 */
export function CareerImpactEventCard({
  event,
  onClick,
  onHover,
  onLeave,
  viewType = 'day',
  visualInfo,
  isOverlapping,
  agenda,
  style,
  className,
  showCareerImpact = true,
  careerImpactVariant = 'badge',
  ...props
}: CareerImpactEventCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Get career impact data
  const careerImpact = event.careerImpact || event.careerImpactLite;
  const hasCareerImpact = !!careerImpact;

  // Enhanced hover handler for career impact tooltip
  const handleHover = (e: React.MouseEvent) => {
    if (onHover) {
      onHover(event, e);
    }

    // Show career impact tooltip if available
    if (hasCareerImpact && event.careerImpact) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setShowTooltip(true);
    }
  };

  // Enhanced leave handler
  const handleLeave = () => {
    setShowTooltip(false);
    if (onLeave) {
      onLeave();
    }
  };

  return (
    <div className="relative">
      {/* Base Event Card */}
      <EventCard
        event={event}
        onClick={onClick ? (() => onClick(event)) : (() => {})}
        onHover={handleHover}
        onLeave={handleLeave}
        viewType={viewType === 'month' ? 'day' : viewType}
        visualInfo={visualInfo}
        isOverlapping={isOverlapping}
        agenda={agenda}
        style={style}
        className={className}
        {...props}
      />

      {/* Career Impact Overlay */}
      {showCareerImpact && hasCareerImpact && (
        <div className="absolute top-2 right-2 z-10">
          {careerImpactVariant === 'badge' && (
            <CareerImpactBadge 
              score={careerImpact}
              variant="compact"
              showTooltip={true}
            />
          )}
          {careerImpactVariant === 'indicator' && (
            <CareerImpactIndicator 
              score={careerImpact.overall}
              size={viewType === 'week' ? 'sm' : 'md'}
              showValue={viewType !== 'week'}
            />
          )}
          {careerImpactVariant === 'detailed' && (
            <CareerImpactBadge 
              score={careerImpact}
              variant="detailed"
            />
          )}
        </div>
      )}

      {/* Career Impact Tooltip */}
      {showTooltip && event.careerImpact && (
        <CareerImpactTooltip
          score={event.careerImpact}
          isVisible={showTooltip}
          position={tooltipPosition}
        />
      )}
    </div>
  );
}

/**
 * Hook for enhancing events with career impact in components
 */
export function useCareerImpactEvents(
  events: Event[],
  userProfile: AppProfile | null,
  enabled: boolean = true
) {
  const [enhancedEvents, setEnhancedEvents] = React.useState<(Event & { 
    careerImpactLite?: CareerImpactScoreLite 
  })[]>(events);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !userProfile || events.length === 0) {
      setEnhancedEvents(events);
      return;
    }

    let isCancelled = false;

    async function enhanceEvents() {
      setIsLoading(true);
      
      try {
        const { CareerImpactUtils } = await import('@/utils/careerImpactUtils');
        const { CareerProfileService } = await import('@/services/careerProfileService');
        
        const careerProfile = CareerProfileService.getCareerProfile(userProfile);
        if (!careerProfile) {
          if (!isCancelled) {
            setEnhancedEvents(events);
            setIsLoading(false);
          }
          return;
        }

        const enhanced = await CareerImpactUtils.enhanceEventsWithCareerImpactLite(
          events,
          careerProfile
        );

        if (!isCancelled) {
          setEnhancedEvents(enhanced);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Failed to enhance events with career impact:', error);
        if (!isCancelled) {
          setEnhancedEvents(events);
          setIsLoading(false);
        }
      }
    }

    enhanceEvents();

    return () => {
      isCancelled = true;
    };
  }, [events, userProfile, enabled]);

  return { enhancedEvents, isLoading };
}
