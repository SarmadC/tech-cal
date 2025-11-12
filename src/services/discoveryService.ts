'use client';

import { Event, AppProfile, TrackedEvent } from '@/types';
import { extractCareerProfile } from '@/utils/profileTypeGuards';
import { TIME_CONSTANTS } from '@/config/analyticsConfig';
import { UnifiedEventUtils } from '@/utils/unifiedEventUtils';
import { 
  CareerProfile, 
  SeniorityLevel, 
  CareerGoal, 
  LearningStyle,
  CareerTimeframe,
  CareerEventMatch,
  CareerImpact,
  SkillAlignment,
  NetworkingValue,
  TimingRelevance
} from '@/types/career';

export interface DiscoveryMetrics {
  trendingScore: number;
  freshnessScore: number;
  personalizedScore: number;
  popularityScore: number;
  locationRelevanceScore: number;
  careerRelevanceScore: number;
}

export interface DiscoveryEvent extends Event {
  discoveryMetrics?: DiscoveryMetrics;
  discoveryReason?: string;
  isNew?: boolean;
  isTrending?: boolean;
  isPersonalized?: boolean;
  careerMatch?: CareerEventMatch;
}

export class DiscoveryService {
  /**
   * Get personalized recommendations for a user
   * 
   * For users without profiles (cold start), falls back to trending events.
   */
  static getPersonalizedRecommendations(
    events: Event[],
    userProfile: AppProfile | null,
    trackedEvents: TrackedEvent[] = [],
    limit: number = 5,
    userLocation?: { city?: string; country?: string; timezone?: string }
  ): DiscoveryEvent[] {
    // Early return if no events
    if (events.length === 0) return [];

    // Cold start: fall back to trending events when no profile
    if (!userProfile) {
      return this.getTrendingEvents(events, limit, userLocation);
    }

    const trackedEventIds = new Set(trackedEvents.map(te => te.id));
    const availableEvents = events.filter(event => !trackedEventIds.has(event.id));

    // Get user's preferred categories from tracked events
    const userCategories = this.getUserPreferredCategories(trackedEvents);
    const userInterests = this.getUserInterests(userProfile);

    const scoredEvents = availableEvents.map(event => {
      const personalizedScore = this.calculatePersonalizedScore(event, userCategories, userInterests, userProfile);
      const locationRelevanceScore = this.calculateLocationRelevance(event, userLocation);
      const careerMatch = this.calculateCareerRelevance(event, userProfile);
      const careerRelevanceScore = careerMatch.relevanceScore;
      const discoveryReason = this.generatePersonalizedReason(event, userCategories, userInterests, locationRelevanceScore, careerMatch);

      // Enhanced scoring: content (50%) + location (20%) + career (30%)
      const combinedScore = (personalizedScore * 0.5) + (locationRelevanceScore * 0.2) + (careerRelevanceScore * 0.3);

      return {
        ...event,
        discoveryMetrics: {
          trendingScore: 0,
          freshnessScore: 0,
          personalizedScore: combinedScore,
          popularityScore: 0,
          locationRelevanceScore,
          careerRelevanceScore,
        },
        discoveryReason,
        isPersonalized: true,
        careerMatch,
      } as DiscoveryEvent;
    });

    const personalizedResults = scoredEvents
      .sort((a, b) => (b.discoveryMetrics?.personalizedScore || 0) - (a.discoveryMetrics?.personalizedScore || 0))
      .slice(0, limit);

    // If personalized results are insufficient, supplement with trending events
    if (personalizedResults.length < limit) {
      const personalizedIds = new Set(personalizedResults.map(e => e.id));
      const trendingFallback = this.getTrendingEvents(
        events.filter(e => !personalizedIds.has(e.id)),
        limit - personalizedResults.length,
        userLocation
      );
      return [...personalizedResults, ...trendingFallback];
    }

    return personalizedResults;
  }

