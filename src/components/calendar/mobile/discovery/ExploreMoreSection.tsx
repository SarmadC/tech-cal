'use client';

import React from 'react';
import { Compass } from '@phosphor-icons/react';
import type { Event } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';
import BentoGrid from '../../desktop/discovery/BentoGrid';

export interface ExploreMoreSectionProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  className?: string;
  userLocation?: { city?: string; country?: string; timezone?: string };
}

const ExploreMoreSection = React.memo<ExploreMoreSectionProps>(({
  events,
  onEventSelect,
  className = '',
  userLocation
}) => {
  // Organize events by type with consistent sizing
  // Events already have career impact scores from server
  const organizedEvents = React.useMemo(() => {
    // Filter out past events first
    const now = new Date();
    const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
    
    // Get top trending event
    const trending = DiscoveryService.getTrendingEvents(upcomingEvents, 1, userLocation);
    
    // Get 2-3 new events
    const newEvents = DiscoveryService.getNewEvents(upcomingEvents, 3);
    
    // Get 3-4 quick wins
    const quickWins = DiscoveryService.getQuickWinEvents(upcomingEvents, 4);
    
    // Create a map to track events and their types (all same size now)
    const eventMap = new Map<
      string,
      {
        event: Event;
        types: string[];
        size: 'medium'; // Consistent size for all cards
      }
    >();
    
    // Add trending events
    trending.forEach(e => {
      eventMap.set(e.id, { event: e, types: ['trending'], size: 'medium' });
    });
    
    // Add new events (avoid duplicates)
    newEvents.slice(0, 2).forEach(e => {
      const existing = eventMap.get(e.id);
      if (existing) {
        existing.types.push('new');
      } else {
        eventMap.set(e.id, { event: e, types: ['new'], size: 'medium' });
      }
    });
    
    // Add quick wins (avoid duplicates)
    quickWins.slice(0, 4).forEach(e => {
      const existing = eventMap.get(e.id);
      if (existing) {
        existing.types.push('quick');
      } else {
        eventMap.set(e.id, { event: e, types: ['quick'], size: 'medium' });
      }
    });
    
    // Convert to array and sort by priority (trending first)
    const sortedEvents = Array.from(eventMap.values()).sort((a, b) => {
      if (a.types.includes('trending') && !b.types.includes('trending')) return -1;
      if (!a.types.includes('trending') && b.types.includes('trending')) return 1;
      return 0;
    });
    
    return sortedEvents;
  }, [events, userLocation]);

  // Events already have career impact scores from server - no need to recalculate
  const exploreEvents = organizedEvents;

  const handleEventClick = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleLearnMore = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);


  if (exploreEvents.length === 0) {
    return (
      <DiscoverySection
        title="Explore More"
        subtitle="Trending, new, and quick events"
        icon={<Compass size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <div className="flex items-center gap-3 mb-4">
            <Compass size={24} className="text-gray-400" />
            <div className="empty-title">Nothing here yet</div>
          </div>
          <div className="empty-subtitle">
            Check back soon for trending events, new additions, and quick wins!
          </div>
        </div>
      </DiscoverySection>
    );
  }

  return (
    <DiscoverySection
      title="Explore More"
      subtitle="Trending, new, and quick events"
      icon={<Compass size={20} weight="fill" />}
      className={className}
    >
      <BentoGrid>
        {exploreEvents.map(({ event }, index) => (
          <DiscoveryCard
            key={`${event.id}-${index}`}
            event={event}
            onClick={() => handleEventClick(event)}
            onLearnMore={() => handleLearnMore(event)}
            variant="default"
            showLearnMore={false}
            showCareerImpact={false}
            className=""
          />
        ))}
      </BentoGrid>
    </DiscoverySection>
  );
});

ExploreMoreSection.displayName = 'ExploreMoreSection';

export default ExploreMoreSection;
