'use client';

import React from 'react';
import { Fire } from '@phosphor-icons/react';
import { Event } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
// Use consolidated Event type - migration functionality handled through EventWithCareerImpact
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';

export interface TrendingSectionProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  onTrackEvent?: (event: Event) => void;
  className?: string;
  limit?: number;
  userLocation?: { city?: string; country?: string; timezone?: string };
}

const TrendingSection = React.memo<TrendingSectionProps>(({
  events,
  onEventSelect,
  onTrackEvent: _onTrackEvent,
  className = '',
  limit = 5,
  userLocation
}) => {
  const trendingEvents = React.useMemo(() => {
    return DiscoveryService.getTrendingEvents(events, limit, userLocation);
  }, [events, limit, userLocation]);

  const handleEventClick = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);


  if (trendingEvents.length === 0) {
    return (
      <DiscoverySection
        title="Trending"
        subtitle="Popular events gaining momentum"
        icon={<Fire size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <Fire size={48} className="empty-icon" />
          <div className="empty-title">No trending events right now</div>
          <div className="empty-subtitle">
            Check back soon to see what&apos;s gaining momentum in the tech community!
          </div>
        </div>
      </DiscoverySection>
    );
  }

  // Get the top trending event for featured display
  const featuredEvent = trendingEvents[0];
  const otherEvents = trendingEvents.slice(1);

  return (
    <DiscoverySection
      title="Trending Now"
      subtitle="Popular events gaining momentum"
      icon={<Fire size={20} weight="fill" />}
      className={className}
      showViewAll={trendingEvents.length >= limit}
      onViewAll={() => {
        // Handle view all trending events
        // TODO: Navigate to full trending view
      }}
    >
      <div className="discovery-cards-container trending-container">
        {/* Featured trending event */}
        {featuredEvent && (
          <div className="featured-trending">
            <DiscoveryCard
              event={featuredEvent}
              onClick={() => handleEventClick(featuredEvent)}
              variant="featured"
              className=""
            />
          </div>
        )}

        {/* Other trending events */}
        {otherEvents.length > 0 && (
          <div className="trending-list">
            {otherEvents.map((event, index) => (
              <DiscoveryCard
                key={`${event.id}-${index}`}
                event={event}
                onClick={() => handleEventClick(event)}
                variant="compact"
                className=""
              />
            ))}
          </div>
        )}
      </div>

    </DiscoverySection>
  );
});

TrendingSection.displayName = 'TrendingSection';

export default TrendingSection;