  /**
   * Get trending events based on various signals
   */
  static getTrendingEvents(
    events: Event[], 
    limit: number = 5,
    userLocation?: { city?: string; country?: string; timezone?: string }
  ): DiscoveryEvent[] {
    const now = new Date();
    const upcomingEvents = events.filter(event => new Date(event.startTime) > now);

    const scoredEvents = upcomingEvents.map(event => {
      const trendingScore = this.calculateTrendingScore(event);
      const popularityScore = this.calculatePopularityScore(event);
      const locationRelevanceScore = this.calculateLocationRelevance(event, userLocation);
      const careerRelevanceScore = 0.8; // Trending events get moderate career relevance by default

      // Boost trending score for location-relevant events
      const adjustedTrendingScore = trendingScore * (0.7 + locationRelevanceScore * 0.3);

      return {
        ...event,
        discoveryMetrics: {
          trendingScore: adjustedTrendingScore,
          freshnessScore: 0,
          personalizedScore: 0,
          popularityScore,
          locationRelevanceScore,
          careerRelevanceScore,
        },
        discoveryReason: this.generateTrendingReason(event, adjustedTrendingScore),
        isTrending: adjustedTrendingScore > 0.6,
      } as DiscoveryEvent;
    });

    return scoredEvents
      .filter(event => (event.discoveryMetrics?.trendingScore || 0) > 0.2) // Lower threshold to show more events
      .sort((a, b) => (b.discoveryMetrics?.trendingScore || 0) - (a.discoveryMetrics?.trendingScore || 0))
      .slice(0, limit);
  }

  /**
   * Get newly added events (within last 7 days)
   */
  static getNewEvents(events: Event[], limit: number = 5): DiscoveryEvent[] {
    const now = new Date();
    const _weekAgo = new Date(now.getTime() - TIME_CONSTANTS.WEEK);
    
    // For now, we'll simulate "created_at" by using events that start within 4 weeks
    // In a real implementation, you'd have a created_at field
    const fourWeeksFromNow = new Date(now.getTime() + 4 * TIME_CONSTANTS.WEEK);
    
    const newEvents = events
      .filter(event => {
        const eventStart = new Date(event.startTime);
        // Simulate "new" events as those starting soon but not immediately
        // Also include events that started recently (within the last week)
        return (eventStart > now && eventStart <= fourWeeksFromNow) || 
               (eventStart <= now && eventStart >= _weekAgo);
      })
      .map(event => {
        const freshnessScore = this.calculateFreshnessScore(event);
        
        return {
          ...event,
        discoveryMetrics: {
          trendingScore: 0,
          freshnessScore,
          personalizedScore: 0,
          popularityScore: 0,
          locationRelevanceScore: 1.0, // New events get neutral location score
          careerRelevanceScore: 0.8, // New events get moderate career relevance
        },
          discoveryReason: "Recently added to the platform",
          isNew: true,
        } as DiscoveryEvent;
      });

    return newEvents
      .sort((a, b) => (b.discoveryMetrics?.freshnessScore || 0) - (a.discoveryMetrics?.freshnessScore || 0))
      .slice(0, limit);
  }

  /**
   * Get quick win events (short duration, high value)
   */
  static getQuickWinEvents(events: Event[], limit: number = 5): DiscoveryEvent[] {
    const quickWinEvents = events
      .filter(event => {
        const duration = this.getEventDuration(event);
        // Include events that are 4 hours or less (more inclusive)
        // Also include events without clear duration if they seem like quick events
        if (duration > 0) {
          return duration <= 4;
        }
        // Fallback: if duration can't be calculated, use title/description hints
        const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
        const quickEventKeywords = ['webinar', 'quick', 'brief', 'intro', 'overview', 'lunch', 'coffee'];
        return quickEventKeywords.some(keyword => eventText.includes(keyword));
      })
      .map(event => {
        const duration = this.getEventDuration(event);
        const durationText = duration > 0 ? `${duration} hour` : 'quick';
        
        return {
          ...event,
          discoveryMetrics: {
            trendingScore: 0,
            freshnessScore: 0,
            personalizedScore: 0,
            popularityScore: this.calculatePopularityScore(event),
            locationRelevanceScore: 1.0, // Quick wins get neutral location score
            careerRelevanceScore: 0.7, // Quick wins get moderate career relevance
          },
          discoveryReason: `Quick ${durationText} session`,
        } as DiscoveryEvent;
      });

    return quickWinEvents
      .sort((a, b) => (b.discoveryMetrics?.popularityScore || 0) - (a.discoveryMetrics?.popularityScore || 0))
      .slice(0, limit);
  }

