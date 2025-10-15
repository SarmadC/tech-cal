'use client';

import React from 'react';
import { Event, EventType, AppProfile, TrackedEvent } from '@/types';
import { 
  ForYouSection,
  ExploreMoreSection
} from '../../mobile/discovery';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useQuery } from '@tanstack/react-query';
import { PersonalizedDiscoveryService } from '@/services/personalizedDiscoveryService';
import { createClient } from '@/utils/supabase/client';
import { hasCompleteCareerProfile } from '@/utils/profileTypeGuards';
import { CareerProfileService } from '@/services/careerProfileService';
// calculateEventAlignment no longer needed - PersonalizedDiscoveryService handles scoring
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
  
  // Get personalized events to exclude from explore more section
  const supabase = React.useMemo(() => createClient(), []);
  
  // Use proper CareerProfileService to get career profile
  const {
    data: careerProfile = null,
    isLoading: careerProfileLoading
  } = useQuery({
    queryKey: ['careerProfile', profile?.id],
    queryFn: async () => {
      if (!profile) return null;
      try {
        return await CareerProfileService.getCareerProfile(profile.id, supabase);
      } catch (error) {
        console.warn('Failed to load career profile, falling back to preferences:', error);
        // Fallback to legacy method
        return CareerProfileService.getCareerProfileFromPreferences(profile);
      }
    },
    enabled: !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const hasCareerProfile = React.useMemo(() => hasCompleteCareerProfile(careerProfile), [careerProfile]);
  
  // Debug logging for career profile
  React.useEffect(() => {
    console.log('DesktopDiscoveryView Career Profile Debug:', {
      hasProfile: !!profile,
      careerProfile: !!careerProfile,
      hasCareerProfile,
      careerProfileLoading,
      eventsCount: events.length,
      careerProfileDetails: careerProfile ? {
        primarySkills: careerProfile.primarySkills?.length,
        interests: careerProfile.interests?.length,
        seniority: careerProfile.seniority,
        careerGoals: careerProfile.careerGoals?.length
      } : null
    });
  }, [profile, careerProfile, hasCareerProfile, careerProfileLoading, events.length]);
  
  const {
    data: personalizedEvents = []
  } = useQuery({
    queryKey: ['personalizedEventsForDedup', profile?.id, events.length],
    queryFn: async () => {
      if (!hasCareerProfile || !profile || events.length === 0) return [];
      
      try {
        const upcomingEvents = events.filter(event => new Date(event.startTime) > new Date());
        const personalized = await PersonalizedDiscoveryService.getAdvancedPersonalizedRecommendations(
          upcomingEvents,
          profile,
          trackedEvents,
          supabase,
          8, // Same limit as ForYouSection
          userLocation || undefined
        );
        
        // PersonalizedDiscoveryService now provides consistent client-side career alignment scores
        // No need to override - just use the scores directly
        return personalized;
      } catch (error) {
        console.warn('Failed to get personalized events for deduplication:', error);
        return [];
      }
    },
    enabled: !!(hasCareerProfile && profile && events.length > 0 && !careerProfileLoading),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Filter out personalized events from the explore more section
  const exploreMoreEvents = React.useMemo(() => {
    if (personalizedEvents.length === 0) {
      console.log('No personalized events to filter, using all events');
      return events;
    }
    
    const personalizedEventIds = new Set(personalizedEvents.map(event => event.id));
    const filtered = events.filter(event => !personalizedEventIds.has(event.id));
    
    // Debug logging
    console.log('Event Deduplication:', {
      totalEvents: events.length,
      personalizedEvents: personalizedEvents.length,
      exploreMoreEvents: filtered.length,
      personalizedEventIds: Array.from(personalizedEventIds),
      personalizedEventTitles: personalizedEvents.map(e => e.title),
        personalizedEventScores: personalizedEvents.map(e => ({
          title: e.title,
          careerImpact: (e as Event & { careerImpactLite?: { overall: number } }).careerImpactLite?.overall
        }))
    });
    
    return filtered;
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
              skipPersonalization={true}
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
              userProfile={profile || undefined}
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
