'use client';

import React from 'react';
import type { AppProfile, Event, EventType, TrackedEvent } from '@/types';
import { isProfileEmpty } from '@/utils/profileTypeGuards';
import { ForYouSection, ExploreMoreSection } from './';
import MobileDiscoveryNavbar from './MobileDiscoveryNavbar';
import './mobile-discovery.css';

export interface MobileDiscoveryViewProps {
  events: TrackedEvent[];
  categories: EventType[];
  profile: AppProfile | null;
  trackedEvents: TrackedEvent[];
  onEventSelect: (event: Event) => void;
  className?: string;
}

const MobileDiscoveryView: React.FC<MobileDiscoveryViewProps> = ({
  events,
  categories: _categories,
  profile,
  trackedEvents,
  onEventSelect,
  className = ''
}) => {
  const now = new Date();
  
  // Filter to upcoming events, handling incomplete fields gracefully
  const upcomingEvents = React.useMemo(() => {
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
  }, [events, now]);
  
  // Detect if profile is empty (profile-based cold start)
  const isColdStart = React.useMemo(() => isProfileEmpty(profile), [profile]);
  
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
    <div className={`mobile-discovery-view ${className}`} role="main" aria-label="Discover tech events">
      <MobileDiscoveryNavbar />
      <div className="mobile-discovery-stack">
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
