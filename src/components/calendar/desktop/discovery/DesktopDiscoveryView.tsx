'use client';

import React from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import { 
  ForYouSection, 
  TrendingSection, 
  NewThisWeekSection, 
  QuickWinsSection 
} from '../../mobile/discovery';
import DiscoveryErrorBoundary from '../../mobile/discovery/DiscoveryErrorBoundary';
import DiscoveryAlgorithmErrorBoundary from '../../mobile/discovery/DiscoveryAlgorithmErrorBoundary';
import { useUserLocation } from '@/hooks/useUserLocation';
import './desktop-discovery.css';

export interface DesktopDiscoveryViewProps {
  events: Event[];
  categories: EventType[];
  profile: AppProfile | null;
  trackedEvents?: TrackedEvent[];
  onEventSelect?: (event: Event) => void;
  onTrackEvent?: (event: Event) => void;
  className?: string;
}

const DesktopDiscoveryView: React.FC<DesktopDiscoveryViewProps> = ({
  events,
  categories: _categories,
  profile,
  trackedEvents = [],
  onEventSelect,
  onTrackEvent,
  className = ''
}) => {
  // Get user location for location-aware recommendations
  const { location: userLocation } = useUserLocation(profile);

  return (
    <div className={`desktop-discovery-view ${className}`} role="main" aria-label="Discover tech events">
      {/* Discovery Header */}
      <div className="discovery-header">
        <div className="discovery-title-section">
          <h1 className="discovery-title">Discover Events</h1>
          <p className="discovery-subtitle">
            Personalized recommendations tailored to your career and interests
          </p>
        </div>
      </div>

      {/* Discovery Grid Layout */}
      <div className="discovery-grid">
        {/* Left Column - Primary Recommendations */}
        <div className="discovery-primary">
          {/* For You Section */}
              <div className="discovery-section-wrapper">
                <DiscoveryErrorBoundary sectionName="For You">
                  <DiscoveryAlgorithmErrorBoundary algorithmName="Personalization">
                    <ForYouSection
                events={events}
                userProfile={profile}
                trackedEvents={trackedEvents}
                onEventSelect={onEventSelect}
                onTrackEvent={onTrackEvent}
                userLocation={userLocation || undefined}
                limit={8}
                    className="desktop-for-you"
                  />
                  </DiscoveryAlgorithmErrorBoundary>
                </DiscoveryErrorBoundary>
              </div>

          {/* Trending Section */}
          <div className="discovery-section-wrapper">
            <DiscoveryErrorBoundary sectionName="Trending">
              <TrendingSection
                events={events}
                onEventSelect={onEventSelect}
                onTrackEvent={onTrackEvent}
                userLocation={userLocation || undefined}
                limit={6}
                className="desktop-trending"
              />
            </DiscoveryErrorBoundary>
          </div>
        </div>

        {/* Right Column - Secondary Recommendations */}
        <div className="discovery-secondary">
          {/* New This Week Section */}
          <div className="discovery-section-wrapper">
            <DiscoveryErrorBoundary sectionName="New This Week">
              <NewThisWeekSection
                events={events}
                onEventSelect={onEventSelect}
                onTrackEvent={onTrackEvent}
                limit={5}
                className="desktop-new"
              />
            </DiscoveryErrorBoundary>
          </div>

          {/* Quick Wins Section */}
          <div className="discovery-section-wrapper">
            <DiscoveryErrorBoundary sectionName="Quick Wins">
              <QuickWinsSection
                events={events}
                onEventSelect={onEventSelect}
                onTrackEvent={onTrackEvent}
                limit={5}
                className="desktop-quick-wins"
              />
            </DiscoveryErrorBoundary>
          </div>
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
