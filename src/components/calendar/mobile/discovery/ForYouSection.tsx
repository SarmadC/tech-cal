'use client';

import React, { useRef } from 'react';
import { User } from '@phosphor-icons/react';
import { Event, AppProfile, TrackedEvent } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
import { EnhancedDiscoveryService } from '@/services/enhancedDiscoveryService';
import { RecommendationEvent, migrateDiscoveryEvent } from '@/types/unifiedEventTypes';
import { useForYouTracking } from '@/hooks/useRecommendationTracking';
import { hasCompleteCareerProfile, extractCareerProfile } from '@/utils/profileTypeGuards';
import { createClient } from '@/utils/supabase/client';
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
  
  // Enhanced tracking for For You section
  const tracking = useForYouTracking();
  const {
    trackForYouView,
    trackForYouClick,
    isTrackingEnabled
  } = tracking;

  // Stable reference for trackForYouDisplay to prevent infinite re-renders
  const trackForYouDisplayRef = useRef(tracking.trackForYouDisplay);
  trackForYouDisplayRef.current = tracking.trackForYouDisplay;

  const [personalizedEvents, setPersonalizedEvents] = React.useState<RecommendationEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastFetchKey, setLastFetchKey] = React.useState<string>('');

  // Create a stable cache key based on relevant data
  const cacheKey = React.useMemo(() => {
    if (!hasCareerProfile || !userProfile) return '';
    return `${userProfile.id}-${events.length}-${trackedEvents.length}-${limit}-${userLocation?.city || ''}-${userLocation?.timezone || ''}`;
  }, [hasCareerProfile, userProfile, events.length, trackedEvents.length, limit, userLocation]);

  // Enhanced recommendations with behavioral data
  React.useEffect(() => {
    let isCancelled = false; // Prevent memory leaks

    async function loadEnhancedRecommendations() {
      if (!hasCareerProfile || !userProfile) {
        if (!isCancelled) {
          setPersonalizedEvents([]);
          setIsLoading(false);
          setLastFetchKey('');
        }
        return;
      }

      // Skip if we already have data for this cache key
      if (cacheKey === lastFetchKey && personalizedEvents.length > 0) {
        if (!isCancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!isCancelled) {
          setIsLoading(true);
        }
        
        // Use enhanced discovery service with behavioral data
        let enhanced: RecommendationEvent[] = [];
        
        try {
          enhanced = await EnhancedDiscoveryService.getEnhancedPersonalizedRecommendations(
            events,
            userProfile,
            trackedEvents,
            supabase,
            limit,
            userLocation
          );
        } catch (enhancedError) {
          console.warn('Enhanced recommendations failed, falling back to basic:', enhancedError);
          // Fallback to basic recommendations (migrate to unified type)
          const basicRecs = DiscoveryService.getPersonalizedRecommendations(
            events,
            userProfile,
            trackedEvents,
            limit,
            userLocation
          );
          enhanced = basicRecs.map(event => migrateDiscoveryEvent(event));
        }

        // Only update state if component is still mounted
        if (!isCancelled) {
          setPersonalizedEvents(enhanced);
          setLastFetchKey(cacheKey);

          // Track recommendation display (with error handling)
          if (isTrackingEnabled && enhanced.length > 0) {
            try {
              const recommendationData = enhanced.map((event, index) => ({
                eventId: event.id,
                score: event.discoveryMetrics?.personalizedScore || 0,
                position: index + 1
              }));
              
              trackForYouDisplayRef.current(recommendationData);
            } catch (trackingError) {
              console.warn('Recommendation tracking failed:', trackingError);
              // Continue without tracking - don't break the UI
            }
          }
        }

      } catch (error) {
        if (!isCancelled) {
          console.error('Error loading enhanced recommendations:', error);
          // Fallback to basic recommendations
          const basic = DiscoveryService.getPersonalizedRecommendations(
            events,
            userProfile,
            trackedEvents,
            limit,
            userLocation
          );
          setPersonalizedEvents(basic.map(event => migrateDiscoveryEvent(event)));
          setLastFetchKey(cacheKey);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadEnhancedRecommendations();

    // Cleanup function to prevent memory leaks
    return () => {
      isCancelled = true;
    };
  }, [cacheKey, hasCareerProfile, userProfile, personalizedEvents.length, lastFetchKey, events, isTrackingEnabled, limit, supabase, trackedEvents, userLocation]);

  const handleEventClick = React.useCallback((event: RecommendationEvent, position: number) => {
    // Track click interaction
    if (isTrackingEnabled) {
      trackForYouClick(event.id, position + 1);
    }
    
    onEventSelect?.(event);
  }, [onEventSelect, trackForYouClick, isTrackingEnabled]);

  const handleEventView = React.useCallback((event: RecommendationEvent, position: number) => {
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

  // Show empty state with helpful message if no events found
  if (personalizedEvents.length === 0) {
    return (
      <DiscoverySection
        title="For You"
        subtitle="Personalized Recommendations"
        icon={<User size={20} weight="fill" />}
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
            variant={index === 0 ? 'featured' : 'default'}
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