  /**
   * Get deep dive events (multi-day, comprehensive)
   */
  static getDeepDiveEvents(events: Event[], limit: number = 5): DiscoveryEvent[] {
    const deepDiveEvents = events
      .filter(event => {
        const duration = this.getEventDuration(event);
        return duration >= 8; // 8+ hours or multi-day
      })
      .map(event => ({
        ...event,
        discoveryMetrics: {
          trendingScore: 0,
          freshnessScore: 0,
          personalizedScore: 0,
          popularityScore: this.calculatePopularityScore(event),
          locationRelevanceScore: 1.0, // Deep dives get neutral location score
          careerRelevanceScore: 0.9, // Deep dives get high career relevance
        },
        discoveryReason: this.getEventDuration(event) > 24 ? "Multi-day comprehensive program" : "Full-day intensive",
      } as DiscoveryEvent));

    return deepDiveEvents
      .sort((a, b) => (b.discoveryMetrics?.popularityScore || 0) - (a.discoveryMetrics?.popularityScore || 0))
      .slice(0, limit);
  }

  // Private helper methods

  private static getUserPreferredCategories(trackedEvents: TrackedEvent[]): string[] {
    const categoryCount: { [key: string]: number } = {};
    
    trackedEvents.forEach(event => {
      if (event.eventTypeId) {
        categoryCount[event.eventTypeId] = (categoryCount[event.eventTypeId] || 0) + 1;
      }
    });

    return Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  private static getUserInterests(userProfile: AppProfile): string[] {
    // Use centralized profile extraction for consistency
    const careerProfile = extractCareerProfile(userProfile);
    if (!careerProfile) return [];

    return [
      ...(careerProfile.interests || []),
      ...(careerProfile.primarySkills || []),
      ...(careerProfile.skillsToLearn || [])
    ];
  }

  private static calculatePersonalizedScore(
    event: Event,
    userCategories: string[],
    userInterests: string[],
    _userProfile: AppProfile
  ): number {
    let score = 0;

    // Category match bonus
    if (userCategories.includes(event.eventTypeId)) {
      score += 0.4;
    }

    // Interest match bonus
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    const matchingInterests = userInterests.filter(interest => 
      eventText.includes(interest.toLowerCase())
    );
    score += matchingInterests.length * 0.2;

    // Difficulty match bonus
    if (event.difficulty) {
      // Simple heuristic: match intermediate level for most users
      if (event.difficulty === 'intermediate') score += 0.1;
    }

    // Format preference (virtual events get slight boost for convenience)
    if (event.location?.toLowerCase().includes('virtual') || event.livestreamUrl) {
      score += 0.05;
    }

    // Timing bonus (events in next 2 weeks get boost)
    const eventDate = new Date(event.startTime);
    const now = new Date();
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilEvent > 0 && daysUntilEvent <= 14) {
      score += 0.1;
    }

    return Math.min(score, 1); // Cap at 1.0
  }

  private static calculateTrendingScore(event: Event): number {
    let score = 0.1; // Base score to ensure most events get some trending points

    // Attendee count factor
    if (event.attendeeCount) {
      if (event.attendeeCount > 1000) score += 0.3;
      else if (event.attendeeCount > 500) score += 0.2;
      else if (event.attendeeCount > 100) score += 0.1;
      else if (event.attendeeCount > 50) score += 0.05; // Even small events get some points
    }

    // Recent event bonus (events starting within 1 month)
    const eventDate = new Date(event.startTime);
    const now = new Date();
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntilEvent > 0 && daysUntilEvent <= 30) {
      score += 0.2;
    }

    // Popular category bonus
    const popularCategories = ['conference', 'workshop', 'summit', 'networking'];
    if (event.category && popularCategories.includes(event.category.name.toLowerCase())) {
      score += 0.2;
    }

    // High-profile organizer bonus
    if (event.organization?.name) {
      const orgName = event.organization.name.toLowerCase();
      const majorOrgs = ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix', 'uber'];
      if (majorOrgs.some(org => orgName.includes(org))) {
        score += 0.3;
      }
    }

    // Real trending signals (replace with actual metrics when available)
    // For now, use event characteristics as trending indicators
    const eventAge = (now.getTime() - new Date(event.createdAt || event.startTime).getTime()) / (1000 * 60 * 60 * 24);
    if (eventAge <= 7) score += 0.15; // Recently created events
    
    // Events with registration URLs tend to be more popular
    if (event.registrationUrl) score += 0.05;

    // Boost for events with good descriptions (indicates quality)
    if (event.description && event.description.length > 100) {
      score += 0.05;
    }

