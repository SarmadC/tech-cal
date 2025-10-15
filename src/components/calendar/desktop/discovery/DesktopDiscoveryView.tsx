'use client';

import React from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import { 
  ForYouSection,
  ExploreMoreSection
} from '../../mobile/discovery';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useUserLocation } from '@/hooks/useUserLocation';
import './desktop-discovery.css';

export interface DesktopDiscoveryViewProps {
  events: Event[];
  categories: EventType[];
  profile: AppProfile | null;
  trackedEvents?: TrackedEvent[];
  onEventSelect?: (event: Event) => void;
  className?: string;
}

const DesktopDiscoveryView: React.FC<DesktopDiscoveryViewProps> = ({
  events,
  categories: _categories,
  profile,
  trackedEvents = [],
  onEventSelect,
  className = ''
}) => {
  // Get user location for location-aware recommendations
  const { location: userLocation } = useUserLocation(profile);
  
  // Sort events by career impact score (already attached by server)
  // Take top events for "For You" section
  const personalizedEvents = React.useMemo(() => {
    const upcomingEvents = events.filter(event => new Date(event.startTime) > new Date());
    
    // Sort by career impact score (server-side scoring)
    type MaybeScored = { careerImpact?: { overall: number } };
    const getScore = (e: Event): number => (e as MaybeScored).careerImpact?.overall ?? 0;
    const sorted = [...upcomingEvents].sort((a, b) => getScore(b) - getScore(a));
    
    // Only include events with meaningful scores for For You section
    // Quality thresholds:
    // - High quality: 50%+ (strong recommendations)
    // - Medium quality: 25%+ (decent recommendations) 
    // - Low quality: <25% (not recommended)
    // - No score: 0% (not recommended - scoring failed)
    const qualityEvents = sorted.filter(event => {
      const score = getScore(event);
      // Only show events that were successfully scored with at least 25% match
      return score > 0 && score >= 25;
    });
    
    // Take top 8 high-quality events
    return qualityEvents.slice(0, 8);
  }, [events]);
  
  // Filter out personalized events from explore more section
  const exploreMoreEvents = React.useMemo(() => {
    if (personalizedEvents.length === 0) {
      return events;
    }
    
    const personalizedEventIds = new Set(personalizedEvents.map(event => event.id));
    return events.filter(event => !personalizedEventIds.has(event.id));
  }, [events, personalizedEvents]);

  return (
    <div className={`desktop-discovery-view ${className}`} role="main" aria-label="Discover tech events">

      {/* Discovery Grid V2 - Bento Layout */}
      <div className="discovery-grid-v2">
        {/* Section 1: For You (Personalized Bento) */}
        <div className="discovery-section-wrapper">
          <ErrorBoundary name="ForYou">
            <ForYouSection
              events={personalizedEvents}
              userProfile={profile}
              trackedEvents={trackedEvents}
              onEventSelect={onEventSelect}
              userLocation={userLocation || undefined}
              limit={8}
              renderAsBento={true}
              className="desktop-for-you"
              skipPersonalization={false}
            />
          </ErrorBoundary>
        </div>

        {/* Section 2: Explore More (Mixed Bento) */}
        <div className="discovery-section-wrapper">
          <ErrorBoundary name="ExploreMore">
            <ExploreMoreSection
              events={exploreMoreEvents}
              onEventSelect={onEventSelect}
              userLocation={userLocation || undefined}
              className="desktop-explore-more"
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Empty State */}
      {events.length === 0 && (
        <div className="discovery-empty-state">
          <div className="empty-content">
            <h3>No events available</h3>
            <p>Check back later for new events and recommendations</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopDiscoveryView;
