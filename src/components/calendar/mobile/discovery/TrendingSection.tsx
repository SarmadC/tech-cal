'use client';

import React from 'react';
import { Fire, TrendUp } from '@phosphor-icons/react';
import { Event } from '@/types';
import { DiscoveryService, DiscoveryEvent } from '@/services/discoveryService';
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
  onTrackEvent,
  className = '',
  limit = 5,
  userLocation
}) => {
  const trendingEvents = React.useMemo(() => {
    return DiscoveryService.getTrendingEvents(events, limit, userLocation);
  }, [events, limit, userLocation]);

  const handleEventClick = (event: DiscoveryEvent) => {
    onEventSelect?.(event);
  };

  const handleTrackEvent = (event: DiscoveryEvent) => {
    onTrackEvent?.(event);
  };

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
        console.log('View all trending events');
      }}
    >
      <div className="discovery-cards-container trending-container">
        {/* Featured trending event */}
        {featuredEvent && (
          <div className="featured-trending">
            <DiscoveryCard
              event={featuredEvent}
              onClick={() => handleEventClick(featuredEvent)}
              onTrack={() => handleTrackEvent(featuredEvent)}
              variant="featured"
              className="trending-featured-card"
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
                onTrack={() => handleTrackEvent(event)}
                variant="compact"
                className="trending-card"
              />
            ))}
          </div>
        )}
      </div>

      {/* Trending Stats */}
      <div className="trending-stats">
        <div className="stat-item">
          <TrendUp size={16} />
          <span className="stat-text">
            {trendingEvents.reduce((sum, event) => sum + (event.attendeeCount || 0), 0).toLocaleString()} 
            people interested this week
          </span>
        </div>
      </div>
    </DiscoverySection>
  );
});

TrendingSection.displayName = 'TrendingSection';

export default TrendingSection;
