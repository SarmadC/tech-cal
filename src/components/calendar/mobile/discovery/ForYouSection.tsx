'use client';

import React, { useRef } from 'react';
import { User } from '@phosphor-icons/react';
import { Event, AppProfile, TrackedEvent } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
import { PersonalizedDiscoveryService } from '@/services/personalizedDiscoveryService';
// Use consolidated Event type - recommendation functionality handled through EventWithCareerImpact
import { useForYouTracking } from '@/hooks/useRecommendationTracking';
import { hasCompleteCareerProfile, extractCareerProfile } from '@/utils/profileTypeGuards';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';
import CareerProfilePrompt from './CareerProfilePrompt';

export interface ForYouSectionProps {
  events: Event[];
  userProfile: AppProfile | null;
  trackedEvents?: TrackedEvent[];
  onEventSelect?: (event: Event) => void;
  onTrackEvent?: (event: Event) => void;
  className?: string;
  limit?: number;
  userLocation?: { city?: string; country?: string; timezone?: string };
}

const ForYouSection = React.memo<ForYouSectionProps>(({
  events,
  userProfile,
  trackedEvents = [],
  onEventSelect,
  onTrackEvent: _onTrackEvent,
  className = '',
  limit = 5,
  userLocation
}) => {
  const careerProfile = React.useMemo(() => extractCareerProfile(userProfile), [userProfile]);
  const hasCareerProfile = React.useMemo(() => hasCompleteCareerProfile(careerProfile), [careerProfile]);
  const supabase = React.useMemo(() => createClient(), []);
  
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

  // Create a stable cache key based on relevant data
  const cacheKey = React.useMemo(() => {
    if (!hasCareerProfile || !userProfile) return null;
    return `for-you-${userProfile.id}-${events.length}-${trackedEvents.length}-${limit}-${userLocation?.city || ''}-${userLocation?.timezone || ''}`;
  }, [hasCareerProfile, userProfile, events.length, trackedEvents.length, limit, userLocation]);

  // Use React Query for caching and performance optimization
  const {
    data: personalizedEvents = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['personalizedRecommendations', cacheKey],
    queryFn: async () => {
      if (!hasCareerProfile || !userProfile) return [];
      
      try {
        // Use fast personalized discovery service for better performance
        // This will automatically choose between fast and advanced based on user data
        const personalized = await PersonalizedDiscoveryService.getAdvancedPersonalizedRecommendations(
          events,
          userProfile,
          trackedEvents,
          supabase,
          limit,
          userLocation
        );

        // Track recommendation display (with error handling)
        if (isTrackingEnabled && personalized.length > 0) {
          try {
            const recommendationData = personalized.map((event, index) => ({
              eventId: event.id,
              score: 0, // Score removed as discoveryMetrics not available in consolidated Event type
              position: index + 1
            }));
            
            trackForYouDisplayRef.current(recommendationData);
          } catch (trackingError) {
            console.warn('Recommendation tracking failed:', trackingError);
            // Continue without tracking - don't break the UI
          }
        }

        return personalized;
      } catch (personalizedError) {
        console.warn('Personalized recommendations failed, falling back to basic:', personalizedError);
        // Fallback to basic recommendations (migrate to unified type)
        return DiscoveryService.getPersonalizedRecommendations(
          events,
          userProfile,
          trackedEvents,
          limit,
          userLocation
        );
      }
    },
    enabled: !!(hasCareerProfile && userProfile && cacheKey),
    staleTime: 5 * 60 * 1000, // 5 minutes - recommendations stay fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache cleanup
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
    refetchOnMount: false, // Don't refetch when component remounts
    retry: 1, // Only retry once on failure
  });

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


  // Show career profile prompt if user doesn't have complete profile
  if (!hasCareerProfile && userProfile) {
    return (
      <DiscoverySection
        title="For You"
        subtitle="Personalized Recommendations"
        icon={<User size={20} weight="fill" />}
        iconVariant="for-you"
        className={className}
      >
        <CareerProfilePrompt profile={userProfile} />
      </DiscoverySection>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <DiscoverySection
        title="For You"
        subtitle="Personalized Recommendations"
        icon={<User size={20} weight="fill" />}
        iconVariant="for-you"
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
        subtitle="Personalized Recommendations"
        icon={<User size={20} weight="fill" />}
        iconVariant="for-you"
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

  // Show empty state with helpful message if no events found
  if (personalizedEvents.length === 0) {
    return (
      <DiscoverySection
        title="For You"
        subtitle="Personalized Recommendations"
        icon={<User size={20} weight="fill" />}
        iconVariant="for-you"
        className={className}
      >
        <div className="discovery-empty-state">
          <User size={48} className="empty-icon" />
          <div className="empty-title">Building your recommendations</div>
          <div className="empty-subtitle">
            We&apos;re analyzing events that match your career profile. Check back soon for personalized suggestions!
          </div>
        </div>
      </DiscoverySection>
    );
  }

  return (
    <DiscoverySection
      title="For You"
      subtitle="Personalized Recommendations"
      icon={<User size={20} weight="fill" />}
      className={className}
      showViewAll={personalizedEvents.length >= limit}
      onViewAll={() => {
        // Handle view all - could navigate to a full personalized feed
        // TODO: Navigate to full personalized recommendations view
      }}
    >
      <div className="discovery-cards-container">
        {personalizedEvents.map((event, index) => (
          <DiscoveryCard
            key={`${event.id}-${index}`}
            event={event}
            onClick={() => handleEventClick(event, index)}
            onView={() => handleEventView(event, index)}
            onLearnMore={() => handleLearnMore(event, index)}
            variant={index === 0 ? 'featured' : 'default'}
            showLearnMore={true}
            className=""
          />
        ))}
      </div>
      
      {personalizedEvents.length === 0 && userProfile && (
        <div className="empty-state">
          <User size={32} className="empty-icon" />
          <p className="empty-text">
            We&apos;re learning your preferences. Track some events to get personalized recommendations!
          </p>
        </div>
      )}
      
      {!userProfile && (
        <div className="empty-state">
          <User size={32} className="empty-icon" />
          <p className="empty-text">
            Sign in to get personalized event recommendations tailored to your interests.
          </p>
        </div>
      )}
    </DiscoverySection>
  );
});

ForYouSection.displayName = 'ForYouSection';

export default ForYouSection;
