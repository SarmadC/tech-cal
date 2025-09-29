'use client';

import React from 'react';
import { Sparkle } from '@phosphor-icons/react';
import { Event } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
// Use consolidated Event type - migration functionality handled through EventWithCareerImpact
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';

export interface NewThisWeekSectionProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  onTrackEvent?: (event: Event) => void;
  className?: string;
  limit?: number;
}

const NewThisWeekSection = React.memo<NewThisWeekSectionProps>(({
  events,
  onEventSelect,
  onTrackEvent: _onTrackEvent,
  className = '',
  limit = 5
}) => {
  const newEvents = React.useMemo(() => {
    return DiscoveryService.getNewEvents(events, limit);
  }, [events, limit]);

  const handleEventClick = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleLearnMore = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);


  if (newEvents.length === 0) {
    return (
      <DiscoverySection
        title="New This Week"
        subtitle="Fresh events just added"
        icon={<Sparkle size={20} weight="fill" />}
        iconVariant="new-this-week"
        className={className}
      >
        <div className="discovery-empty-state">
          <Sparkle size={48} className="empty-icon" />
          <div className="empty-title">No new events this week</div>
          <div className="empty-subtitle">
            New events are added regularly. Check back tomorrow for fresh opportunities!
          </div>
        </div>
      </DiscoverySection>
    );
  }

  return (
    <DiscoverySection
      title="New This Week"
      subtitle="Fresh events just added to the platform"
      icon={<Sparkle size={20} weight="fill" />}
      className={className}
      showViewAll={newEvents.length >= limit}
      onViewAll={() => {
        // Handle view all new events
        // TODO: Navigate to full new events view
      }}
    >
      <div className="discovery-cards-container new-events-container">
        {newEvents.map((event, index) => (
          <DiscoveryCard
            key={`${event.id}-${index}`}
            event={event}
            onClick={() => handleEventClick(event)}
            onLearnMore={() => handleLearnMore(event)}
            variant="default"
            showLearnMore={true}
            className=""
          />
        ))}
      </div>

      {/* New Events Stats */}
      <div className="new-events-stats">
        <div className="stat-item">
          <Sparkle size={16} />
          <span className="stat-text">
            {newEvents.length} new event{newEvents.length !== 1 ? 's' : ''} this week
          </span>
        </div>
      </div>
    </DiscoverySection>
  );
});

NewThisWeekSection.displayName = 'NewThisWeekSection';

export default NewThisWeekSection;