    return Math.min(score, 1);
  }

  private static calculatePopularityScore(event: Event): number {
    let score = 0.5; // Base score

    if (event.attendeeCount) {
      score += Math.min(event.attendeeCount / 1000, 0.3);
    }

    if (event.capacity && event.attendeeCount) {
      const fillRate = event.attendeeCount / event.capacity;
      score += fillRate * 0.2;
    }

    return Math.min(score, 1);
  }

  private static calculateFreshnessScore(event: Event): number {
    const now = new Date();
    const eventDate = new Date(event.startTime);
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    // Higher score for events happening sooner (within reasonable range)
    if (daysUntilEvent <= 7) return 0.9;
    if (daysUntilEvent <= 14) return 0.7;
    if (daysUntilEvent <= 30) return 0.5;
    return 0.3;
  }

  private static getEventDuration(event: Event): number {
    return UnifiedEventUtils.getDurationAs(event, 'hours') as number;
  }

  private static calculateLocationRelevance(
    event: Event,
    userLocation?: { city?: string; country?: string; timezone?: string }
  ): number {
    if (!userLocation || !event.location) {
      return 0.8; // Neutral score when location data is unavailable
    }

    const eventLocation = event.location.toLowerCase();
    
    // Virtual events are universally accessible
    if (eventLocation.includes('virtual') || 
        eventLocation.includes('online') || 
        eventLocation.includes('remote') ||
        event.livestreamUrl) {
      return 1.0; // Maximum relevance for virtual events
    }

    // Extract location information
    const userCity = userLocation.city?.toLowerCase();
    const userCountry = userLocation.country?.toLowerCase();

    // Same city - highly relevant
    if (userCity && eventLocation.includes(userCity)) {
      return 1.0;
    }

    // Same country - moderately relevant
    if (userCountry && eventLocation.includes(userCountry)) {
      return 0.8;
    }

    // Major tech hubs are generally more accessible/relevant
    const majorTechHubs = [
      'san francisco', 'silicon valley', 'palo alto', 'mountain view',
      'new york', 'seattle', 'austin', 'boston', 'denver',
      'london', 'berlin', 'amsterdam', 'paris', 'barcelona',
      'toronto', 'vancouver', 'singapore', 'tokyo', 'sydney',
      'tel aviv', 'bangalore', 'mumbai', 'dublin'
    ];

    const isMajorHub = majorTechHubs.some(hub => eventLocation.includes(hub));
    if (isMajorHub) {
      return 0.6; // Moderate relevance for major tech hubs
    }

    // Different continent/timezone - lower relevance
    const userTimezone = userLocation.timezone || '';
    const isEurope = userTimezone.includes('Europe') || userCountry === 'uk' || userCountry === 'united kingdom';
    const isAsia = userTimezone.includes('Asia') || userTimezone.includes('Pacific');
    const isAmericas = userTimezone.includes('America') || userCountry === 'usa' || userCountry === 'canada';

    // European users
    if (isEurope) {
      if (eventLocation.includes('europe') || 
          eventLocation.includes('london') || 
          eventLocation.includes('berlin') ||
          eventLocation.includes('amsterdam') ||
          eventLocation.includes('paris')) {
        return 0.7;
      }
      if (eventLocation.includes('san francisco') || 
          eventLocation.includes('new york') ||
          eventLocation.includes('usa')) {
        return 0.3; // Lower for US events
      }
    }

    // Asian users
    if (isAsia) {
      if (eventLocation.includes('singapore') || 
          eventLocation.includes('tokyo') ||
          eventLocation.includes('asia')) {
        return 0.7;
      }
      if (eventLocation.includes('san francisco') || 
          eventLocation.includes('usa') ||
          eventLocation.includes('europe')) {
        return 0.4; // Moderate for US/Europe events
      }
    }

    // Americas users
    if (isAmericas) {
      if (eventLocation.includes('usa') || 
          eventLocation.includes('canada') ||
          eventLocation.includes('america')) {
        return 0.8;
      }
      if (eventLocation.includes('europe') || 
          eventLocation.includes('asia')) {
        return 0.4; // Moderate for other continents
      }
    }

    return 0.5; // Default moderate relevance
  }

  private static calculateCareerRelevance(
    event: Event,
    userProfile: AppProfile | null
  ): CareerEventMatch {
    if (!userProfile) {
      return {
        relevanceScore: 0.5,
        reasons: ['Sign in for personalized career recommendations'],
        careerImpact: 'moderate',
        skillAlignment: 'moderate-match',
        networkingValue: 'moderate',
        timingRelevance: 'okay'
      };
    }

    // Extract career profile from user preferences (stored as JSON)
    const preferences = userProfile.preferences as Record<string, unknown>;
    const careerProfile: CareerProfile | null = (preferences?.careerProfile as CareerProfile) || null;

    if (!careerProfile) {
      return {
        relevanceScore: 0.6,
        reasons: ['Complete your career profile for better recommendations'],
        careerImpact: 'moderate',
        skillAlignment: 'moderate-match',
        networkingValue: 'moderate',
        timingRelevance: 'okay'
      };
    }

    let score = 0;
    const reasons: string[] = [];
    let careerImpact: CareerImpact = 'low';
    let skillAlignment: SkillAlignment = 'no-match';
    let networkingValue: NetworkingValue = 'low';
    let timingRelevance: TimingRelevance = 'okay';

    // 1. Seniority Level Matching (0.3 weight)
    const seniorityBonus = this.calculateSeniorityRelevance(event, careerProfile.seniority);
    score += seniorityBonus * 0.3;
    if (seniorityBonus > 0.7) {
      reasons.push(`Perfect for ${careerProfile.seniority} level professionals`);
    }

    // 2. Skill Alignment (0.4 weight)
    const skillScore = this.calculateSkillAlignment(event, careerProfile);
    score += skillScore.score * 0.4;
    skillAlignment = skillScore.alignment;
    if (skillScore.score > 0.7) {
      reasons.push(`Matches your ${skillScore.matchedSkills.join(', ')} interests`);
    }

    // 3. Career Goals Alignment (0.2 weight)
    const goalScore = this.calculateGoalAlignment(event, careerProfile.careerGoals);
    score += goalScore * 0.2;
    if (goalScore > 0.7) {
      careerImpact = 'high';
      reasons.push('Directly supports your career goals');
    }

    // 4. Learning Style Match (0.1 weight)
    const learningScore = this.calculateLearningStyleMatch(event, careerProfile.learningStyle);
    score += learningScore * 0.1;
    if (learningScore > 0.8) {
      reasons.push('Matches your preferred learning style');
    }

    // Determine overall impact levels
    if (score > 0.8) careerImpact = 'transformative';
    else if (score > 0.6) careerImpact = 'high';
    else if (score > 0.4) careerImpact = 'moderate';

    // Networking value based on seniority and event type
    networkingValue = this.calculateNetworkingValue(event, careerProfile);

    // Timing relevance based on career timeframe
    timingRelevance = this.calculateTimingRelevance(event, careerProfile.timeframe);

    return {
      relevanceScore: Math.min(score, 1.0),
      reasons: reasons.length > 0 ? reasons : ['Good for professional development'],
      careerImpact,
      skillAlignment,
      networkingValue,
      timingRelevance
    };
  }

  private static calculateSeniorityRelevance(event: Event, seniority: SeniorityLevel): number {
    const eventTitle = event.title.toLowerCase();
    const eventDescription = (event.description || '').toLowerCase();
    const eventText = `${eventTitle} ${eventDescription}`;

    // Entry level keywords
    if (['student', 'entry-level', 'junior'].includes(seniority)) {
      if (eventText.includes('beginner') || eventText.includes('intro') || 
          eventText.includes('101') || eventText.includes('bootcamp') ||
          eventText.includes('fundamentals') || eventText.includes('getting started')) {
        return 1.0;
      }
      if (eventText.includes('advanced') || eventText.includes('expert') ||
          eventText.includes('senior') || eventText.includes('leadership')) {
        return 0.3;
      }
      return 0.7;
    }

    // Mid-level keywords
    if (['mid-level', 'senior'].includes(seniority)) {
      if (eventText.includes('intermediate') || eventText.includes('practical') ||
          eventText.includes('hands-on') || eventText.includes('deep dive')) {
        return 1.0;
      }
      if (eventText.includes('beginner') || eventText.includes('101')) {
        return 0.4;
      }
      return 0.8;
    }

    // Senior level keywords
    if (['staff', 'principal', 'lead', 'manager'].includes(seniority)) {
      if (eventText.includes('advanced') || eventText.includes('expert') ||
          eventText.includes('leadership') || eventText.includes('architecture') ||
          eventText.includes('strategy') || eventText.includes('management')) {
        return 1.0;
      }
      if (eventText.includes('beginner') || eventText.includes('101')) {
        return 0.2;
      }
      return 0.7;
    }

    // Executive level
    if (['director', 'vp', 'cto'].includes(seniority)) {
      if (eventText.includes('executive') || eventText.includes('strategy') ||
          eventText.includes('leadership') || eventText.includes('vision') ||
          eventText.includes('transformation') || eventText.includes('summit')) {
        return 1.0;
      }
      if (eventText.includes('technical') && !eventText.includes('strategy')) {
        return 0.3;
      }
      return 0.6;
    }

    return 0.7; // Default moderate relevance
  }

  private static calculateSkillAlignment(event: Event, careerProfile: CareerProfile): {
    score: number;
    alignment: SkillAlignment;
    matchedSkills: string[];
  } {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    const _allSkills = [...careerProfile.primarySkills, ...careerProfile.skillsToLearn, ...careerProfile.interests];
    
    const matchedSkills: string[] = [];
    let totalMatches = 0;
    let highPriorityMatches = 0;

    // Check skills to learn (high priority)
    careerProfile.skillsToLearn.forEach(skill => {
      if (eventText.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
        totalMatches++;
        highPriorityMatches++;
      }
    });

    // Check interests (medium priority)
    careerProfile.interests.forEach(interest => {
      if (eventText.includes(interest.toLowerCase())) {
        matchedSkills.push(interest);
        totalMatches++;
      }
    });

    // Check primary skills (lower priority - already know these)
    careerProfile.primarySkills.forEach(skill => {
      if (eventText.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
        totalMatches += 0.5; // Lower weight for existing skills
      }
    });

    let score = 0;
    let alignment: SkillAlignment = 'no-match';

    if (highPriorityMatches >= 2) {
      score = 1.0;
      alignment = 'perfect-match';
    } else if (highPriorityMatches >= 1) {
      score = 0.8;
      alignment = 'strong-match';
    } else if (totalMatches >= 2) {
      score = 0.6;
      alignment = 'moderate-match';
    } else if (totalMatches >= 1) {
      score = 0.4;
      alignment = 'weak-match';
    }

    return { score, alignment, matchedSkills };
  }

  private static calculateGoalAlignment(event: Event, careerGoals: CareerGoal[]): number {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    let score = 0;

    careerGoals.forEach(goal => {
      switch (goal) {
        case 'skill-development':
          if (eventText.includes('workshop') || eventText.includes('training') ||
              eventText.includes('bootcamp') || eventText.includes('course')) {
            score += 0.4;
          }
          break;
        case 'career-advancement':
          if (eventText.includes('leadership') || eventText.includes('management') ||
              eventText.includes('career') || eventText.includes('promotion')) {
            score += 0.4;
          }
          break;
        case 'networking':
          if (eventText.includes('networking') || eventText.includes('meetup') ||
              eventText.includes('conference') || eventText.includes('summit')) {
            score += 0.4;
          }
          break;
        case 'entrepreneurship':
          if (eventText.includes('startup') || eventText.includes('entrepreneur') ||
              eventText.includes('founder') || eventText.includes('business')) {
            score += 0.4;
          }
          break;
        case 'leadership-growth':
          if (eventText.includes('leadership') || eventText.includes('management') ||
              eventText.includes('team') || eventText.includes('culture')) {
            score += 0.4;
          }
          break;
      }
    });

    return Math.min(score, 1.0);
  }

  private static calculateLearningStyleMatch(event: Event, learningStyles: LearningStyle[]): number {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    const eventType = event.category?.name?.toLowerCase() || '';
    let score = 0;

    learningStyles.forEach(style => {
      switch (style) {
        case 'hands-on':
          if (eventText.includes('workshop') || eventText.includes('lab') ||
              eventText.includes('hands-on') || eventText.includes('practical') ||
              eventType.includes('workshop') || eventType.includes('hackathon')) {
            score += 0.3;
          }
          break;
        case 'theoretical':
          if (eventText.includes('lecture') || eventText.includes('presentation') ||
              eventText.includes('keynote') || eventType.includes('conference')) {
            score += 0.3;
          }
          break;
        case 'interactive':
          if (eventText.includes('panel') || eventText.includes('discussion') ||
              eventText.includes('q&a') || eventText.includes('interactive')) {
            score += 0.3;
          }
          break;
        case 'networking':
          if (eventText.includes('networking') || eventText.includes('meetup') ||
              eventType.includes('networking') || eventType.includes('meetup')) {
            score += 0.3;
          }
          break;
      }
    });

    return Math.min(score, 1.0);
  }

  private static calculateNetworkingValue(event: Event, _careerProfile: CareerProfile): NetworkingValue {
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    const eventType = event.category?.name?.toLowerCase() || '';
    
    // High-value networking events
    if (eventText.includes('summit') || eventText.includes('executive') ||
        eventType.includes('summit') || event.attendeeCount && event.attendeeCount > 1000) {
      return 'exceptional';
    }

    // Good networking opportunities
    if (eventText.includes('conference') || eventText.includes('networking') ||
        eventType.includes('conference') || eventType.includes('networking')) {
      return 'high';
    }

    // Some networking value
    if (eventText.includes('meetup') || eventType.includes('meetup') ||
        eventType.includes('workshop')) {
      return 'moderate';
    }

    // Limited networking (webinars, online events)
    if (eventText.includes('webinar') || eventText.includes('online') ||
        event.location?.toLowerCase().includes('virtual')) {
      return 'low';
    }

    return 'moderate';
  }

  private static calculateTimingRelevance(event: Event, timeframe: CareerTimeframe): TimingRelevance {
    const eventDate = new Date(event.startTime);
    const now = new Date();
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    switch (timeframe) {
      case 'immediate':
        if (daysUntilEvent <= 30) return 'perfect';
        if (daysUntilEvent <= 90) return 'good';
        return 'poor';
      case 'short-term':
        if (daysUntilEvent <= 90) return 'perfect';
        if (daysUntilEvent <= 180) return 'good';
        return 'okay';
      case 'medium-term':
        if (daysUntilEvent <= 365) return 'perfect';
        return 'good';
      case 'long-term':
        return 'good'; // All events are relevant for long-term goals
      default:
        return 'okay';
    }
  }

  private static generatePersonalizedReason(
    event: Event,
    userCategories: string[],
    userInterests: string[],
    locationRelevanceScore: number = 1.0,
    careerMatch?: CareerEventMatch
  ): string {
    // Career-based reasons (highest priority)
    if (careerMatch && careerMatch.reasons.length > 0 && careerMatch.relevanceScore > 0.7) {
      return careerMatch.reasons[0]; // Use the primary career reason
    }

    // Location-based reasons
    const isVirtual = event.location?.toLowerCase().includes('virtual') || 
                     event.location?.toLowerCase().includes('online') ||
                     event.livestreamUrl;
    
    if (isVirtual && locationRelevanceScore >= 1.0) {
      if (userCategories.includes(event.eventTypeId)) {
        return `Virtual ${event.category?.name || 'event'} - join from anywhere`;
      }
    }

    if (locationRelevanceScore >= 0.9) {
      if (userCategories.includes(event.eventTypeId)) {
        return `${event.category?.name || 'Event'} near you`;
      }
    }

    // Interest-based reasons
    if (userCategories.includes(event.eventTypeId)) {
      return `Based on your interest in ${event.category?.name || 'this category'}`;
    }

    const eventText = `${event.title} ${event.description || ''}`.toLowerCase();
    const matchingInterest = userInterests.find(interest => 
      eventText.includes(interest.toLowerCase())
    );

    if (matchingInterest) {
      if (isVirtual) {
        return `${matchingInterest} - attend virtually`;
      }
      return `Matches your interest in ${matchingInterest}`;
    }

    // Career fallback reasons
    if (careerMatch && careerMatch.reasons.length > 0) {
      return careerMatch.reasons[0];
    }

    // Location fallback reasons
    if (isVirtual) {
      return "Virtual event - no travel needed";
    }

    if (locationRelevanceScore < 0.5) {
      return "Worth the travel - highly rated event";
    }

    return "Recommended for you";
  }

  private static generateTrendingReason(event: Event, trendingScore: number): string {
    if (trendingScore > 0.8) return "Highly popular this week";
    if (trendingScore > 0.6) return "Growing interest";
    if (event.attendeeCount && event.attendeeCount > 500) return `${event.attendeeCount}+ registered`;
    return "Trending now";
  }
}
