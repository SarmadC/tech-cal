'use client';

import React from 'react';
import { Compass, Fire, Sparkle, Lightning } from '@phosphor-icons/react';
import { Event } from '@/types';
import { DiscoveryService } from '@/services/discoveryService';
import DiscoverySection from './DiscoverySection';
import DiscoveryCard from './DiscoveryCard';
import BentoGrid from '../../desktop/discovery/BentoGrid';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { calculateEventAlignment } from '@/utils/careerAlignmentCalculator';
import { CareerProfileService } from '@/services/careerProfileService';
import { createClient } from '@/utils/supabase/client';
import { hasCompleteCareerProfile } from '@/utils/profileTypeGuards';

export interface ExploreMoreSectionProps {
  events: Event[];
  onEventSelect?: (event: Event) => void;
  className?: string;
  userLocation?: { city?: string; country?: string; timezone?: string };
  userProfile?: import('@/types').AppProfile; // Add userProfile prop for career alignment calculation
}

const ExploreMoreSection = React.memo<ExploreMoreSectionProps>(({
  events,
  onEventSelect,
  className = '',
  userLocation,
  userProfile
}) => {
  // Get career profile for alignment calculation
  const _supabase = React.useMemo(() => createClient(), []);
  const careerProfile = React.useMemo(() => {
    if (!userProfile) return null;
    try {
      return CareerProfileService.getCareerProfileFromPreferences(userProfile);
    } catch {
      return null;
    }
  }, [userProfile]);
  const hasCareerProfile = React.useMemo(() => hasCompleteCareerProfile(careerProfile), [careerProfile]);
  // First, organize events by type with deduplication
  const organizedEvents = React.useMemo(() => {
    // Filter out past events first
    const now = new Date();
    const upcomingEvents = events.filter(event => new Date(event.startTime) > now);
    
    // Get top trending event (size: large)
    const trending = DiscoveryService.getTrendingEvents(upcomingEvents, 1, userLocation);
    
    // Get 2-3 new events (size: medium)
    const newEvents = DiscoveryService.getNewEvents(upcomingEvents, 3);
    
    // Get 3-4 quick wins (size: small)
    const quickWins = DiscoveryService.getQuickWinEvents(upcomingEvents, 4);
    
    // Create a map to track events and their types
    const eventMap = new Map();
    
    // Add trending events
    trending.forEach(e => {
      eventMap.set(e.id, { event: e, types: ['trending'], size: 'large' });
    });
    
    // Add new events (avoid duplicates)
    newEvents.slice(0, 2).forEach(e => {
      if (eventMap.has(e.id)) {
        eventMap.get(e.id).types.push('new');
      } else {
        eventMap.set(e.id, { event: e, types: ['new'], size: 'medium' });
      }
    });
    
    // Add quick wins (avoid duplicates)
    quickWins.slice(0, 4).forEach(e => {
      if (eventMap.has(e.id)) {
        eventMap.get(e.id).types.push('quick');
        // If it's already trending, keep it large, otherwise make it medium
        if (!eventMap.get(e.id).types.includes('trending')) {
          eventMap.get(e.id).size = 'medium';
        }
      } else {
        eventMap.set(e.id, { event: e, types: ['quick'], size: 'small' });
      }
    });
    
    // Convert to array and sort by priority (trending first, then by size)
    const sortedEvents = Array.from(eventMap.values()).sort((a, b) => {
      if (a.types.includes('trending') && !b.types.includes('trending')) return -1;
      if (!a.types.includes('trending') && b.types.includes('trending')) return 1;
      if (a.size === 'large' && b.size !== 'large') return -1;
      if (a.size !== 'large' && b.size === 'large') return 1;
      return 0;
    });
    
    // Ensure we have a good mix of sizes for Bento grid
    // First event should be large if it's trending, otherwise make it large
    if (sortedEvents.length > 0 && !sortedEvents[0].types.includes('trending')) {
      sortedEvents[0].size = 'large';
    }
    
    // Make the second card large for better visual balance
    if (sortedEvents.length > 1) {
      sortedEvents[1].size = 'large';
    }
    
    // Ensure we have at least one medium and one small (starting from third event)
    const hasLarge = sortedEvents.some(e => e.size === 'large');
    const hasMedium = sortedEvents.some(e => e.size === 'medium');
    const hasSmall = sortedEvents.some(e => e.size === 'small');
    
    if (hasLarge && !hasMedium && sortedEvents.length > 2) {
      sortedEvents[2].size = 'medium';
    }
    if (hasLarge && hasMedium && !hasSmall && sortedEvents.length > 3) {
      sortedEvents[3].size = 'small';
    }
    
    return sortedEvents;
  }, [events, userLocation]);

  // Enhance events with career impact scores
  const { data: exploreEvents = organizedEvents } = useQuery({
    queryKey: ['exploreMoreCareerImpact', organizedEvents.map(e => e.event.id).join(','), hasCareerProfile],
    queryFn: async () => {
      try {
        if (!hasCareerProfile || !careerProfile) {
          return organizedEvents;
        }

        const eventsList = organizedEvents.map(e => e.event);
        
        // Enhance with client-side career alignment calculation
        const enhancedEvents = eventsList.map(event => {
          const alignment = calculateEventAlignment(event, careerProfile);
          return {
            ...event,
            careerImpact: {
              overall: alignment.alignmentScore,
              confidence: 1.0,
              components: {
                skillRelevance: alignment.alignmentReasons
                  .filter(r => r.type === 'skill')
                  .reduce((sum, r) => sum + r.contribution, 0),
                careerStageMatch: alignment.alignmentReasons
                  .filter(r => r.type === 'goal')
                  .reduce((sum, r) => sum + r.contribution, 0),
                networkingValue: alignment.alignmentReasons
                  .filter(r => r.type === 'networking')
                  .reduce((sum, r) => sum + r.contribution, 0),
                industryRelevance: alignment.alignmentReasons
                  .filter(r => r.type === 'interest')
                  .reduce((sum, r) => sum + r.contribution, 0),
                timingBonus: alignment.alignmentReasons
                  .filter(r => r.type === 'learning-style')
                  .reduce((sum, r) => sum + r.contribution, 0),
              },
              explanation: {
                reasons: alignment.alignmentReasons.map(r => r.reason),
                matchedSkills: alignment.matchedSkills,
                speakerHighlights: [],
                careerImpactCategory: alignment.alignmentScore >= 80 ? 'high' : 
                                     alignment.alignmentScore >= 50 ? 'moderate' : 'low',
                confidenceFactors: ['Client-side calculation'],
                // Add the alignment reasons for the tooltip
                alignmentReasons: alignment.alignmentReasons
              },
              metadata: {
                algorithmVersion: 'v2.0-client',
                calculatedAt: new Date().toISOString(),
                careerProfileHash: '',
                eventDataHash: ''
              }
            }
          };
        });
        
        // Map enhanced events back to organized structure
        return organizedEvents.map(item => ({
          ...item,
          event: enhancedEvents.find(e => e.id === item.event.id) || item.event
        }));
      } catch (error) {
        console.warn('Failed to enhance explore events with career impact:', error);
        return organizedEvents;
      }
    },
    enabled: organizedEvents.length > 0 && hasCareerProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleEventClick = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);

  const handleLearnMore = React.useCallback((event: Event) => {
    onEventSelect?.(event);
  }, [onEventSelect]);

  const getEventBadges = (types: string[]) => {
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {types.map((type, index) => {
          switch (type) {
            case 'trending':
              return (
                <Badge key={`${type}-${index}`} variant="secondary" className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 border-orange-200">
                  <Fire size={10} weight="fill" />
                  Trending
                </Badge>
              );
            case 'new':
              return (
                <Badge key={`${type}-${index}`} variant="secondary" className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 border-blue-200">
                  <Sparkle size={10} weight="fill" />
                  New
                </Badge>
              );
            case 'quick':
              return (
                <Badge key={`${type}-${index}`} variant="secondary" className="flex items-center gap-1 text-xs bg-green-100 text-green-700 border-green-200">
                  <Lightning size={10} weight="fill" />
                  Quick
                </Badge>
              );
            default:
              return null;
          }
        })}
      </div>
    );
  };

  if (exploreEvents.length === 0) {
    return (
      <DiscoverySection
        title="Explore More"
        subtitle="Trending, new, and quick events"
        icon={<Compass size={20} weight="fill" />}
        className={className}
      >
        <div className="discovery-empty-state">
          <Compass size={48} className="empty-icon" />
          <div className="empty-title">No events to explore right now</div>
          <div className="empty-subtitle">
            Check back soon for trending events, new additions, and quick wins!
          </div>
        </div>
      </DiscoverySection>
    );
  }

  return (
    <DiscoverySection
      title="Explore More"
      subtitle="Trending, new, and quick events"
      icon={<Compass size={20} weight="fill" />}
      className={className}
    >
      <BentoGrid>
        {exploreEvents.map(({ event, types, size }, index) => (
          <DiscoveryCard
            key={`${event.id}-${index}`}
            event={event}
            onClick={() => handleEventClick(event)}
            onLearnMore={() => handleLearnMore(event)}
            size={size}
            variant="default"
            showLearnMore={false}
            badges={getEventBadges(types)}
            className=""
          />
        ))}
      </BentoGrid>
    </DiscoverySection>
  );
});

ExploreMoreSection.displayName = 'ExploreMoreSection';

export default ExploreMoreSection;

