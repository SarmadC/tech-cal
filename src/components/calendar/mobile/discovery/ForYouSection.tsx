'use client';

import React, { useRef } from 'react';
import { User } from '@phosphor-icons/react';
import { Event, AppProfile, TrackedEvent } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
import { PersonalizedDiscoveryService } from '@/services/personalizedDiscoveryService';
// Use consolidated Event type - recommendation functionality handled through EventWithCareerImpact
import { useForYouTracking } from '@/hooks/useRecommendationTracking';
import { hasCompleteCareerProfile } from '@/utils/profileTypeGuards';
import { createClient } from '@/utils/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CareerProfileService } from '@/services/careerProfileService';
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
  trackedEvents = [],
  onEventSelect,
  onTrackEvent: _onTrackEvent,
  className = '',
  limit = 5,
  userLocation,
  renderAsBento = false,
  skipPersonalization = false
}) => {
  const supabase = React.useMemo(() => createClient(), []);
  
  // Use proper CareerProfileService to get career profile
  const {
    data: careerProfile = null,
    isLoading: careerProfileLoading
  } = useQuery({
    queryKey: ['careerProfile', userProfile?.id],
    queryFn: async () => {
      if (!userProfile) return null;
      try {
        return await CareerProfileService.getCareerProfile(userProfile.id, supabase);
      } catch (error) {
        console.warn('Failed to load career profile, falling back to preferences:', error);
        // Fallback to legacy method
        return CareerProfileService.getCareerProfileFromPreferences(userProfile);
      }
    },
    enabled: !!userProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const hasCareerProfile = React.useMemo(() => hasCompleteCareerProfile(careerProfile), [careerProfile]);
  
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
        // Filter out past events first
        const now = new Date();
        const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
        
        // Use fast personalized discovery service for better performance
        // This will automatically choose between fast and advanced based on user data
        const personalized = await PersonalizedDiscoveryService.getAdvancedPersonalizedRecommendations(
          upcomingEvents,
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
        const now = new Date();
        const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
        return DiscoveryService.getPersonalizedRecommendations(
          upcomingEvents,
          userProfile,
          trackedEvents,
          limit,
          userLocation
        );
      }
    },
    enabled: !!(hasCareerProfile && userProfile && cacheKey && !skipPersonalization),
    staleTime: 5 * 60 * 1000, // 5 minutes - recommendations stay fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache cleanup
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
    refetchOnMount: false, // Don't refetch when component remounts
    retry: 1, // Only retry once on failure
  });

  // Use passed events directly when skipPersonalization is true
  const finalEvents = React.useMemo(() => {
    if (skipPersonalization) {
      // Filter out past events when using passed events directly
      const now = new Date();
      return events.filter(event => new Date(event.startTime) > now).slice(0, limit);
    }
    return personalizedEvents;
  }, [skipPersonalization, events, personalizedEvents, limit]);

  // Debug logging
  React.useEffect(() => {
    console.log('ForYouSection Debug:', {
      hasCareerProfile,
      userProfile: !!userProfile,
      eventsCount: events.length,
      personalizedEventsCount: personalizedEvents.length,
      finalEventsCount: finalEvents.length,
      skipPersonalization,
      isLoading,
      error: error?.message,
      cacheKey
    });
  }, [hasCareerProfile, userProfile, events.length, personalizedEvents.length, finalEvents.length, skipPersonalization, isLoading, error, cacheKey]);

  // Early debug - check what's happening
  console.log('ForYouSection Render Check:', {
    hasCareerProfile,
    personalizedEventsLength: personalizedEvents.length,
    finalEventsLength: finalEvents.length,
    shouldShowEmpty: finalEvents.length === 0 || !hasCareerProfile,
    isLoading,
    error: !!error
  });

  // Debug career profile details
  console.log('Career Profile Debug:', {
    careerProfile,
    primarySkills: careerProfile?.primarySkills,
    interests: careerProfile?.interests,
    seniority: careerProfile?.seniority,
    careerGoals: careerProfile?.careerGoals,
    hasPrimarySkills: !!careerProfile?.primarySkills?.length,
    hasInterests: !!careerProfile?.interests?.length,
    hasSeniority: !!careerProfile?.seniority,
    hasCareerGoals: !!careerProfile?.careerGoals?.length
  });

  // Debug user profile structure
  console.log('User Profile Debug:', {
    userProfile: !!userProfile,
    preferences: userProfile?.preferences,
    careerProfileData: userProfile?.preferences ? (userProfile.preferences as Record<string, unknown>)?.careerProfile : null,
    rawPreferences: userProfile?.preferences
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


  // Remove the CareerProfilePrompt - we'll handle this in the empty state below

  // Show loading state
  if (isLoading || careerProfileLoading) {
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

  // Show error state with retry option
  if (error) {
    return (
      <DiscoverySection
        title="For You"
        subtitle="Personalized Recommendations"
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
        subtitle="Personalized Recommendations"
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
        subtitle="Personalized Recommendations"
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
                // TODO: Retry the query
                console.log('Retry recommendations');
              }}
            >
              Try Again
            </button>
            <button 
              className="empty-cta-secondary"
              onClick={() => {
                // TODO: Navigate to explore more events
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
  if (finalEvents.length === 0 || !hasCareerProfile) {
    const isProfileIncomplete = !hasCareerProfile;
    
    console.log('Rendering empty state:', { isProfileIncomplete, hasCareerProfile, finalEventsLength: finalEvents.length });
    
    return (
      <DiscoverySection
        title="For You"
        subtitle="Personalized Recommendations"
        icon={<User size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <div className="empty-icon-container">
            <User size={48} className="empty-icon" />
            <div className="empty-icon-bg"></div>
          </div>
          <div className="empty-title">
            {isProfileIncomplete ? 'Complete your profile for personalized recommendations' : 'Building your personalized feed'}
          </div>
          <div className="empty-subtitle">
            {isProfileIncomplete 
              ? 'Add your skills, interests, and career goals to get personalized event recommendations tailored just for you.'
              : 'We&apos;re analyzing your career profile and upcoming events to find the perfect matches for your goals.'
            }
          </div>
          <div className="empty-actions">
            <button 
              className="empty-cta-primary"
              onClick={() => {
                // TODO: Navigate to profile completion or career onboarding
                console.log('Navigate to profile completion');
              }}
            >
              {isProfileIncomplete ? 'Complete Your Profile' : 'Refresh Recommendations'}
            </button>
            <button 
              className="empty-cta-secondary"
              onClick={() => {
                // TODO: Navigate to explore more events
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

  // Determine card size based on index and career impact
  const getCardSize = (index: number, event: Event): 'small' | 'medium' | 'large' => {
    if (renderAsBento) {
      // First event or high career impact = large
      const careerImpact = (event as Event & { careerImpactLite?: { overall: number } }).careerImpactLite?.overall || 0;
      if (index === 0 || careerImpact > 0.7) return 'large';
      // Next 2-3 events or medium career impact = medium
      if (index < 3 || careerImpact > 0.4) return 'medium';
      // Rest = small
      return 'small';
    }
    return 'medium';
  };

  const cardsContent = finalEvents.map((event, index) => (
    <DiscoveryCard
      key={`${event.id}-${index}`}
      event={event}
      onClick={() => handleEventClick(event, index)}
      onView={() => handleEventView(event, index)}
      onLearnMore={() => handleLearnMore(event, index)}
      variant={index === 0 ? 'featured' : 'default'}
      size={getCardSize(index, event)}
      showLearnMore={false}
      className=""
    />
  ));

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
