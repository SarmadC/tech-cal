'use client';

import React from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import { isProfileEmpty } from '@/utils/profileTypeGuards';
import ForYouSection from '../../mobile/discovery/ForYouSection';
import ExploreMoreSection from '../../mobile/discovery/ExploreMoreSection';
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
  
  // Detect if profile is empty (profile-based cold start)
  const isColdStart = React.useMemo(() => isProfileEmpty(profile), [profile]);
  
  // Select top events for "For You" section
  // Events are already sorted by career impact score on the server (when sortBy is 'career-impact')
  // We just need to filter by quality threshold and take the top ones
  const personalizedEvents = React.useMemo(() => {
    const now = new Date();
    
    // Filter to upcoming events, handling incomplete fields gracefully
    const upcomingEvents = events.filter(event => {
      // Check for incomplete event fields
      if (!event.startTime) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Discovery] Event missing startTime:', event.id, event.title);
        }
        return false; // Skip events without startTime
      }
      
      try {
        const eventDate = new Date(event.startTime);
        return eventDate > now;
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Discovery] Invalid startTime:', event.id, event.startTime, error);
        }
        return false; // Skip events with invalid dates
      }
    });
    
    // Get career impact score helper
    type MaybeScored = { careerImpact?: { overall: number } };
    const getScore = (e: Event): number => (e as MaybeScored).careerImpact?.overall ?? 0;
    
    // Lower thresholds to show more events
    // Cold start users: 10%+ (more lenient)
    // Regular users: 15%+ (lowered from 25%)
    const minScore = isColdStart ? 10 : 15;
    
    // Debug logging (dev mode only)
    if (process.env.NODE_ENV !== 'production') {
      const scoredEvents = upcomingEvents.filter(event => getScore(event) > 0);
      const scoreDistribution = scoredEvents.map(e => getScore(e)).sort((a, b) => b - a);
      console.log('[Discovery] Event filtering debug:', {
        totalEvents: events.length,
        upcomingEvents: upcomingEvents.length,
        eventsWithScores: scoredEvents.length,
        minScore,
        isColdStart,
        scoreDistribution: scoreDistribution.slice(0, 10), // Top 10 scores
        eventsAboveThreshold: upcomingEvents.filter(e => getScore(e) >= minScore).length
      });
    }
    
    // Filter events by quality threshold
    // Events are already sorted by server, so we just filter and take top ones
    const qualityEvents = upcomingEvents.filter(event => {
      const score = getScore(event);
      // Show events that were successfully scored above the threshold
      return score > 0 && score >= minScore;
    });
    
    // Improved fallback logic: show more events when threshold yields too few
    if (qualityEvents.length < 4) {
      // Fallback: show top events by score even if below threshold, but still > 0
      const fallbackEvents = upcomingEvents
        .filter(event => getScore(event) > 0)
        .sort((a, b) => getScore(b) - getScore(a))
        .slice(0, 8);
      
      if (process.env.NODE_ENV !== 'production' && fallbackEvents.length > 0) {
        console.log('[Discovery] Using fallback - showing', fallbackEvents.length, 'events below threshold');
      }
      
      return fallbackEvents;
    }
    
    return qualityEvents.slice(0, 8);
  }, [events, isColdStart]);
  
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
