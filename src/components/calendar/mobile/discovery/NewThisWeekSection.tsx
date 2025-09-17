'use client';

import React from 'react';
import { Sparkle, Plus } from '@phosphor-icons/react';
import { Event } from '@/types';
import { DiscoveryService, DiscoveryEvent } from '@/services/discoveryService';
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
  onTrackEvent,
  className = '',
  limit = 5
}) => {
  const newEvents = React.useMemo(() => {
    return DiscoveryService.getNewEvents(events, limit);
  }, [events, limit]);

  const handleEventClick = (event: DiscoveryEvent) => {
    onEventSelect?.(event);
  };

  const handleTrackEvent = (event: DiscoveryEvent) => {
    onTrackEvent?.(event);
  };

  if (newEvents.length === 0) {
    return (
      <DiscoverySection
        title="New This Week"
        subtitle="Fresh events just added"
        icon={<Sparkle size={20} weight="fill" />}
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
        console.log('View all new events');
      }}
    >
      <div className="discovery-cards-container new-events-container">
        {newEvents.map((event, index) => (
          <div key={`${event.id}-${index}`} className="new-event-wrapper">
            <DiscoveryCard
              event={event}
              onClick={() => handleEventClick(event)}
              onTrack={() => handleTrackEvent(event)}
              variant="default"
              className="new-event-card"
            />
            
            {/* New badge */}
            <div className="new-badge">
              <Plus size={12} />
              <span>NEW</span>
            </div>
          </div>
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
