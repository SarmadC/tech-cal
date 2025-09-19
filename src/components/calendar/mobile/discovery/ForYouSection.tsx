'use client';

import React from 'react';
import { Lightning } from '@phosphor-icons/react';
import { Event, AppProfile, TrackedEvent } from '@/types';
import { DiscoveryService, DiscoveryEvent } from '@/services/discoveryService';
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';
import CareerProfilePrompt from './CareerProfilePrompt';
import { CareerProfileService } from '@/services/careerProfileService';

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
  const hasCareerProfile = userProfile ? CareerProfileService.hasCompletedOnboarding(userProfile) : false;
  
  const personalizedEvents = React.useMemo(() => {
    // Only run personalization if we have a complete career profile
    if (!hasCareerProfile) {
      return [];
    }
    return DiscoveryService.getPersonalizedRecommendations(
      events,
      userProfile,
      trackedEvents,
      limit,
      userLocation
    );
  }, [events, userProfile, trackedEvents, limit, userLocation, hasCareerProfile]);

  const handleEventClick = React.useCallback((event: DiscoveryEvent) => {
    onEventSelect?.(event);
  }, [onEventSelect]);


  // Show career profile prompt if user doesn't have complete profile
  if (!hasCareerProfile && userProfile) {
    return (
      <DiscoverySection
        title="For You"
        subtitle="Get personalized recommendations"
        icon={<Lightning size={20} weight="fill" />}
        className={className}
      >
        <CareerProfilePrompt profile={userProfile} />
      </DiscoverySection>
    );
  }

  // Show empty state with helpful message if no events found
  if (personalizedEvents.length === 0) {
    return (
      <DiscoverySection
        title="For You"
        subtitle="Personalized recommendations based on your interests"
        icon={<Lightning size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <Lightning size={48} className="empty-icon" />
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
      subtitle="Personalized recommendations based on your interests"
      icon={<Lightning size={20} weight="fill" />}
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
            onClick={() => handleEventClick(event)}
            variant={index === 0 ? 'featured' : 'default'}
            className=""
          />
        ))}
      </div>
      
      {personalizedEvents.length === 0 && userProfile && (
        <div className="empty-state">
          <Lightning size={32} className="empty-icon" />
          <p className="empty-text">
            We&apos;re learning your preferences. Track some events to get personalized recommendations!
          </p>
        </div>
      )}
      
      {!userProfile && (
        <div className="empty-state">
          <Lightning size={32} className="empty-icon" />
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
