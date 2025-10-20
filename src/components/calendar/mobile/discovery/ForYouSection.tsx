'use client';

import React, { useRef } from 'react';
import { User } from '@phosphor-icons/react';
import { Event, AppProfile, TrackedEvent } from '@/types';
// Use consolidated Event type - recommendation functionality handled through EventWithCareerImpact
import { useForYouTracking } from '@/hooks/useRecommendationTracking';
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';
// import CareerProfilePrompt from './CareerProfilePrompt'; // Removed - using enhanced empty state instead
import BentoGrid from '../../desktop/discovery/BentoGrid';

export interface ForYouSectionProps {
  events: Event[];
  userProfile: AppProfile | null;
  trackedEvents?: TrackedEvent[];
  onEventSelect?: (event: Event) => void;
  onTrackEvent?: (event: Event) => void;
  className?: string;
  limit?: number;
  userLocation?: { city?: string; country?: string; timezone?: string };
  renderAsBento?: boolean;
  skipPersonalization?: boolean;
}

const ForYouSection = React.memo<ForYouSectionProps>(({
  events,
  userProfile,
  trackedEvents: _trackedEvents = [],
  onEventSelect,
  onTrackEvent: _onTrackEvent,
  className = '',
  limit = 5,
  userLocation: _userLocation,
  renderAsBento = false,
  skipPersonalization = false
}) => {
  const careerProfileLoading = false;
  const hasCareerProfile = true;
  
  // Personalized tracking for For You section
  const tracking = useForYouTracking();
  const {
    trackForYouView,
    trackForYouClick,
    isTrackingEnabled
  } = tracking;

  // Stable reference for trackForYouDisplay to prevent infinite re-renders
  const trackForYouDisplayRef = useRef(tracking.trackForYouDisplay);
  trackForYouDisplayRef.current = tracking.trackForYouDisplay;

  // Use React Query for caching and performance optimization (disabled in server-scored mode)
  const isLoading = false;
  const error: Error | null = null;
  
  // For now, we're using server-side scoring, so we use the passed events directly
  // (In the future, this could be replaced with React Query for client-side personalization)
  const personalizedEvents: Event[] = events;

  // Use passed events directly (they are already scored by the server)
  const finalEvents = React.useMemo(() => {
    // Filter out past events and limit results
    const now = new Date();
    return events.filter(event => new Date(event.startTime) > now).slice(0, limit);
  }, [events, limit]);

  // Debug logging (dev only)
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('ForYouSection Debug:', {
        hasCareerProfile,
        userProfile: !!userProfile,
        eventsCount: events.length,
        personalizedEventsCount: personalizedEvents.length,
        finalEventsCount: finalEvents.length,
        skipPersonalization,
        isLoading,
        error: false
      });
    }
  }, [hasCareerProfile, userProfile, events.length, personalizedEvents.length, finalEvents.length, skipPersonalization, isLoading, error]);

  const handleEventClick = React.useCallback((event: Event, position: number) => {
    // Track click interaction
    if (isTrackingEnabled) {
      trackForYouClick(event.id, position + 1);
    }
    
    onEventSelect?.(event);
  }, [onEventSelect, trackForYouClick, isTrackingEnabled]);

  const handleLearnMore = React.useCallback((event: Event, position: number) => {
    // Track learn more interaction
    if (isTrackingEnabled) {
      trackForYouClick(event.id, position + 1);
    }
    
    onEventSelect?.(event);
  }, [onEventSelect, trackForYouClick, isTrackingEnabled]);

  const handleEventView = React.useCallback((event: Event, position: number) => {
    // Track view interaction
    if (isTrackingEnabled) {
      trackForYouView(event.id, position + 1);
    }
  }, [trackForYouView, isTrackingEnabled]);


  // Remove the CareerProfilePrompt - we'll handle this in the empty state below

  // Show loading state
  if (isLoading || careerProfileLoading) {
    return (
      <DiscoverySection
        title="For You"
        icon={<User size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-loading-state">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </DiscoverySection>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <DiscoverySection
        title="For You"
        icon={<User size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <User size={48} className="empty-icon" />
          <div className="empty-title">Unable to load recommendations</div>
          <div className="empty-subtitle">
            There was an issue loading your personalized recommendations. Please try refreshing the page.
          </div>
        </div>
      </DiscoverySection>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <DiscoverySection
        title="For You"
        icon={<User size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <div className="empty-icon-container">
            <User size={48} className="empty-icon" />
            <div className="empty-icon-bg"></div>
          </div>
          <div className="empty-title">Loading your recommendations...</div>
          <div className="empty-subtitle">
            We&apos;re finding the best events for your career goals.
          </div>
        </div>
      </DiscoverySection>
    );
  }

  // Show error state
  if (error) {
    return (
      <DiscoverySection
        title="For You"
        icon={<User size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <div className="empty-icon-container">
            <User size={48} className="empty-icon" />
            <div className="empty-icon-bg"></div>
          </div>
          <div className="empty-title">Unable to load recommendations</div>
          <div className="empty-subtitle">
            There was an issue loading your personalized events. Please try again.
          </div>
          <div className="empty-actions">
            <button 
              className="empty-cta-primary"
              onClick={() => {
                console.log('Retry recommendations');
              }}
            >
              Try Again
            </button>
            <button 
              className="empty-cta-secondary"
              onClick={() => {
                console.log('Navigate to explore more');
              }}
            >
              Browse All Events
            </button>
          </div>
        </div>
      </DiscoverySection>
    );
  }

  // Show empty state with helpful message if no events found OR if profile is incomplete
  if (finalEvents.length === 0) {
    console.log('Rendering empty state:', { hasCareerProfile, finalEventsLength: finalEvents.length });

    return (
      <DiscoverySection
        title="For You"
        icon={<User size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <div className="empty-icon-container">
            <User size={48} className="empty-icon" />
            <div className="empty-icon-bg"></div>
          </div>
          <div className="empty-title">
            Building your personalized feed
          </div>
          <div className="empty-subtitle">
            We&apos;re analyzing upcoming events to find the best matches.
          </div>
          <div className="empty-actions">
            <button 
              className="empty-cta-primary"
              onClick={() => {
                console.log('Navigate to profile completion');
              }}
            >
              Refresh Recommendations
            </button>
            <button 
              className="empty-cta-secondary"
              onClick={() => {
                console.log('Navigate to explore more');
              }}
            >
              Browse All Events
            </button>
          </div>
        </div>
      </DiscoverySection>
    );
  }

  // Use consistent card size for all cards

  const cardsContent = finalEvents.map((event, index) => (
    <DiscoveryCard
      key={`${event.id}-${index}`}
      event={event}
      onClick={() => handleEventClick(event, index)}
      onView={() => handleEventView(event, index)}
      onLearnMore={() => handleLearnMore(event, index)}
      variant={index === 0 ? 'featured' : 'default'}
      showLearnMore={false}
      className=""
    />
  ));

  return (
    <DiscoverySection
      title="For You"
      icon={<User size={20} weight="fill" />}
      className={className}
      showViewAll={personalizedEvents.length >= limit}
      onViewAll={() => {
        // Handle view all - could navigate to a full personalized feed
        // TODO: Navigate to full personalized recommendations view
      }}
    >
      {renderAsBento ? (
        <BentoGrid>{cardsContent}</BentoGrid>
      ) : (
        <div className="discovery-cards-container">{cardsContent}</div>
      )}
    </DiscoverySection>
  );
});

ForYouSection.displayName = 'ForYouSection';

export default ForYouSection;
