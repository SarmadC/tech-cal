'use client';

import React from 'react';
import type { AppProfile, Event, EventType, TrackedEvent } from '@/types';
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
  const upcomingEvents = events.filter(event => new Date(event.startTime) > now);

  const forYouEvents = upcomingEvents.slice(0, 5);
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
