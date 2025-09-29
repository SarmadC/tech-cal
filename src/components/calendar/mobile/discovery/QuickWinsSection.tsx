'use client';

import React from 'react';
import { Clock, Lightning } from '@phosphor-icons/react';
import { Event } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
// Use consolidated Event type - migration functionality handled through EventWithCareerImpact
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';

export interface QuickWinsSectionProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  onTrackEvent?: (event: Event) => void;
  className?: string;
  limit?: number;
}

const QuickWinsSection = React.memo<QuickWinsSectionProps>(({
  events,
  onEventSelect,
  onTrackEvent: _onTrackEvent,
  className = '',
  limit = 4
}) => {
  const quickWinEvents = React.useMemo(() => {
    return DiscoveryService.getQuickWinEvents(events, limit);
  }, [events, limit]);

  const handleEventClick = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleLearnMore = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);


  if (quickWinEvents.length === 0) {
    return (
      <DiscoverySection
        title="Quick Wins"
        subtitle="Short events you can fit into your schedule"
        icon={<Clock size={20} weight="fill" />}
        iconVariant="quick-wins"
        className={className}
      >
        <div className="discovery-empty-state">
          <Clock size={48} className="empty-icon" />
          <div className="empty-title">No quick events available</div>
          <div className="empty-subtitle">
            We&apos;ll show short events (under 2 hours) here when they become available.
          </div>
        </div>
      </DiscoverySection>
    );
  }

  return (
    <DiscoverySection
      title="Quick Wins"
      subtitle="Short sessions with high impact"
        icon={<Lightning size={20} weight="fill" />}
        iconVariant="quick-wins"
        className={className}
    >
      <div className="discovery-cards-container quick-wins-container">
        {quickWinEvents.map((event, index) => (
          <DiscoveryCard
            key={`${event.id}-${index}`}
            event={event}
            onClick={() => handleEventClick(event)}
            onLearnMore={() => handleLearnMore(event)}
            variant="compact"
            showLearnMore={true}
            className=""
          />
        ))}
      </div>

      <div className="quick-wins-info">
        <Clock size={16} />
        <span className="info-text">Perfect for busy schedules - all under 2 hours</span>
      </div>
    </DiscoverySection>
  );
});

QuickWinsSection.displayName = 'QuickWinsSection';

export default QuickWinsSection;
