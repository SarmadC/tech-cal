'use client';

import React, { useState } from 'react';
import type { AppProfile, Event, EventType, TrackedEvent } from '@/types';
import { ForYouSection, ExploreMoreSection } from './';
import MobileDiscoveryNavbar from './MobileDiscoveryNavbar';
import MobileDiscoverySearchBar from './MobileDiscoverySearchBar';
import './mobile-discovery.css';

export interface MobileDiscoveryViewProps {
  events: TrackedEvent[];
  categories: EventType[];
  profile: AppProfile | null;
  trackedEvents: TrackedEvent[];
  onEventSelect: (event: Event) => void;
  className?: string;
  // Search & Filter props (optional - for integration)
  filters?: {
    searchTerm: string;
    locations: string[];
    dateRange: { start: Date | null; end: Date | null };
  };
  onUpdateFilter?: <K extends string>(key: K, value: unknown) => void;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
}

const MobileDiscoveryView: React.FC<MobileDiscoveryViewProps> = ({
  events,
  categories: _categories,
  profile,
  trackedEvents,
  onEventSelect,
  className = '',
  filters,
  onUpdateFilter,
  activeFilterCount = 0,
  onOpenFilters
}) => {
  const [showSearchBar, setShowSearchBar] = useState(false);
  // Filter to upcoming events, handling incomplete fields gracefully
  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    return events.filter(event => {
      // Check for incomplete event fields
      if (!event.startTime) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[MobileDiscoveryView] Event missing startTime:', event.id, event.title);
        }
        return false; // Skip events without startTime
      }
      
      try {
        const eventDate = new Date(event.startTime);
        return eventDate > now;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[MobileDiscoveryView] Invalid startTime:', event.id, event.startTime, error);
        }
        return false; // Skip events with invalid dates
      }
    });
  }, [events]);
  
  // For "For You" section, prioritize events with career impact scores
  // For cold start users, events will have baseline scores (20-40%)
  // For regular users, events will have personalized scores
  const forYouEvents = React.useMemo(() => {
    // Sort by career impact score if available
    const getScore = (e: Event): number => {
      return (e as { careerImpact?: { overall: number } }).careerImpact?.overall ?? 0;
    };
    
    const scoredEvents = upcomingEvents.filter(event => getScore(event) > 0);
    
    if (scoredEvents.length > 0) {
      const sorted = [...scoredEvents].sort((a, b) => {
        return getScore(b) - getScore(a);
      });
      
      // Debug logging (dev mode only)
      if (process.env.NODE_ENV !== 'production') {
        console.log('[MobileDiscoveryView] ForYou events:', {
          totalEvents: events.length,
          upcomingEvents: upcomingEvents.length,
          scoredEvents: scoredEvents.length,
          topScores: sorted.slice(0, 5).map(e => getScore(e))
        });
      }
      
      return sorted.slice(0, 5);
    }
    
    // Fallback: if no scored events, just take first 5 upcoming events
    // ForYouSection will handle showing trending events as fallback
    return upcomingEvents.slice(0, 5);
  }, [upcomingEvents, events]);
  
  const forYouIds = new Set(forYouEvents.map(event => event.id));
  const exploreMoreEvents = upcomingEvents.filter(event => !forYouIds.has(event.id));

  return (
    <div className={`mobile-discovery-view ${className} bg-background text-foreground`} role="main" aria-label="Discover tech events">
      <MobileDiscoveryNavbar />
      <div className="mobile-discovery-stack">
        {/* Search Bar - Optional integration */}
        {filters && onUpdateFilter && (
          <div className="px-4 pt-4">
            <MobileDiscoverySearchBar
              searchTerm={filters.searchTerm}
              onSearchChange={(val) => onUpdateFilter('searchTerm', val)}
              location={filters.locations[0] || ''}
              onLocationChange={(val) => onUpdateFilter('locations', val ? [val] : [])}
              dateRange={filters.dateRange}
              onDateRangeChange={(range) => onUpdateFilter('dateRange', range)}
              activeFilterCount={activeFilterCount}
              onFilterClick={() => onOpenFilters?.()}
            />
          </div>
        )}

        <div className="mobile-discovery-section-wrapper">
          <ForYouSection
            events={forYouEvents}
            userProfile={profile}
            trackedEvents={trackedEvents}
            onEventSelect={onEventSelect}
          />
        </div>
        <div className="mobile-discovery-section-wrapper">
          <ExploreMoreSection
            events={exploreMoreEvents}
            onEventSelect={onEventSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default MobileDiscoveryView;
